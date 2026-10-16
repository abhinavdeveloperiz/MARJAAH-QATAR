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
    let userId = currentUser?.id || currentUser?.sub || body.user_id || body.userId || null;
    let customerName = body.full_name || body.customer_name || delivery?.full_name || '';
    if (!customerName && currentUser) {
      customerName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || currentUser.username || 'Customer';
    } else if (!customerName) {
      customerName = guest?.name || 'Customer';
    }

    let customerEmail = (body.email || body.customer_email || delivery?.email || currentUser?.email || guest?.email || '').toLowerCase().trim();
    let customerPhone = (body.phone || body.customer_phone || delivery?.phone || currentUser?.phone || guest?.phone || '').trim();

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
      user_id: userId ? String(userId) : null,
      userId: userId ? String(userId) : null,
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

    const snap = await this.firestore.collection('orders').get();
    const allOrders = snap.docs.map(doc => {
      const d = doc.data() || {};
      const createdAtRaw = d.created_at || d.createdAt;
      let createdAtIso = new Date().toISOString();
      if (createdAtRaw) {
        if (typeof createdAtRaw === 'string') {
          createdAtIso = createdAtRaw;
        } else if (createdAtRaw._seconds) {
          createdAtIso = new Date(createdAtRaw._seconds * 1000).toISOString();
        } else if (typeof createdAtRaw.toDate === 'function') {
          createdAtIso = createdAtRaw.toDate().toISOString();
        }
      }

      const orderNumber = d.order_number || (doc.id.startsWith('MTQ-') ? doc.id : (doc.id.startsWith('order-') ? doc.id.toUpperCase() : `MTQ-${String(doc.id).padStart(5, '0')}`));

      return {
        id: doc.id,
        ...d,
        order_number: orderNumber,
        created_at: createdAtIso,
        total: Number(d.total || d.subtotal || 0),
      } as any;
    });

    const isAdmin = currentUser?.is_staff || currentUser?.role === 'admin';
    let orders: any[] = [];

    if (isAdmin) {
      orders = allOrders;
    } else if (currentUser) {
      const uId = String(currentUser.id || currentUser.sub || '').trim();
      const uEmail = (currentUser.email || '').toLowerCase().trim();
      const uPhone = (currentUser.phone || '').replace(/\D/g, '');

      orders = allOrders.filter(o => {
        const oUserId = String(o.user_id !== undefined && o.user_id !== null ? o.user_id : (o.userId !== undefined && o.userId !== null ? o.userId : '')).trim();
        const oEmail = (o.customer_email || o.email || '').toLowerCase().trim();
        const oPhone = String(o.customer_phone || o.phone || '').replace(/\D/g, '');

        if (uId && oUserId && (oUserId === uId || oUserId === String(currentUser.id))) {
          return true;
        }
        if (uEmail && oEmail && oEmail === uEmail) {
          return true;
        }
        if (uPhone && uPhone.length >= 7 && oPhone && (oPhone.includes(uPhone) || uPhone.includes(oPhone))) {
          return true;
        }
        return false;
      });
    } else {
      orders = [];
    }

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

  async findOne(idOrNumber: string, currentUser?: any, phone?: string) {
    let order: any = null;
    const raw = (idOrNumber || '').trim();
    const clean = raw.replace(/^#+/, '').trim();
    const cleanUpper = clean.toUpperCase();

    // 1. By direct document ID
    if (raw) {
      const doc = await this.firestore.doc('orders', raw).get();
      if (doc.exists) {
        order = { id: doc.id, ...doc.data() };
      } else if (clean && clean !== raw) {
        const docClean = await this.firestore.doc('orders', clean).get();
        if (docClean.exists) {
          order = { id: docClean.id, ...docClean.data() };
        }
      }
    }

    // 2. By order_number (uppercase or cleaned)
    if (!order && cleanUpper) {
      const snap = await this.firestore.collection('orders')
        .where('order_number', '==', cleanUpper)
        .limit(1)
        .get();

      if (!snap.empty) {
        order = { id: snap.docs[0].id, ...snap.docs[0].data() };
      } else if (clean !== cleanUpper) {
        const snapRaw = await this.firestore.collection('orders')
          .where('order_number', '==', clean)
          .limit(1)
          .get();
        if (!snapRaw.empty) {
          order = { id: snapRaw.docs[0].id, ...snapRaw.docs[0].data() };
        }
      }
    }

    // 2b. If search starts with MTQ-, try matching doc ID with number
    if (!order && cleanUpper.startsWith('MTQ-')) {
      const numPart = cleanUpper.replace(/^MTQ-0*/i, '');
      if (numPart) {
        const docNum = await this.firestore.doc('orders', numPart).get();
        if (docNum.exists) {
          order = { id: docNum.id, ...docNum.data() };
        }
      }
    }

    // 3. Fallback: Search by phone number if input is purely phone or phone query is supplied
    if (!order) {
      const phoneCandidates = [phone, raw, clean].filter(p => {
        if (!p) return false;
        const digits = p.replace(/[^0-9]/g, '');
        return digits.length >= 7;
      });

      if (phoneCandidates.length > 0) {
        const targetDigits = (phoneCandidates[0] as string).replace(/[^0-9]/g, '');
        const snap = await this.firestore.collection('orders')
          .limit(50)
          .get();

        for (const docItem of snap.docs) {
          const d = docItem.data();
          const ordPhone = (d.customer_phone || d.delivery_address?.phone || '').replace(/[^0-9]/g, '');
          if (ordPhone && (ordPhone === targetDigits || ordPhone.endsWith(targetDigits) || targetDigits.endsWith(ordPhone))) {
            order = { id: docItem.id, ...d };
            break;
          }
        }
      }
    }

    if (!order) {
      throw new NotFoundException(`Order not found: ${idOrNumber}`);
    }

    if (!order.order_number) {
      order.order_number = order.id.startsWith('MTQ-') ? order.id : (order.id.startsWith('order-') ? order.id.toUpperCase() : `MTQ-${String(order.id).padStart(5, '0')}`);
    }
    if (!order.created_at && order.createdAt) {
      if (order.createdAt._seconds) {
        order.created_at = new Date(order.createdAt._seconds * 1000).toISOString();
      } else if (typeof order.createdAt === 'string') {
        order.created_at = order.createdAt;
      }
    }

    // Authorization check
    const isAdmin = currentUser?.is_staff || currentUser?.role === 'admin';
    if (!isAdmin && currentUser) {
      const ordUserId = String(order.user_id || order.userId || '').trim();
      const ordEmail = (order.customer_email || order.email || '').toLowerCase().trim();
      const curUserId = String(currentUser.id || currentUser.sub || '').trim();
      const curEmail = (currentUser.email || '').toLowerCase().trim();

      if (ordUserId && curUserId && ordUserId !== curUserId && ordEmail !== curEmail) {
        throw new ForbiddenException('Access denied to this order');
      }
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
