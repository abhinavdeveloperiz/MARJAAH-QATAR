/**
 * MARJAAH QATAR — Admin Orders & Fulfillment Controller (Requirement 1 & 11)
 * Handles order tracking, status workflows, Store Pickup display, and Staff Order Creation with live stock deductions.
 */

(function () {
  'use strict';

  window.AdminOrders = {
    orders: [],
    selectedOrder: null,
    catalogProducts: [],
    storeLocations: [],
    orderCart: [],
    searchDebounceTimer: null,
    pickerDebounceTimer: null,

    onSearchInput() {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.renderTable();
      }, 250);
    },

    onPickerSearchInput() {
      clearTimeout(this.pickerDebounceTimer);
      this.pickerDebounceTimer = setTimeout(() => {
        this.renderProductPickerList();
      }, 200);
    },

    async load() {
      const container = document.getElementById('orders-table-body');
      if (container) {
        container.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-xs text-slate-400">Loading orders &amp; fulfillment...</td></tr>`;
      }

      try {
        const [ordersRes, locsRes] = await Promise.all([
          AdminApp.api('/api/orders?limit=100'),
          AdminApp.api('/api/store-locations'),
        ]);

        this.orders = ordersRes.orders || ordersRes.items || ordersRes.data || ordersRes || [];
        this.storeLocations = locsRes.locations || locsRes || [];
        this.renderTable();
      } catch (err) {
        console.error('Failed to load orders:', err);
        if (container) {
          container.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-xs text-rose-400">Failed to load orders.</td></tr>`;
        }
      }
    },

    renderTable() {
      const container = document.getElementById('orders-table-body');
      if (!container) return;

      const q = (document.getElementById('orders-search-input')?.value || '').toLowerCase().trim();
      const statusFilter = document.getElementById('orders-status-filter')?.value || 'all';
      const fulfillmentFilter = document.getElementById('orders-fulfillment-filter')?.value || 'all';

      let filtered = this.orders.filter((o) => {
        if (statusFilter !== 'all' && (o.status || 'placed').toLowerCase() !== statusFilter) return false;
        if (fulfillmentFilter !== 'all' && (o.fulfillment_type || 'delivery') !== fulfillmentFilter) return false;
        if (q) {
          const num = (o.order_number || o.id || '').toLowerCase();
          const cust = (o.customer_name || o.full_name || '').toLowerCase();
          const phone = (o.customer_phone || o.phone || '').toLowerCase();
          return num.includes(q) || cust.includes(q) || phone.includes(q);
        }
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-xs text-slate-400">No orders matching your filters.</td></tr>`;
        return;
      }

      container.innerHTML = filtered.map((o) => {
        const orderNum = o.order_number || o.id || 'MTQ-00000';
        const dateStr = o.created_at ? new Date(o.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—';
        const custName = o.customer_name || o.full_name || 'Customer';
        const custPhone = o.customer_phone || o.phone || '—';
        const totalVal = Number(o.total || o.subtotal || 0).toFixed(0);

        const isPickup = o.fulfillment_type === 'store_pickup';
        const pickupLoc = o.store_pickup_location || {};

        const statusBadges = {
          placed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          shipped: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        };
        const statusBadge = statusBadges[o.status] || statusBadges.placed;

        const fulfillmentHtml = isPickup
          ? `
            <div class="flex items-center gap-1.5">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                🏪 Store Pickup
              </span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]">${pickupLoc.name || 'Al Sadd Hub'}</p>
          `
          : `
            <div class="flex items-center gap-1.5">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                🚚 Delivery
              </span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]">${o.delivery_address?.zone ? `Zone ${o.delivery_address.zone}, ` : ''}${o.delivery_address?.city || 'Doha'}</p>
          `;

        const canDelete = AdminApp.can('orders', 'delete');
        const deleteBtn = canDelete
          ? `<button type="button" onclick="AdminOrders.confirmDeleteOrder('${o.id}', '${orderNum}')" class="p-1.5 rounded-xl border border-rose-500/30 hover:border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition cursor-pointer" title="Delete Order">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>`
          : '';

        return `
          <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
            <td class="py-3.5 px-4">
              <span class="font-mono font-bold text-xs text-indigo-400">#${orderNum}</span>
              <p class="text-[10px] text-slate-500 font-mono mt-0.5">${dateStr}</p>
            </td>
            <td class="py-3.5 px-4">
              <p class="font-bold text-xs text-white">${custName}</p>
              <p class="text-[11px] text-slate-400 font-mono">${custPhone}</p>
            </td>
            <td class="py-3.5 px-4">${fulfillmentHtml}</td>
            <td class="py-3.5 px-4">
              <span class="font-display font-black text-xs text-white">${totalVal} <span class="text-[10px] font-normal text-slate-400">QAR</span></span>
              <p class="text-[10px] text-slate-400 capitalize">${o.payment_method || 'Cash'}</p>
            </td>
            <td class="py-3.5 px-4">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}">
                ${(o.status || 'placed').toUpperCase()}
              </span>
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button type="button" onclick="AdminOrders.openDetailsModal('${o.id}')" class="px-3 py-1.5 rounded-xl border border-slate-700/60 hover:bg-slate-700/40 text-xs font-bold text-indigo-300 hover:text-white transition cursor-pointer">
                  View &amp; Manage
                </button>
                ${deleteBtn}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    openDetailsModal(orderId) {
      const o = this.orders.find((x) => x.id === orderId);
      if (!o) return;
      this.selectedOrder = o;

      const orderNum = o.order_number || o.id;
      document.getElementById('order-modal-title').textContent = `Order Details #${orderNum}`;
      document.getElementById('order-modal-status-select').value = o.status || 'placed';

      const isPickup = o.fulfillment_type === 'store_pickup';
      const loc = o.store_pickup_location || {};
      const addr = o.delivery_address || {};

      const fulfillmentBox = document.getElementById('order-modal-fulfillment-details');
      if (fulfillmentBox) {
        fulfillmentBox.innerHTML = isPickup
          ? `
            <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-emerald-400 text-sm">🏪 Store Pickup (Click &amp; Collect)</span>
                <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">FREE PICKUP</span>
              </div>
              <p class="text-white font-medium">${loc.name || 'Main Store Hub'}</p>
              <p class="text-slate-300">${loc.address || ''}, ${loc.city || 'Doha'}</p>
              ${loc.phone ? `<p class="text-slate-400">Store Contact: <strong class="text-white">${loc.phone}</strong></p>` : ''}
              ${loc.working_hours ? `<p class="text-slate-400">Hours: <strong class="text-white">${loc.working_hours}</strong></p>` : ''}
              ${loc.instructions ? `<p class="text-emerald-300/90 pt-1 border-t border-emerald-500/20 italic">Note: ${loc.instructions}</p>` : ''}
            </div>
          `
          : `
            <div class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-indigo-300 text-sm">🚚 Doorstep Express Delivery</span>
                <span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">Qatar Express</span>
              </div>
              <p class="text-white font-medium">${o.customer_name || o.full_name || 'Customer'}</p>
              <p class="text-slate-300">${[addr.building, addr.street, addr.zone ? `Zone ${addr.zone}` : '', addr.city || 'Doha'].filter(Boolean).join(', ')}</p>
              <p class="text-slate-400">Phone: <strong class="text-white">${o.customer_phone || o.phone || '—'}</strong></p>
              ${o.notes ? `<p class="text-indigo-200/90 pt-1 border-t border-indigo-500/20 italic">Delivery Note: ${o.notes}</p>` : ''}
            </div>
          `;
      }

      // Items list
      const itemsContainer = document.getElementById('order-modal-items');
      if (itemsContainer && Array.isArray(o.items)) {
        itemsContainer.innerHTML = o.items.map((it) => `
          <div class="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/60 text-xs">
            <div class="flex items-center gap-3">
              <img src="${it.image || '/assets/images/products/placeholder.svg'}" class="w-10 h-10 object-cover rounded-lg border border-slate-700" onerror="this.src='/assets/images/products/placeholder.svg'" />
              <div>
                <p class="font-bold text-white">${it.name}</p>
                <p class="text-[11px] text-slate-400">Qty: ${it.quantity} &times; ${it.price} QAR</p>
              </div>
            </div>
            <span class="font-bold text-white">${(it.quantity * it.price).toFixed(0)} QAR</span>
          </div>
        `).join('');
      }

      // Summary totals
      document.getElementById('order-modal-subtotal').textContent = `${(o.subtotal || o.total || 0).toFixed(0)} QAR`;
      document.getElementById('order-modal-shipping').textContent = isPickup ? '0 QAR (Free Pickup)' : `${(o.shipping || 0).toFixed(0)} QAR`;
      document.getElementById('order-modal-total').textContent = `${(o.total || 0).toFixed(0)} QAR`;

      // Danger zone delete order visibility based on RBAC
      const dangerZone = document.getElementById('order-modal-danger-zone');
      if (dangerZone) {
        dangerZone.style.display = AdminApp.can('orders', 'delete') ? 'flex' : 'none';
      }

      document.getElementById('order-details-modal').classList.remove('hidden');
    },

    closeDetailsModal() {
      document.getElementById('order-details-modal').classList.add('hidden');
    },

    async updateStatus() {
      if (!this.selectedOrder) return;
      const newStatus = document.getElementById('order-modal-status-select').value;
      const notes = prompt('Enter a status update note for this order (optional):') || '';

      try {
        await AdminApp.api(`/api/orders/${this.selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus, notes }),
        });
        AdminApp.toast(`Order #${this.selectedOrder.order_number || this.selectedOrder.id} status updated to ${newStatus.toUpperCase()}.`, 'success');
        this.closeDetailsModal();
        await this.load();
        AdminApp.updatePendingBadges();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to update order status', 'error');
      }
    },

    async confirmDeleteOrder(orderId, orderNum) {
      if (!AdminApp.can('orders', 'delete')) {
        AdminApp.toast('You do not have permission to delete orders.', 'error');
        return;
      }

      const confirmed = confirm(`Are you sure you want to permanently delete Order #${orderNum}?\n\nThis will remove the order record from the database.`);
      if (!confirmed) return;

      const restock = confirm(`Would you like to restore the ordered product(s) back into available inventory stock?\n\n• OK = Restock products\n• Cancel = Do not restock`);

      try {
        const res = await AdminApp.api(`/api/admin/orders/${orderId}?restock=${restock}`, {
          method: 'DELETE',
        });

        if (res.pending_approval) {
          AdminApp.toast(res.message || 'Order deletion request submitted for approval.', 'info');
        } else {
          AdminApp.toast(res.message || `Order #${orderNum} has been permanently deleted.`, 'success');
        }

        await this.load();
        if (window.AdminDashboard && typeof window.AdminDashboard.load === 'function') {
          window.AdminDashboard.load();
        }
        AdminApp.updatePendingBadges();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to delete order', 'error');
      }
    },

    async deleteCurrentOrder() {
      if (!this.selectedOrder) return;
      const orderId = this.selectedOrder.id;
      const orderNum = this.selectedOrder.order_number || orderId;
      this.closeDetailsModal();
      await this.confirmDeleteOrder(orderId, orderNum);
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 2. ADMIN ORDER CREATION (Requirement 11)
    // ═════════════════════════════════════════════════════════════════════════
    async openCreateOrderModal() {
      this.orderCart = [];
      document.getElementById('create-order-form').reset();
      this.renderOrderCart();

      // Populate Pickup Location Select
      const locSelect = document.getElementById('create-order-pickup-location');
      if (locSelect) {
        locSelect.innerHTML = this.storeLocations.map((l) => `
          <option value="${l.id}">${l.name} — ${l.address}, ${l.city || 'Doha'}</option>
        `).join('');
      }

      // Load products for picker
      if (this.catalogProducts.length === 0) {
        try {
          const res = await AdminApp.api('/api/products?limit=100');
          this.catalogProducts = res.products || res.items || res || [];
        } catch (e) {
          console.warn('Failed to fetch catalog for order picker:', e);
        }
      }
      this.renderProductPickerList();

      document.getElementById('create-order-modal').classList.remove('hidden');
    },

    closeCreateOrderModal() {
      document.getElementById('create-order-modal').classList.add('hidden');
    },

    toggleCreateOrderFulfillment(type) {
      const deliverySection = document.getElementById('create-order-delivery-fields');
      const pickupSection = document.getElementById('create-order-pickup-fields');
      if (type === 'store_pickup') {
        if (deliverySection) deliverySection.classList.add('hidden');
        if (pickupSection) pickupSection.classList.remove('hidden');
      } else {
        if (deliverySection) deliverySection.classList.remove('hidden');
        if (pickupSection) pickupSection.classList.add('hidden');
      }
      this.renderOrderCart();
    },

    renderProductPickerList() {
      const container = document.getElementById('create-order-product-results');
      if (!container) return;

      const q = (document.getElementById('create-order-product-search')?.value || '').toLowerCase().trim();
      const filtered = this.catalogProducts.filter((p) => {
        if (!q) return true;
        return (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
      }).slice(0, 15);

      if (filtered.length === 0) {
        container.innerHTML = `<p class="p-3 text-xs text-slate-400 text-center">No products matching "${q}"</p>`;
        return;
      }

      container.innerHTML = filtered.map((p) => {
        const stockCount = p.stock_count !== undefined ? Number(p.stock_count) : (p.stock !== undefined ? Number(p.stock) : 10);
        const isOutOfStock = stockCount <= 0;

        return `
          <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition">
            <div class="flex items-center gap-2.5 min-w-0">
              <img src="${p.image || '/assets/images/products/placeholder.svg'}" class="w-9 h-9 object-cover rounded-lg border border-slate-800" onerror="this.src='/assets/images/products/placeholder.svg'" />
              <div class="min-w-0">
                <p class="text-xs font-bold text-white truncate max-w-[200px]">${p.name}</p>
                <p class="text-[10px] text-slate-400">${p.price} QAR &bull; <span class="${isOutOfStock ? 'text-rose-400 font-bold' : 'text-emerald-400'}">${isOutOfStock ? 'Out of Stock' : `${stockCount} available`}</span></p>
              </div>
            </div>
            <button type="button" ${isOutOfStock ? 'disabled' : ''} onclick="AdminOrders.addItemToCart('${p.id || p.slug}')" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-white transition">
              + Add
            </button>
          </div>
        `;
      }).join('');
    },

    addItemToCart(prodId) {
      const p = this.catalogProducts.find((x) => x.id === prodId || x.slug === prodId);
      if (!p) return;

      const existing = this.orderCart.find((x) => x.product_id === p.id || x.product_id === p.slug);
      const stock = p.stock_count !== undefined ? Number(p.stock_count) : 10;

      if (existing) {
        if (existing.quantity >= stock) {
          AdminApp.toast(`Only ${stock} units in stock for ${p.name}`, 'warning');
          return;
        }
        existing.quantity += 1;
      } else {
        this.orderCart.push({
          product_id: p.id || p.slug,
          slug: p.slug,
          name: p.name,
          price: Number(p.price),
          quantity: 1,
          image: p.image || '/assets/images/products/placeholder.svg',
          max_stock: stock,
        });
      }
      this.renderOrderCart();
    },

    updateCartQty(prodId, delta) {
      const item = this.orderCart.find((x) => x.product_id === prodId);
      if (!item) return;

      item.quantity += delta;
      if (item.quantity <= 0) {
        this.orderCart = this.orderCart.filter((x) => x.product_id !== prodId);
      } else if (item.quantity > item.max_stock) {
        item.quantity = item.max_stock;
        AdminApp.toast(`Maximum available stock reached (${item.max_stock})`, 'warning');
      }
      this.renderOrderCart();
    },

    renderOrderCart() {
      const container = document.getElementById('create-order-cart-items');
      const totalEl = document.getElementById('create-order-total-preview');
      if (!container) return;

      if (this.orderCart.length === 0) {
        container.innerHTML = `<p class="p-4 text-xs text-slate-400 text-center italic">No items added to order yet. Search catalog on left to add.</p>`;
        if (totalEl) totalEl.textContent = '0 QAR';
        return;
      }

      let subtotal = 0;
      container.innerHTML = this.orderCart.map((it) => {
        const itemTotal = it.price * it.quantity;
        subtotal += itemTotal;
        return `
          <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-xs">
            <div class="flex items-center gap-2.5">
              <img src="${it.image}" class="w-8 h-8 rounded-lg object-cover" />
              <div>
                <p class="font-bold text-white truncate max-w-[160px]">${it.name}</p>
                <p class="text-[10px] text-slate-400">${it.price} QAR each</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
                <button type="button" onclick="AdminOrders.updateCartQty('${it.product_id}', -1)" class="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white">&minus;</button>
                <span class="font-bold px-1.5">${it.quantity}</span>
                <button type="button" onclick="AdminOrders.updateCartQty('${it.product_id}', 1)" class="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white">&plus;</button>
              </div>
              <span class="font-bold text-white w-14 text-right">${itemTotal.toFixed(0)} QAR</span>
            </div>
          </div>
        `;
      }).join('');

      if (totalEl) totalEl.textContent = `${subtotal.toFixed(0)} QAR`;
    },

    async submitCreateOrder(e) {
      e.preventDefault();

      if (this.orderCart.length === 0) {
        AdminApp.toast('Please add at least one product to the order.', 'warning');
        return;
      }

      const fulfillment_type = document.querySelector('input[name="create_fulfillment_type"]:checked')?.value || 'delivery';
      const full_name = document.getElementById('create-order-name').value.trim();
      const phone = document.getElementById('create-order-phone').value.trim();
      const email = document.getElementById('create-order-email')?.value?.trim();
      const payment_method = document.getElementById('create-order-payment').value;
      const notes = document.getElementById('create-order-notes')?.value?.trim() || 'Created manually by Staff';

      const payload = {
        full_name,
        phone,
        email,
        fulfillment_type,
        payment_method,
        notes,
        items: this.orderCart.map((i) => ({
          product_id: i.product_id,
          slug: i.slug,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
        })),
      };

      if (fulfillment_type === 'store_pickup') {
        const locId = document.getElementById('create-order-pickup-location').value;
        const loc = this.storeLocations.find((x) => x.id === locId);
        payload.store_pickup_location_id = locId;
        payload.store_pickup_location = loc;
        payload.shipping_cost = 0;
      } else {
        payload.building = document.getElementById('create-order-building')?.value?.trim() || '';
        payload.street = document.getElementById('create-order-street')?.value?.trim() || '';
        payload.zone = document.getElementById('create-order-zone')?.value?.trim() || 'Doha';
        payload.city = document.getElementById('create-order-city')?.value?.trim() || 'Doha';
      }

      const submitBtn = document.getElementById('create-order-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing & Deducting Stock...';
      }

      try {
        const res = await AdminApp.api('/api/admin/orders/create', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        AdminApp.toast(`Order #${res.order_number || res.id} created successfully with inventory deducted.`, 'success');
        this.closeCreateOrderModal();
        await this.load();
        AdminApp.updatePendingBadges();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to create order', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Order & Deduct Stock';
        }
      }
    },
  };
})();

