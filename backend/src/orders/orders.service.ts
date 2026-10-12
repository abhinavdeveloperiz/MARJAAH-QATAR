import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';
import { CartService } from '../cart/cart.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly cartService: CartService,
  ) {}

  async createOrder(body: any, currentUser?: any) {
    const { items, address, delivery, guest, payment_method, notes } = body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // 1. Authoritative cart calculation from backend
    const validatedCart = await this.cartService.validateAndComputeCart(items);
    if (validatedCart.items.length === 0) {
      throw new BadRequestException('None of the items in the cart are valid');
    }

    // 2. Customer info (authenticated or guest)
    let userId = currentUser?.id || null;
    let customerName = '';
    let customerEmail = '';
    let customerPhone = '';

    if (currentUser) {
      customerName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || currentUser.username || '';
      customerEmail = currentUser.email || '';
      customerPhone = currentUser.phone || (delivery?.phone) || '';
    } else {
      customerName = guest?.name || delivery?.full_name || 'Guest Customer';
      customerEmail = guest?.email || '';
      customerPhone = guest?.phone || delivery?.phone || '';
    }

    // 3. Delivery address snapshot
    const deliveryAddress = {
      full_name: delivery?.full_name || customerName,
      phone: delivery?.phone || customerPhone,
      building: delivery?.building || '',
      street: delivery?.street || '',
      zone: delivery?.zone || '',
      city: delivery?.city || 'Doha',
      country: delivery?.country || 'Qatar',
    };

    // 4. Generate order sequence number
    const countSnap = await this.firestore.collection('orders').get();
    const orderIndex = countSnap.size + 1;
    const orderNumber = `MTQ-${String(orderIndex).padStart(5, '0')}`;
    const now = new Date().toISOString();

    const orderData = {
      order_number: orderNumber,
      user_id: userId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      delivery_address: deliveryAddress,
      items: validatedCart.items,
      subtotal: validatedCart.subtotal,
      shipping: validatedCart.shipping,
      total: validatedCart.total,
      item_count: validatedCart.count,
      payment_method: payment_method || 'cash',
      payment_status: payment_method === 'cash' ? 'cod' : 'pending',
      status: 'placed',
      notes: notes || '',
      created_at: now,
      updated_at: now,
    };

    // 5. Save order in Firestore
    const orderRef = await this.firestore.collection('orders').add(orderData);

    // 6. Deduct stock counts in Firestore products
    for (const item of validatedCart.items) {
      try {
        const prodRef = this.firestore.doc('products', item.id);
        const prodDoc = await prodRef.get();
        if (prodDoc.exists) {
          const currentStock = prodDoc.data()?.stock_count;
          if (currentStock !== undefined && currentStock !== null) {
            const newStock = Math.max(0, currentStock - item.quantity);
            await prodRef.update({
              stock_count: newStock,
              in_stock: newStock > 0,
            });
          }
        }
      } catch (e) {
        // Continue even if stock deduction warning occurs
      }
    }

    return {
      success: true,
      id: orderRef.id,
      order_number: orderNumber,
      order: {
        id: orderRef.id,
        ...orderData,
      },
    };
  }

  async findAll(query: { status?: string; page?: number; limit?: number }, currentUser?: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

    let queryRef: any = this.firestore.collection('orders');

    const isAdmin = currentUser?.is_staff || currentUser?.role === 'admin';
    if (!isAdmin && currentUser) {
      queryRef = queryRef.where('user_id', '==', currentUser.id);
    }

    const snap = await queryRef.get();
    let orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    if (query.status && query.status !== 'all') {
      orders = orders.filter(o => o.status === query.status);
    }

    // Sort descending by created_at
    orders.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const total = orders.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    return {
      items: orders.slice(offset, offset + limit),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(idOrNumber: string, currentUser?: any) {
    let order: any = null;

    // By ID
    const doc = await this.firestore.doc('orders', idOrNumber).get();
    if (doc.exists) {
      order = { id: doc.id, ...doc.data() };
    } else {
      // By order_number
      const snap = await this.firestore.collection('orders')
        .where('order_number', '==', idOrNumber)
        .limit(1)
        .get();

      if (!snap.empty) {
        order = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    }

    if (!order) {
      throw new NotFoundException(`Order not found: ${idOrNumber}`);
    }

    // Authorization check
    const isAdmin = currentUser?.is_staff || currentUser?.role === 'admin';
    if (!isAdmin && currentUser && order.user_id && order.user_id !== currentUser.id) {
      throw new ForbiddenException('Access denied to this order');
    }

    return order;
  }

  async updateStatus(id: string, status: string) {
    const validStatuses = ['pending', 'placed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    const docRef = this.firestore.doc('orders', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Order not found: ${id}`);
    }

    await docRef.update({
      status,
      updated_at: new Date().toISOString(),
    });

    return {
      success: true,
      id,
      status,
    };
  }

  async cancelOrder(id: string, currentUser?: any) {
    const docRef = this.firestore.doc('orders', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Order not found: ${id}`);
    }

    const order = doc.data();
    const isAdmin = currentUser?.is_staff || currentUser?.role === 'admin';
    if (!isAdmin && currentUser && order?.user_id !== currentUser.id) {
      throw new ForbiddenException('You cannot cancel another user\'s order');
    }

    if (order?.status !== 'pending' && order?.status !== 'placed' && order?.status !== 'processing') {
      throw new BadRequestException(`Order cannot be cancelled because it is already ${order?.status}`);
    }

    await docRef.update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    });

    // Restock products
    if (Array.isArray(order?.items)) {
      for (const item of order.items) {
        try {
          if (item.id) {
            const prodRef = this.firestore.doc('products', item.id);
            const prodDoc = await prodRef.get();
            if (prodDoc.exists) {
              const currentStock = prodDoc.data()?.stock_count || 0;
              await prodRef.update({
                stock_count: currentStock + (item.quantity || 1),
                in_stock: true,
              });
            }
          }
        } catch (e) {}
      }
    }

    return {
      success: true,
      message: 'Order cancelled successfully and inventory restored',
      id,
    };
  }
}
