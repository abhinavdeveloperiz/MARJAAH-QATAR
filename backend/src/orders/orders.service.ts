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

    const validatedCart = await this.cartService.validateAndComputeCart(items);
    if (validatedCart.items.length === 0) {
      throw new BadRequestException('None of the items in the cart are valid');
    }

    const outOfStockItem = validatedCart.items.find(item => item.in_stock === false);
    if (outOfStockItem) {
      throw new BadRequestException(`Product "${outOfStockItem.name}" is currently out of stock`);
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

    // 3. Fulfillment Method: Doorstep Delivery vs Store Pickup (Requirement 1)
    const isStorePickup = body.fulfillment_type === 'store_pickup' || body.delivery_method === 'pickup' || body.payment_method === 'pay_at_store';
    let pickupDetails: any = null;

    if (isStorePickup) {
      const locId = body.pickup_location_id || body.pickup_location?.id || body.pickup_location?.location_id;
      if (locId) {
        const locDoc = await this.firestore.doc('store_locations', String(locId)).get();
        if (locDoc.exists) {
          const locData = locDoc.data() || {};
          pickupDetails = {
            location_id: locDoc.id,
            name: locData.name,
            address: locData.address,
            zone: locData.zone || 'Doha',
            city: locData.city || 'Doha',
            phone: locData.phone,
            opening_hours: locData.opening_hours,
            pickup_instructions: locData.pickup_instructions,
          };
        }
      }

      // If no valid location found by ID, check if location payload is passed or pick default store
      if (!pickupDetails) {
        if (body.pickup_location && body.pickup_location.name) {
          pickupDetails = body.pickup_location;
        } else {
          // Fetch default active location
          const defSnap = await this.firestore.collection('store_locations')
            .where('is_active', '==', true)
            .limit(1)
            .get();
          if (!defSnap.empty) {
            const locData = defSnap.docs[0].data();
            pickupDetails = {
              location_id: defSnap.docs[0].id,
              name: locData.name,
              address: locData.address,
              zone: locData.zone,
              city: locData.city,
              phone: locData.phone,
              opening_hours: locData.opening_hours,
              pickup_instructions: locData.pickup_instructions,
            };
          } else {
            throw new BadRequestException('Please select a valid store pickup location to proceed.');
          }
        }
      }
    }

    // Delivery address snapshot
    const deliveryAddress = isStorePickup
      ? {
          full_name: customerName,
          phone: customerPhone,
          building: pickupDetails?.name || 'Store Pickup Desk',
          street: pickupDetails?.address || 'Marjaah Store',
          zone: pickupDetails?.zone || 'Al Sadd',
          city: pickupDetails?.city || 'Doha',
          country: 'Qatar',
        }
      : {
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
      fulfillment_type: isStorePickup ? 'store_pickup' : 'delivery',
      delivery_method: isStorePickup ? 'pickup' : 'doorstep',
      pickup_location: pickupDetails,
      items: validatedCart.items,
      subtotal: validatedCart.subtotal,
      shipping: 0, // Store Pickup and Free Doorstep Delivery across Qatar
      total: validatedCart.total,
      item_count: validatedCart.count,
      payment_method: payment_method || (isStorePickup ? 'pay_at_store' : 'cash'),
      payment_status: (payment_method === 'cash' || payment_method === 'pay_at_store') ? 'cod' : 'pending',
      status: 'placed',
      notes: notes || '',
      timeline: [
        {
          status: 'placed',
          title: isStorePickup ? 'Order Placed (Store Pickup)' : 'Order Placed (Doorstep Delivery)',
          note: isStorePickup
            ? `Store Pickup selected at ${pickupDetails?.name || 'Marjaah Store'}`
            : 'Order received and waiting for processing.',
          timestamp: now,
        },
      ],
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

  // ═════════════════════════════════════════════════════════════════════════
  // DYNAMIC ORDER POLICIES (CANCELLATION & RETURN WINDOWS)
  // ═════════════════════════════════════════════════════════════════════════
  async getOrderPolicySettings() {
    try {
      const doc = await this.firestore.collection('settings').doc('order_policies').get();
      if (doc.exists) {
        return {
          cancellation_window_value: 24,
          cancellation_window_unit: 'hours',
          cancellation_allowed_statuses: ['placed', 'pending'],
          return_window_days: 14,
          return_allowed_statuses: ['delivered'],
          cancellation_reasons: [
            'Ordered by mistake',
            'Found better price elsewhere',
            'Delivery time is too long',
            'Need to change shipping details',
            'Change of mind / Other',
          ],
          return_reasons: [
            'Defective or damaged product',
            'Wrong product delivered',
            'Product does not match description',
            'Missing accessories/parts',
            'Changed mind / Not needed',
            'Other',
          ],
          ...doc.data(),
        };
      }
    } catch (e) {}

    return {
      cancellation_window_value: 24,
      cancellation_window_unit: 'hours',
      cancellation_allowed_statuses: ['placed', 'pending'],
      return_window_days: 14,
      return_allowed_statuses: ['delivered'],
      cancellation_reasons: [
        'Ordered by mistake',
        'Found better price elsewhere',
        'Delivery time is too long',
        'Need to change shipping details',
        'Change of mind / Other',
      ],
      return_reasons: [
        'Defective or damaged product',
        'Wrong product delivered',
        'Product does not match description',
        'Missing accessories/parts',
        'Changed mind / Not needed',
        'Other',
      ],
    };
  }

  async updateOrderPolicySettings(dto: any, currentUser?: any) {
    const docRef = this.firestore.collection('settings').doc('order_policies');
    const cleanData = {
      cancellation_window_value: Math.max(1, Number(dto.cancellation_window_value) || 24),
      cancellation_window_unit: ['hours', 'days', 'weeks'].includes(dto.cancellation_window_unit) ? dto.cancellation_window_unit : 'hours',
      cancellation_allowed_statuses: Array.isArray(dto.cancellation_allowed_statuses) && dto.cancellation_allowed_statuses.length > 0 ? dto.cancellation_allowed_statuses : ['placed', 'pending'],
      return_window_days: Math.max(1, Number(dto.return_window_days) || 14),
      return_allowed_statuses: Array.isArray(dto.return_allowed_statuses) && dto.return_allowed_statuses.length > 0 ? dto.return_allowed_statuses : ['delivered'],
      updated_at: new Date().toISOString(),
      updated_by: currentUser?.username || currentUser?.email || 'admin',
    };

    await docRef.set(cleanData, { merge: true });
    return cleanData;
  }

  async cancelOrder(id: string, currentUser?: any, reason?: string, notes?: string) {
    let docRef = this.firestore.doc('orders', id);
    let doc = await docRef.get();
    if (!doc.exists) {
      const q = await this.firestore.collection('orders').where('order_number', '==', id).limit(1).get();
      if (!q.empty) {
        doc = q.docs[0];
        docRef = doc.ref;
      } else {
        throw new NotFoundException(`Order not found: ${id}`);
      }
    }

    const order = doc.data() || {};
    const isAdmin = currentUser?.is_staff || currentUser?.role === 'admin' || currentUser?.is_superuser;
    if (!isAdmin && currentUser) {
      const ordUid = String(order.user_id || order.userId || '').trim();
      const ordEmail = (order.customer_email || order.email || '').toLowerCase().trim();
      const curUid = String(currentUser.id || currentUser.sub || '').trim();
      const curEmail = (currentUser.email || '').toLowerCase().trim();
      if (ordUid && curUid && ordUid !== curUid && ordEmail !== curEmail) {
        throw new ForbiddenException('You cannot cancel another user\'s order');
      }
    }

    if (order.status === 'cancelled') {
      throw new BadRequestException('Order is already cancelled');
    }

    // Dynamic Policy Checks for regular customers
    if (!isAdmin) {
      const policy = await this.getOrderPolicySettings();
      const allowedStatuses = (policy.cancellation_allowed_statuses || ['placed', 'pending']).map((s: string) => s.toLowerCase());
      const currentStatus = (order.status || 'placed').toLowerCase();

      if (!allowedStatuses.includes(currentStatus)) {
        throw new BadRequestException(
          `Order cannot be cancelled because it is already "${order.status.toUpperCase()}". Once an order is being shipped or delivered, cancellation is no longer permitted.`
        );
      }

      // Check time window
      const createdAtMs = new Date(order.created_at || order.createdAt || Date.now()).getTime();
      let windowMs = (policy.cancellation_window_value || 24) * 60 * 60 * 1000;
      if (policy.cancellation_window_unit === 'days') {
        windowMs = (policy.cancellation_window_value || 1) * 24 * 60 * 60 * 1000;
      } else if (policy.cancellation_window_unit === 'weeks') {
        windowMs = (policy.cancellation_window_value || 1) * 7 * 24 * 60 * 60 * 1000;
      }

      if (Date.now() - createdAtMs > windowMs) {
        throw new BadRequestException(
          `The cancellation window (${policy.cancellation_window_value} ${policy.cancellation_window_unit}) has elapsed. This order can no longer be self-cancelled.`
        );
      }
    }

    const nowIso = new Date().toISOString();
    const timeline = Array.isArray(order.timeline) ? [...order.timeline] : [];
    const reasonText = reason ? `${reason}${notes ? ` (${notes})` : ''}` : 'Customer requested cancellation';

    timeline.push({
      status: 'cancelled',
      title: 'Order Cancelled',
      note: reasonText,
      timestamp: nowIso,
    });

    await docRef.update({
      status: 'cancelled',
      cancellation: {
        cancelled_at: nowIso,
        cancelled_by: isAdmin ? 'admin' : 'customer',
        reason: reason || 'Customer requested cancellation',
        notes: notes || '',
      },
      cancellation_reason: reason || 'Customer requested cancellation',
      cancellation_notes: notes || '',
      timeline,
      updated_at: nowIso,
    });

    // Restock products
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        try {
          const pid = item.id || item.product_id;
          if (pid) {
            const prodRef = this.firestore.doc('products', pid);
            const prodDoc = await prodRef.get();
            if (prodDoc.exists) {
              const currentStock = Number(prodDoc.data()?.stock_count) || 0;
              await prodRef.update({
                stock_count: currentStock + (Number(item.quantity) || 1),
                in_stock: true,
                updated_at: nowIso,
              });
            }
          }
        } catch (e) {}
      }
    }

    return {
      success: true,
      message: 'Order cancelled successfully and inventory restored',
      id: doc.id,
      order_number: order.order_number || doc.id,
    };
  }

  async requestReturn(id: string, currentUser?: any, body?: any) {
    let docRef = this.firestore.doc('orders', id);
    let doc = await docRef.get();
    if (!doc.exists) {
      const q = await this.firestore.collection('orders').where('order_number', '==', id).limit(1).get();
      if (!q.empty) {
        doc = q.docs[0];
        docRef = doc.ref;
      } else {
        throw new NotFoundException(`Order not found: ${id}`);
      }
    }

    const order = doc.data() || {};
    const isAdmin = currentUser?.is_staff || currentUser?.role === 'admin' || currentUser?.is_superuser;
    if (!isAdmin && currentUser) {
      const ordUid = String(order.user_id || order.userId || '').trim();
      const ordEmail = (order.customer_email || order.email || '').toLowerCase().trim();
      const curUid = String(currentUser.id || currentUser.sub || '').trim();
      const curEmail = (currentUser.email || '').toLowerCase().trim();
      if (ordUid && curUid && ordUid !== curUid && ordEmail !== curEmail) {
        throw new ForbiddenException('You cannot request a return for another user\'s order');
      }
    }

    if (order.status === 'cancelled') {
      throw new BadRequestException('Cancelled orders cannot be returned.');
    }

    if (order.return_request && order.return_request.status === 'pending') {
      throw new BadRequestException('A return request is already pending review for this order.');
    }

    if (order.return_request && order.return_request.status === 'approved') {
      throw new BadRequestException('This order has already been returned and approved.');
    }

    // Dynamic Policy Checks
    if (!isAdmin) {
      const policy = await this.getOrderPolicySettings();
      const allowedStatuses = (policy.return_allowed_statuses || ['delivered']).map((s: string) => s.toLowerCase());
      const currentStatus = (order.status || 'placed').toLowerCase();

      if (!allowedStatuses.includes(currentStatus)) {
        throw new BadRequestException(
          `Returns can only be requested after the order has been delivered. Current order status: "${order.status.toUpperCase()}".`
        );
      }

      // Check return window
      const deliveredEvent = Array.isArray(order.timeline) ? order.timeline.find((t: any) => t.status === 'delivered') : null;
      const refTime = new Date(deliveredEvent?.timestamp || order.updated_at || order.created_at || Date.now()).getTime();
      const windowMs = (policy.return_window_days || 14) * 24 * 60 * 60 * 1000;

      if (Date.now() - refTime > windowMs) {
        throw new BadRequestException(
          `The return window of ${policy.return_window_days} days from delivery has expired. This order is no longer eligible for return.`
        );
      }
    }

    const nowIso = new Date().toISOString();
    const requestId = `RMA-${order.order_number || doc.id}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const reason = body?.reason || 'Product Return Request';
    const notes = body?.notes || '';

    const returnRequest = {
      request_id: requestId,
      requested_at: nowIso,
      reason,
      notes,
      status: 'pending',
      items: Array.isArray(body?.items) && body.items.length > 0 ? body.items : order.items || [],
      customer_name: order.customer_name || currentUser?.username || 'Customer',
      customer_phone: order.customer_phone || currentUser?.phone || '',
    };

    const timeline = Array.isArray(order.timeline) ? [...order.timeline] : [];
    timeline.push({
      status: 'return_requested',
      title: 'Return Requested (RMA)',
      note: `${requestId}: ${reason}${notes ? ` (${notes})` : ''}`,
      timestamp: nowIso,
    });

    await docRef.update({
      return_status: 'requested',
      return_request: returnRequest,
      timeline,
      updated_at: nowIso,
    });

    return {
      success: true,
      message: 'Return request submitted successfully. Our team will review your request.',
      request_id: requestId,
      order_id: doc.id,
      order_number: order.order_number || doc.id,
    };
  }

  async reviewReturnRequest(
    id: string,
    currentUser: any,
    body: {
      status: 'approved' | 'rejected' | 'declined';
      notes?: string;
      admin_notes?: string;
      restock?: boolean;
      restock_items?: boolean;
    },
  ) {
    let docRef = this.firestore.doc('orders', id);
    let doc = await docRef.get();
    if (!doc.exists) {
      const q = await this.firestore.collection('orders').where('order_number', '==', id).limit(1).get();
      if (!q.empty) {
        doc = q.docs[0];
        docRef = doc.ref;
      } else {
        throw new NotFoundException(`Order not found: ${id}`);
      }
    }

    const order = doc.data() || {};
    if (!order.return_request) {
      throw new BadRequestException('No return request found for this order.');
    }

    const nowIso = new Date().toISOString();
    const timeline = Array.isArray(order.timeline) ? [...order.timeline] : [];

    if (body.status === 'approved') {
      const updatedReturnRequest = {
        ...order.return_request,
        status: 'approved',
        approved_at: nowIso,
        admin_notes: body.notes || 'Return approved by administration',
        reviewed_by: currentUser?.username || currentUser?.email || 'admin',
      };

      timeline.push({
        status: 'return_approved',
        title: 'Return Request Approved (RMA)',
        note: body.notes || 'Return request approved. Goods returned & inventory restored.',
        timestamp: nowIso,
      });

      await docRef.update({
        status: 'returned',
        return_status: 'approved',
        return_request: updatedReturnRequest,
        timeline,
        updated_at: nowIso,
      });

      // Restock items if requested (default true)
      if (body.restock !== false && body.restock_items !== false && Array.isArray(order.items)) {
        for (const item of order.items) {
          try {
            const pid = item.id || item.product_id;
            if (pid) {
              const prodRef = this.firestore.doc('products', pid);
              const prodDoc = await prodRef.get();
              if (prodDoc.exists) {
                const cur = Number(prodDoc.data()?.stock_count) || 0;
                await prodRef.update({
                  stock_count: cur + (Number(item.quantity) || 1),
                  in_stock: true,
                  updated_at: nowIso,
                });
              }
            }
          } catch (e) {}
        }
      }

      return {
        success: true,
        message: `Return request for Order #${order.order_number || doc.id} has been approved.`,
        order_id: doc.id,
        status: 'approved',
      };
    } else if (body.status === 'rejected' || body.status === 'declined') {
      const updatedReturnRequest = {
        ...order.return_request,
        status: 'declined',
        declined_at: nowIso,
        rejection_reason: body.notes || body.admin_notes || 'Conditions for return not met.',
        admin_notes: body.notes || body.admin_notes || 'Conditions for return not met.',
        reviewed_by: currentUser?.username || currentUser?.email || 'admin',
      };

      timeline.push({
        status: 'return_declined',
        title: 'Return Request Declined',
        note: body.notes || body.admin_notes || 'Return request declined after review.',
        timestamp: nowIso,
      });

      await docRef.update({
        return_status: 'declined',
        return_request: updatedReturnRequest,
        timeline,
        updated_at: nowIso,
      });

      return {
        success: true,
        message: `Return request for Order #${order.order_number || doc.id} has been declined.`,
        order_id: doc.id,
        status: 'declined',
      };
    } else {
      throw new BadRequestException('Status must be either "approved" or "declined"');
    }
  }

  async getReturnsAndCancellations(query?: any) {
    const snap = await this.firestore.collection('orders').get();
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    const records = all
      .filter((o) => o.status === 'cancelled' || o.return_request || o.return_status)
      .map((o) => {
        const isCancellation = o.status === 'cancelled';
        const rr = o.return_request || {};
        return {
          order_id: o.id,
          order_number: o.order_number || o.id,
          customer_name: o.customer_name || o.full_name || 'Customer',
          customer_phone: o.customer_phone || o.phone || '',
          customer_email: o.customer_email || o.email || '',
          total: Number(o.total || 0),
          order_status: o.status,
          type: isCancellation ? 'cancellation' : 'return',
          request_id: rr.request_id || (isCancellation ? `CAN-${o.order_number || o.id}` : null),
          reason: isCancellation ? (o.cancellation?.reason || 'Cancelled by customer') : (rr.reason || 'Return request'),
          notes: isCancellation ? (o.cancellation?.notes || '') : (rr.notes || ''),
          requested_at: isCancellation ? (o.cancellation?.cancelled_at || o.updated_at || o.created_at) : (rr.requested_at || o.updated_at),
          return_status: isCancellation ? 'cancelled' : (rr.status || 'pending'),
          return_request: o.return_request || null,
          items: o.items || [],
          created_at: o.created_at,
        };
      });

    // Sort newest first
    records.sort((a, b) => new Date(b.requested_at || b.created_at).getTime() - new Date(a.requested_at || a.created_at).getTime());

    const stats = {
      total_cancellations: records.filter((r) => r.type === 'cancellation').length,
      total_returns: records.filter((r) => r.type === 'return').length,
      pending_returns: records.filter((r) => r.type === 'return' && r.return_status === 'pending').length,
      approved_returns: records.filter((r) => r.type === 'return' && r.return_status === 'approved').length,
      rejected_returns: records.filter((r) => r.type === 'return' && r.return_status === 'rejected').length,
    };

    return {
      items: records,
      stats,
    };
  }

  async getCustomerNotifications(currentUser: any) {
    if (!currentUser) return { notifications: [], total: 0 };

    const uId = String(currentUser.id || currentUser.sub || '').trim();
    const uEmail = (currentUser.email || '').toLowerCase().trim();
    const uPhone = (currentUser.phone || '').replace(/\D/g, '');

    const snap = await this.firestore.collection('orders').get();
    const userOrders = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as any))
      .filter((o) => {
        const oUid = String(o.user_id || o.userId || '').trim();
        const oEmail = (o.customer_email || o.email || '').toLowerCase().trim();
        const oPhone = (o.customer_phone || o.phone || '').replace(/\D/g, '');
        return (uId && oUid === uId) || (uEmail && oEmail === uEmail) || (uPhone && oPhone && oPhone.slice(-8) === uPhone.slice(-8));
      });

    const notifications: any[] = [];

    for (const o of userOrders) {
      const orderNum = o.order_number || o.id;

      // Timeline events
      if (Array.isArray(o.timeline) && o.timeline.length > 0) {
        for (const t of o.timeline) {
          notifications.push({
            id: `notif-${o.id}-${t.status}-${new Date(t.timestamp || Date.now()).getTime()}`,
            order_id: o.id,
            order_number: orderNum,
            type: t.status,
            title: t.title || `Order #${orderNum} Update`,
            message: t.note || `Order #${orderNum} status is now ${String(t.status).toUpperCase()}`,
            timestamp: t.timestamp || o.created_at,
          });
        }
      } else {
        notifications.push({
          id: `notif-${o.id}-${o.status}`,
          order_id: o.id,
          order_number: orderNum,
          type: o.status || 'placed',
          title: `Order #${orderNum}`,
          message: `Your order #${orderNum} is currently ${String(o.status || 'placed').toUpperCase()}`,
          timestamp: o.updated_at || o.created_at,
        });
      }

      // Return requests
      if (o.return_request) {
        const rr = o.return_request;
        notifications.push({
          id: `notif-${o.id}-return-${rr.status}-${new Date(rr.updated_at || rr.requested_at || Date.now()).getTime()}`,
          order_id: o.id,
          order_number: orderNum,
          type: `return_${rr.status}`,
          title: rr.status === 'approved' ? `Return Approved #${orderNum}` : (rr.status === 'rejected' ? `Return Declined #${orderNum}` : `Return Requested #${orderNum}`),
          message: rr.status === 'approved'
            ? `Your return request (${rr.request_id}) for #${orderNum} has been APPROVED.`
            : (rr.status === 'rejected'
              ? `Your return request (${rr.request_id}) for #${orderNum} was declined: ${rr.rejection_reason || 'Conditions not met.'}`
              : `Your return request (${rr.request_id}) for #${orderNum} has been received and is pending review.`),
          timestamp: rr.approved_at || rr.rejected_at || rr.requested_at,
        });
      }
    }

    // Sort newest first
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      notifications: notifications.slice(0, 30),
      total: notifications.length,
    };
  }

  async deleteOrder(id: string, currentUser?: any, restock = true) {
    const isAdmin = currentUser?.is_staff || currentUser?.role === 'admin' || currentUser?.is_superuser;
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required to delete orders');
    }

    let docRef = this.firestore.doc('orders', id);
    let doc = await docRef.get();
    if (!doc.exists) {
      const q = await this.firestore.collection('orders').where('order_number', '==', id).limit(1).get();
      if (!q.empty) {
        doc = q.docs[0];
        docRef = doc.ref;
      } else {
        throw new NotFoundException(`Order not found: ${id}`);
      }
    }

    const order = doc.data() || {};
    const orderNumber = order.order_number || doc.id;

    // Restock products if requested and order wasn't cancelled
    if (restock && order.status !== 'cancelled' && Array.isArray(order.items)) {
      for (const item of order.items) {
        try {
          const pid = item.id || item.product_id;
          if (pid) {
            const prodRef = this.firestore.doc('products', pid);
            const prodDoc = await prodRef.get();
            if (prodDoc.exists) {
              const currentStock = Number(prodDoc.data()?.stock_count) || 0;
              const qty = Number(item.quantity) || 1;
              await prodRef.update({
                stock_count: currentStock + qty,
                in_stock: true,
                updated_at: new Date().toISOString(),
              });
            }
          }
        } catch (e) {}
      }
    }

    await docRef.delete();

    return {
      success: true,
      message: `Order #${orderNumber} deleted successfully`,
      id: doc.id,
      order_number: orderNumber,
    };
  }
}
