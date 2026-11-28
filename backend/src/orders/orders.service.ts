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
    const isStorePickup = body.fulfillment_type === 'store_pickup' || body.delivery_method === 'pickup';
    let pickupDetails: any = null;

    if (isStorePickup) {
      const passedLoc = body.pickup_location || body.store_pickup_location;
      const locId =
        body.pickup_location_id ||
        body.store_pickup_location_id ||
        passedLoc?.id ||
        passedLoc?.location_id;
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
            opening_hours: locData.opening_hours || locData.working_hours || '',
            pickup_instructions: locData.pickup_instructions || locData.instructions || '',
          };
        }
      }

      // If no valid location found by ID, check if location payload is passed or pick default store
      if (!pickupDetails) {
        if (passedLoc && passedLoc.name) {
          pickupDetails = {
            ...passedLoc,
            location_id: passedLoc.location_id || passedLoc.id || null,
            opening_hours: passedLoc.opening_hours || passedLoc.working_hours || '',
            pickup_instructions: passedLoc.pickup_instructions || passedLoc.instructions || '',
          };
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
              opening_hours: locData.opening_hours || locData.working_hours || '',
              pickup_instructions: locData.pickup_instructions || locData.instructions || '',
            };
          } else {
            throw new BadRequestException('Please select a valid store pickup location to proceed.');
          }
        }
      }
    }

    // Delivery address snapshot (supports both nested `delivery.*` / `address.*` and top-level checkout fields)
    const addrSrc = delivery || address || {};
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
          full_name: addrSrc.full_name || customerName,
          phone: addrSrc.phone || customerPhone,
          building: addrSrc.building || body.building || '',
          street: addrSrc.street || body.street || '',
          zone: addrSrc.zone || body.zone || '',
          city: addrSrc.city || body.city || 'Doha',
          country: addrSrc.country || body.country || 'Qatar',
        };

    // 4. Generate order sequence number
    const orderNumber = await this.firestore.nextOrderNumber();
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
      // Only two payment methods exist: Cash on Delivery (doorstep) and Pay at Store (pickup). No online payment.
      payment_method: isStorePickup ? 'pay_at_store' : 'cash',
      payment_status: 'cod',
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
        await this.firestore.decrementStock(item.id, item.quantity);
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
      if (!currentUser?.is_superuser && currentUser?.role !== 'admin' && currentUser?.username !== 'admin') {
        const assignedRoleIds: string[] = Array.isArray(currentUser?.role_ids)
          ? currentUser.role_ids
          : (Array.isArray(currentUser?.roles) ? currentUser.roles : (currentUser?.role ? [currentUser.role] : []));

        let hasOrderPerm = assignedRoleIds.includes('super_admin') || assignedRoleIds.includes('admin');
        if (!hasOrderPerm) {
          for (const rid of assignedRoleIds) {
            const rDoc = await this.firestore.collection('admin_roles').doc(rid).get();
            if (rDoc.exists) {
              const perms = rDoc.data()?.permissions?.orders;
              if (Array.isArray(perms) && (perms.includes('view') || perms.includes('manage') || perms.includes('*'))) {
                hasOrderPerm = true;
                break;
              } else if (typeof perms === 'object' && perms !== null && (perms.view || perms.manage || perms['*'])) {
                hasOrderPerm = true;
                break;
              }
            }
          }
        }
        if (!hasOrderPerm) {
          throw new ForbiddenException('Access denied: You do not have permission to view the orders module.');
        }
      }
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

    // Authorization: staff, the owning customer, or a guest who proves the order phone number.
    // Anything else gets the same "not found" as a missing order to prevent enumeration.
    const isAdmin = Boolean(currentUser?.is_staff || currentUser?.is_superuser || currentUser?.role === 'admin');
    if (!isAdmin) {
      const digits = (v: any) => String(v || '').replace(/[^0-9]/g, '');
      const ordUserId = String(order.user_id || order.userId || '').trim();
      const ordEmail = String(order.customer_email || order.email || '').toLowerCase().trim();
      const ordPhoneDigits = digits(order.customer_phone || order.delivery_address?.phone || order.phone);
      const curUserId = String(currentUser?.id || currentUser?.sub || '').trim();

      // Same ownership rule as the "my orders" list: user id, account email, or account phone.
      // The JWT may not carry email/phone, so read the live account record.
      let curEmail = String(currentUser?.email || '').toLowerCase().trim();
      let curPhone = digits(currentUser?.phone);
      if (curUserId && (!curEmail || !curPhone)) {
        try {
          const uDoc = await this.firestore.doc('users', curUserId).get();
          if (uDoc.exists) {
            const u: any = uDoc.data() || {};
            curEmail = curEmail || String(u.email || '').toLowerCase().trim();
            curPhone = curPhone || digits(u.phone);
          }
        } catch (_) {}
      }
      const isOwner = Boolean(
        (ordUserId && curUserId && ordUserId === curUserId) ||
        (ordEmail && curEmail && ordEmail === curEmail) ||
        (ordPhoneDigits.length >= 7 && curPhone.length >= 7 &&
          (ordPhoneDigits === curPhone || ordPhoneDigits.endsWith(curPhone) || curPhone.endsWith(ordPhoneDigits))),
      );

      const supplied = digits(phone);
      const phoneVerified = supplied.length >= 7 && ordPhoneDigits.length >= 7 &&
        (ordPhoneDigits === supplied || ordPhoneDigits.endsWith(supplied) || supplied.endsWith(ordPhoneDigits));

      if (!isOwner && !phoneVerified) {
        throw new NotFoundException(`Order not found: ${idOrNumber}`);
      }
    }

    return order;
  }

  async updateStatus(id: string, status: string, notes?: string, adminUser?: any) {
    const validStatuses = [
      'pending',
      'placed',
      'processing',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
    ];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    const docRef = this.firestore.doc('orders', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Order not found: ${id}`);
    }

    const existing = doc.data() || {};
    const now = new Date().toISOString();
    const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';
    const timeline = Array.isArray(existing.timeline) ? [...existing.timeline] : [];
    timeline.push({
      status,
      timestamp: now,
      note: trimmedNotes || `Status updated to ${status}`,
      updated_by: adminUser?.email || adminUser?.uid || 'admin',
    });

    const updates: Record<string, any> = {
      status,
      updated_at: now,
      timeline,
    };
    if (status === 'delivered' && !existing.delivered_at) {
      updates.delivered_at = now;
    }
    if (trimmedNotes) {
      updates.status_note = trimmedNotes;
    }

    await docRef.update(updates);

    return {
      success: true,
      id,
      status,
      order: { id, ...existing, ...updates },
    };
  }

  async updateOrder(id: string, data: any, adminUser?: any) {
    const docRef = this.firestore.doc('orders', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Order not found: ${id}`);
    }

    const existing = doc.data() || {};
    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      updated_at: now,
    };

    const validStatuses = [
      'pending',
      'placed',
      'processing',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
    ];
    if (data?.status !== undefined && data.status !== '') {
      const nextStatus = String(data.status).trim();
      if (!validStatuses.includes(nextStatus)) {
        throw new BadRequestException(`Invalid status: ${nextStatus}`);
      }
      updates.status = nextStatus;
    }

    if (data?.customer_name !== undefined || data?.full_name !== undefined) {
      const name = String(data.customer_name ?? data.full_name ?? '').trim();
      if (!name) {
        throw new BadRequestException('Customer name cannot be empty');
      }
      updates.customer_name = name;
      updates.full_name = name;
    }

    if (data?.customer_phone !== undefined || data?.phone !== undefined) {
      const phone = String(data.customer_phone ?? data.phone ?? '').trim();
      if (!phone) {
        throw new BadRequestException('Customer phone cannot be empty');
      }
      updates.customer_phone = phone;
      updates.phone = phone;
    }

    if (data?.customer_email !== undefined || data?.email !== undefined) {
      const email = String(data.customer_email ?? data.email ?? '').trim();
      updates.customer_email = email;
      updates.email = email;
    }

    const hasTopLevelAddress =
      data?.building !== undefined ||
      data?.street !== undefined ||
      data?.zone !== undefined ||
      data?.city !== undefined;
    if ((data?.delivery_address && typeof data.delivery_address === 'object') || hasTopLevelAddress) {
      const addr = data?.delivery_address && typeof data.delivery_address === 'object' ? data.delivery_address : {};
      const prevAddr = existing.delivery_address && typeof existing.delivery_address === 'object' ? existing.delivery_address : {};
      updates.delivery_address = {
        ...prevAddr,
        building: String(addr.building ?? data?.building ?? prevAddr.building ?? '').trim(),
        street: String(addr.street ?? data?.street ?? prevAddr.street ?? '').trim(),
        zone: String(addr.zone ?? data?.zone ?? prevAddr.zone ?? '').trim(),
        city: String(addr.city ?? data?.city ?? prevAddr.city ?? '').trim(),
      };
    }

    if (data?.pickup_location_id !== undefined || data?.store_pickup_location_id !== undefined) {
      updates.pickup_location_id = String(data.pickup_location_id ?? data.store_pickup_location_id ?? '').trim();
    }

    if (data?.fulfillment_type !== undefined) {
      updates.fulfillment_type = String(data.fulfillment_type).trim();
    }

    if (data?.payment_method !== undefined && data.payment_method !== '') {
      const nextMethod = String(data.payment_method).trim();
      if (!['cash', 'pay_at_store'].includes(nextMethod)) {
        throw new BadRequestException('Payment method must be Cash on Delivery or Pay at Store.');
      }
      updates.payment_method = nextMethod;
    }

    if (data?.payment_status !== undefined && data.payment_status !== '') {
      const validPaymentStatuses = ['pending', 'cod', 'paid', 'failed', 'refunded', 'awaiting_payment', 'cancelled'];
      const nextPayStatus = String(data.payment_status).trim();
      if (!validPaymentStatuses.includes(nextPayStatus)) {
        throw new BadRequestException(`Invalid payment status: ${nextPayStatus}`);
      }
      updates.payment_status = nextPayStatus;
    }

    if (data?.notes !== undefined) {
      updates.notes = String(data.notes).trim();
    }

    const rawShipping = data?.shipping !== undefined ? data.shipping : data?.shipping_cost;
    const rawDiscount = data?.discount !== undefined ? data.discount : data?.discount_amount;
    if (rawShipping !== undefined || rawDiscount !== undefined || data?.subtotal !== undefined) {
      const existingSubtotal =
        existing.subtotal !== undefined
          ? Number(existing.subtotal)
          : Array.isArray(existing.items)
            ? existing.items.reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
            : Number(existing.total || 0);
      const nextSubtotal = data?.subtotal !== undefined ? Math.max(0, Number(data.subtotal) || 0) : existingSubtotal;
      const nextShipping =
        rawShipping !== undefined
          ? Math.max(0, Number(rawShipping) || 0)
          : Math.max(0, Number(existing.shipping ?? existing.shipping_cost ?? 0) || 0);
      const nextDiscount =
        rawDiscount !== undefined
          ? Math.max(0, Number(rawDiscount) || 0)
          : Math.max(0, Number(existing.discount ?? existing.discount_amount ?? 0) || 0);

      updates.subtotal = Number(nextSubtotal.toFixed(2));
      updates.shipping = Number(nextShipping.toFixed(2));
      updates.shipping_cost = Number(nextShipping.toFixed(2));
      updates.discount = Number(nextDiscount.toFixed(2));
      updates.discount_amount = Number(nextDiscount.toFixed(2));
      updates.total = Number(Math.max(0, nextSubtotal - nextDiscount + nextShipping).toFixed(2));
    }

    const timeline = Array.isArray(existing.timeline) ? [...existing.timeline] : [];
    timeline.push({
      status: updates.status || existing.status || 'placed',
      timestamp: now,
      note: 'Order details updated by Admin',
      updated_by: adminUser?.email || adminUser?.uid || 'admin',
    });
    updates.timeline = timeline;

    await docRef.update(updates);

    return {
      success: true,
      id,
      order: { id, ...existing, ...updates },
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
      const approveNote = body.notes || body.admin_notes || '';
      const updatedReturnRequest = {
        ...order.return_request,
        status: 'approved',
        approved_at: nowIso,
        admin_notes: approveNote || 'Return approved by administration',
        reviewed_by: currentUser?.username || currentUser?.email || 'admin',
      };

      timeline.push({
        status: 'return_approved',
        title: 'Return Request Approved (RMA)',
        note: approveNote || 'Return request approved. Goods returned & inventory restored.',
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
        const itemsArr = Array.isArray(o.items) ? o.items : [];
        const itemsCount = itemsArr.reduce((s: number, it: any) => s + (Number(it.quantity) || 1), 0) || o.item_count || itemsArr.length;
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
          admin_notes: rr.admin_notes || rr.rejection_reason || '',
          requested_at: isCancellation ? (o.cancellation?.cancelled_at || o.updated_at || o.created_at) : (rr.requested_at || o.updated_at),
          return_status: isCancellation ? 'cancelled' : (rr.status || 'pending'),
          return_request: o.return_request || null,
          items: itemsArr,
          items_count: itemsCount,
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
      rejected_returns: records.filter((r) => r.type === 'return' && (r.return_status === 'declined' || r.return_status === 'rejected')).length,
    };

    let filtered = records;
    const filterType = String(query?.type || '').toLowerCase().trim();
    if (filterType && filterType !== 'all') {
      if (filterType === 'cancellation' || filterType === 'cancelled') {
        filtered = records.filter((r) => r.type === 'cancellation');
      } else if (filterType === 'return') {
        filtered = records.filter((r) => r.type === 'return');
      } else if (filterType === 'return_pending' || filterType === 'pending') {
        filtered = records.filter((r) => r.type === 'return' && r.return_status === 'pending');
      } else if (filterType === 'return_approved' || filterType === 'approved') {
        filtered = records.filter((r) => r.type === 'return' && r.return_status === 'approved');
      } else if (filterType === 'return_declined' || filterType === 'return_rejected' || filterType === 'declined' || filterType === 'rejected') {
        filtered = records.filter((r) => r.type === 'return' && (r.return_status === 'declined' || r.return_status === 'rejected'));
      }
    }

    return {
      items: filtered,
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
        const isDeclined = rr.status === 'rejected' || rr.status === 'declined';
        notifications.push({
          id: `notif-${o.id}-return-${rr.status}-${new Date(rr.updated_at || rr.declined_at || rr.rejected_at || rr.approved_at || rr.requested_at || Date.now()).getTime()}`,
          order_id: o.id,
          order_number: orderNum,
          type: `return_${rr.status}`,
          title: rr.status === 'approved' ? `Return Approved #${orderNum}` : (isDeclined ? `Return Declined #${orderNum}` : `Return Requested #${orderNum}`),
          message: rr.status === 'approved'
            ? `Your return request (${rr.request_id}) for #${orderNum} has been APPROVED.`
            : (isDeclined
              ? `Your return request (${rr.request_id}) for #${orderNum} was declined: ${rr.rejection_reason || rr.admin_notes || 'Conditions not met.'}`
              : `Your return request (${rr.request_id}) for #${orderNum} has been received and is pending review.`),
          timestamp: rr.approved_at || rr.declined_at || rr.rejected_at || rr.requested_at,
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
