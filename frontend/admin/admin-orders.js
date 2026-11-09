/**
 * MARJAAH QATAR — Admin Orders & Fulfillment Controller (Requirement 1 & 11)
 * Handles order tracking, status workflows, Store Pickup display, and Staff Order Creation with live stock deductions.
 */

(function () {
  'use strict';

  window.AdminOrders = {
    orders: [],
    selectedOrder: null,
    selectedInvoiceOrder: null,
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
              ${o.return_request ? `
                <div class="mt-1">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    o.return_request.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    o.return_request.status === 'declined' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                  }">
                    ↩️ RMA ${(o.return_request.status || 'PENDING').toUpperCase()}
                  </span>
                </div>
              ` : ''}
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button type="button" onclick="AdminOrders.openInvoiceModal('${o.id}')" class="px-2.5 py-1.5 rounded-xl border border-indigo-500/40 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-bold text-indigo-300 hover:text-white transition cursor-pointer flex items-center gap-1.5" title="Generate &amp; View Official Tax Invoice">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  <span>Invoice</span>
                </button>
                <button type="button" onclick="AdminOrders.openDetailsModal('${o.id}')" class="px-3 py-1.5 rounded-xl border border-slate-700/60 hover:bg-slate-700/40 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer">
                  Manage
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

        if (o.return_request) {
          const rr = o.return_request;
          const rrStatus = (rr.status || 'pending').toUpperCase();
          fulfillmentBox.innerHTML += `
            <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 mt-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <span>↩️</span> RMA Return Request (${rrStatus})
                </span>
                <span class="text-[10px] font-mono text-slate-400">${rr.requested_at ? new Date(rr.requested_at).toLocaleDateString('en-GB') : ''}</span>
              </div>
              <p class="text-slate-200"><strong>Customer Reason:</strong> ${rr.reason || 'General Return'}</p>
              ${rr.notes ? `<p class="text-slate-300 italic">"${rr.notes}"</p>` : ''}
              ${rr.admin_notes ? `<p class="text-indigo-300 font-semibold">Staff Review: ${rr.admin_notes}</p>` : ''}
              ${rr.status === 'pending' ? `
                <div class="flex items-center gap-2 pt-2 border-t border-amber-500/20">
                  <button type="button" onclick="AdminReturns.approveReturn('${o.id}', '${orderNum}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-xl shadow-sm cursor-pointer">
                    ✓ Approve &amp; Restock
                  </button>
                  <button type="button" onclick="AdminReturns.openDeclineModal('${o.id}', '${orderNum}')" class="px-3 py-1.5 border border-rose-500/40 hover:bg-rose-500/10 text-xs font-bold text-rose-400 rounded-xl cursor-pointer">
                    ✕ Decline RMA
                  </button>
                </div>
              ` : ''}
            </div>
          `;
        } else if (o.cancellation_reason) {
          fulfillmentBox.innerHTML += `
            <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1 mt-3">
              <span class="font-bold text-rose-300 flex items-center gap-1.5">
                <span>✕</span> Order Cancellation Reason
              </span>
              <p class="text-slate-200"><strong>Reason:</strong> ${o.cancellation_reason}</p>
              ${o.cancellation_notes ? `<p class="text-slate-300 italic">"${o.cancellation_notes}"</p>` : ''}
            </div>
          `;
        }
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

    // ═════════════════════════════════════════════════════════════════════════
    // 3. TAX INVOICE GENERATION & PDF EXPORT
    // ═════════════════════════════════════════════════════════════════════════
    async openInvoiceModal(orderIdOrObj) {
      let order = null;
      if (typeof orderIdOrObj === 'object' && orderIdOrObj !== null) {
        order = orderIdOrObj;
      } else if (orderIdOrObj) {
        order = this.orders.find((x) => x.id === orderIdOrObj || x.order_number === orderIdOrObj);
        if (!order) {
          try {
            order = await AdminApp.api(`/api/orders/${orderIdOrObj}`);
          } catch (e) {
            console.warn('Could not fetch order by ID:', e);
          }
        }
      }

      if (!order) {
        order = this.selectedOrder;
      }

      if (!order) {
        AdminApp.toast('Order details not found to generate invoice.', 'error');
        return;
      }

      this.selectedInvoiceOrder = order;

      const orderNum = order.order_number || order.id || 'MTQ-00000';
      const badgeEl = document.getElementById('invoice-modal-order-number-badge');
      if (badgeEl) badgeEl.textContent = `#${orderNum}`;

      const container = document.getElementById('order-invoice-printable');
      if (container) {
        container.innerHTML = this.renderInvoiceHTML(order);
      }

      const modal = document.getElementById('order-invoice-modal');
      if (modal) modal.classList.remove('hidden');
    },

    closeInvoiceModal() {
      const modal = document.getElementById('order-invoice-modal');
      if (modal) modal.classList.add('hidden');
    },

    async downloadInvoicePDF(orderId) {
      if (orderId) {
        await this.openInvoiceModal(orderId);
      }
      if (!this.selectedInvoiceOrder) {
        AdminApp.toast('No invoice selected to download.', 'warning');
        return;
      }

      const orderNum = (this.selectedInvoiceOrder.order_number || this.selectedInvoiceOrder.id || 'MTQ-00000').replace(/[^a-zA-Z0-9_-]/g, '');
      const element = document.getElementById('order-invoice-printable');
      if (!element) return;

      const btn = document.getElementById('btn-download-invoice-pdf');
      const btnText = document.getElementById('btn-download-invoice-pdf-text');
      const originalText = btnText ? btnText.textContent : 'Download PDF';

      if (btn) btn.disabled = true;
      if (btnText) btnText.innerHTML = '<span class="inline-block animate-spin mr-1">⏳</span> Generating PDF...';

      // Fallback if html2pdf is missing or blocked
      if (typeof window.html2pdf !== 'function') {
        console.warn('html2pdf.js is not loaded, falling back to browser print dialog');
        AdminApp.toast('PDF engine not ready, opening browser print dialog...', 'info');
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = originalText;
        this.printInvoice();
        return;
      }

      const opt = {
        margin: [6, 8, 6, 8],
        filename: `Invoice-${orderNum}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
      };

      try {
        await window.html2pdf().set(opt).from(element).save();
        AdminApp.toast(`Invoice #${orderNum} downloaded successfully as PDF.`, 'success');
      } catch (err) {
        console.error('Failed to generate PDF via html2pdf:', err);
        AdminApp.toast('Direct PDF generation error. Opening print preview...', 'warning');
        this.printInvoice();
      } finally {
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = originalText;
      }
    },

    printInvoice() {
      window.print();
    },

    numberToWords(num) {
      const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

      const val = Number(num);
      if (isNaN(val) || val <= 0) return 'Zero QAR Only';

      const n = Math.floor(val);
      const decimal = Math.round((val - n) * 100);

      function convertGroup(n) {
        if (n === 0) return '';
        if (n < 20) return a[n] + ' ';
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10] : '') + ' ';
        return a[Math.floor(n / 100)] + ' Hundred ' + (n % 100 !== 0 ? convertGroup(n % 100) : '');
      }

      let words = '';
      const millions = Math.floor(n / 1000000);
      const thousands = Math.floor((n % 1000000) / 1000);
      const remainder = n % 1000;

      if (millions > 0) words += convertGroup(millions) + 'Million ';
      if (thousands > 0) words += convertGroup(thousands) + 'Thousand ';
      if (remainder > 0) words += convertGroup(remainder);

      words = (words.trim() || 'Zero') + ' QAR';
      if (decimal > 0) {
        words += ` and ${decimal}/100 Dirhams`;
      }
      return words + ' Only';
    },

    renderInvoiceHTML(o) {
      if (!o) return '<p class="text-center py-10 text-slate-400">Order not found.</p>';

      const orderNum = o.order_number || o.id || 'MTQ-00000';
      const createdDate = o.created_at || o.createdAt ? new Date(o.created_at || o.createdAt) : new Date();
      const dateFormatted = createdDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeFormatted = createdDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const custName = o.customer_name || o.full_name || o.delivery_address?.full_name || 'Valued Customer';
      const custPhone = o.customer_phone || o.phone || o.delivery_address?.phone || '—';
      const custEmail = o.customer_email || o.email || o.delivery_address?.email || '—';

      const isPickup = o.fulfillment_type === 'store_pickup';
      const pickupLoc = o.store_pickup_location || o.pickup_location || {};
      const addr = o.delivery_address || {};

      const subtotal = Number(o.subtotal || o.total || 0);
      const shipping = isPickup ? 0 : Number(o.shipping || 0);
      const discount = Number(o.discount || o.discount_amount || 0);
      const total = Number(o.total || (subtotal + shipping - discount) || 0);

      const paymentMethod = o.payment_method || (isPickup ? 'pay_at_store' : 'cash');
      const paymentMethodLabel = {
        cash: 'Cash on Delivery (COD)',
        cod: 'Cash on Delivery (COD)',
        pay_at_store: 'Pay at Store Hub (Cash/Card)',
        card: 'Credit / Debit Card (Online)',
        credit_card: 'Credit / Debit Card (Online)',
        apple_pay: 'Apple Pay',
      }[paymentMethod.toLowerCase()] || paymentMethod.toUpperCase();

      const paymentStatus = (o.payment_status || (paymentMethod === 'cash' || paymentMethod === 'pay_at_store' ? 'COD' : 'PAID')).toUpperCase();
      const orderStatus = (o.status || 'placed').toUpperCase();

      const items = Array.isArray(o.items) && o.items.length > 0 ? o.items : [
        {
          name: 'M.SHOP Smart Electronics Package',
          price: subtotal,
          quantity: 1,
          sku: 'MTQ-GEN',
          brand: 'MARJAAH',
        }
      ];

      const itemsRowsHtml = items.map((it, idx) => {
        const name = it.name || it.title || 'Product Item';
        const brand = it.brand || it.sku || 'M.SHOP Qatar';
        const price = Number(it.price || it.unit_price || 0);
        const qty = Number(it.quantity || it.qty || 1);
        const lineTotal = price * qty;

        return `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 12px; text-align: center; color: #64748B; font-family: monospace; font-size: 11px;">${idx + 1}</td>
            <td style="padding: 10px 12px;">
              <p style="font-weight: 700; color: #0F172A; font-size: 12px; margin: 0 0 2px 0;">${name}</p>
              <p style="font-size: 10px; color: #64748B; font-family: monospace; margin: 0;">Brand / SKU: ${brand}</p>
            </td>
            <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #334155;">${price.toFixed(2)} QAR</td>
            <td style="padding: 10px 12px; text-align: center; font-weight: 700; font-size: 11px; color: #0F172A;">${qty}</td>
            <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 700; font-size: 12px; color: #0F172A;">${lineTotal.toFixed(2)} QAR</td>
          </tr>
        `;
      }).join('');

      const fulfillmentHtml = isPickup
        ? `
          <div style="font-size: 11px; line-height: 1.5; color: #334155;">
            <p style="margin: 0 0 3px 0; font-weight: 700; color: #059669; font-size: 12px;">🏪 Store Pickup (Click &amp; Collect)</p>
            <p style="margin: 0 0 2px 0; font-weight: 600; color: #0F172A;">${pickupLoc.name || 'MARJAAH Tech &amp; Home Hub — Al Sadd'}</p>
            <p style="margin: 0 0 2px 0; color: #475569;">${pickupLoc.address || 'Building 42, Al Mirqab Al Jadeed St, Al Sadd'}, ${pickupLoc.city || 'Doha'}</p>
            ${pickupLoc.phone ? `<p style="margin: 0 0 2px 0; color: #475569;">Store Contact: <strong>${pickupLoc.phone}</strong></p>` : ''}
            <p style="margin: 0; color: #64748B;">Hours: ${pickupLoc.working_hours || pickupLoc.opening_hours || 'Daily 9:00 AM – 11:00 PM'}</p>
          </div>
        `
        : `
          <div style="font-size: 11px; line-height: 1.5; color: #334155;">
            <p style="margin: 0 0 3px 0; font-weight: 700; color: #4338CA; font-size: 12px;">🚚 Express Doorstep Delivery</p>
            <p style="margin: 0 0 2px 0; font-weight: 600; color: #0F172A;">${custName}</p>
            <p style="margin: 0 0 2px 0; color: #475569;">${[addr.building ? 'Building ' + addr.building : '', addr.street ? 'Street ' + addr.street : '', addr.zone ? 'Zone ' + addr.zone : '', addr.city || 'Doha', 'State of Qatar'].filter(Boolean).join(', ')}</p>
            <p style="margin: 0; color: #475569;">Phone: <strong>${custPhone}</strong></p>
            ${o.notes ? `<p style="margin: 3px 0 0 0; color: #6366F1; font-style: italic;">Note: ${o.notes}</p>` : ''}
          </div>
        `;

      const shippingLabel = isPickup
        ? '0.00 QAR (Free Store Pickup)'
        : (shipping === 0 ? '0.00 QAR (Free Express)' : `${shipping.toFixed(2)} QAR`);

      return `
        <div style="font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FFFFFF; color: #0F172A; line-height: 1.4;">
          
          <!-- BRAND & INVOICE HEADER -->
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #0F172A; gap: 16px;">
            
            <!-- Left: Brand Identity -->
            <div style="flex: 1; min-width: 260px;">
              <div style="margin-bottom: 8px;">
                <svg width="180" height="45" viewBox="0 0 230 58" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="inv-m-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#7E96FC" />
                      <stop offset="100%" stop-color="#5B73EA" />
                    </linearGradient>
                    <linearGradient id="inv-m-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#C4A5FA" />
                      <stop offset="100%" stop-color="#9F78EB" />
                    </linearGradient>
                    <linearGradient id="inv-m-darkblue" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#3C56BE" />
                      <stop offset="100%" stop-color="#2F47A9" />
                    </linearGradient>
                  </defs>
                  <path d="M 6 26 C 6 26, 6 42, 6 46 C 6 51.5 10.5 56 16 56 C 21.5 56 26 51.5 26 46 C 26 38 18 30 6 26 Z" fill="url(#inv-m-darkblue)"/>
                  <path d="M 38 32 C 38 32, 38 42, 38 46 C 38 51.5 42.5 56 48 56 C 53.5 56 58 51.5 58 46 C 58 36 50 28 38 32 Z" fill="url(#inv-m-darkblue)"/>
                  <rect x="3" y="7" width="17" height="44" rx="8.5" transform="rotate(-40 11.5 29)" fill="url(#inv-m-blue)"/>
                  <g opacity="0.4" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round">
                    <line x1="16" y1="20" x2="28" y2="34" />
                    <circle cx="16" cy="20" r="1.5" fill="#FFFFFF" />
                    <circle cx="28" cy="34" r="1.5" fill="#FFFFFF" />
                  </g>
                  <rect x="38" y="7" width="17" height="34" rx="8.5" transform="rotate(40 46.5 24)" fill="url(#inv-m-purple)"/>
                  <circle cx="63" cy="46" r="4.5" fill="#B592F2"/>
                  <g fill="#1E293B">
                    <path d="M 91 19.5 C 89 17.5 86 16 81.5 16 C 75.5 16 71.5 19.5 71.5 24.5 C 71.5 29 74.5 31.8 81 33.5 C 87.5 35.2 89.5 37 89.5 40.5 C 89.5 44.5 85.5 47.5 79.5 47.5 C 74.5 47.5 70.5 45.2 68 42.5 C 66.8 41.2 66.8 39.2 68.2 38 C 69.5 36.8 71.5 36.9 72.8 38.2 C 74.5 40 77 41.5 79.5 41.5 C 82 41.5 83.5 40 83.5 38 C 83.5 35.5 81 34 75.5 32.5 C 69 30.7 65.5 28 65.5 23 C 65.5 16.5 71 10.5 81 10.5 C 86.5 10.5 91.5 12.8 94.5 15.8 C 95.8 17.1 95.7 19.2 94.2 20.5 C 93 21.6 91.9 20.5 91 19.5 Z"/>
                    <path d="M 104 14 C 104 12.3 105.3 11 107 11 C 108.7 11 110 12.3 110 14 V 25 H 125 V 14 C 125 12.3 126.3 11 128 11 C 129.7 11 131 12.3 131 14 V 44 C 131 45.7 129.7 47 128 47 C 126.3 47 125 45.7 125 44 V 31 H 110 V 44 C 110 45.7 108.7 47 107 47 C 105.3 47 104 45.7 104 44 Z"/>
                    <path d="M 154 10.5 C 165.5 10.5 174 19 174 29 C 174 39 165.5 47.5 154 47.5 C 142.5 47.5 134 39 134 29 C 134 19 142.5 10.5 154 10.5 Z M 154 16.5 C 146 16.5 140 22 140 29 C 140 36 146 41.5 154 41.5 C 162 41.5 168 36 168 29 C 168 22 162 16.5 154 16.5 Z"/>
                    <path d="M 183 14 C 183 12.3 184.3 11 186 11 H 198 C 205.5 11 211.5 16 211.5 23.5 C 211.5 31 205.5 36 198 36 H 192 V 44 C 192 45.7 190.7 47 189 47 C 187.3 47 186 45.7 186 44 V 14 H 183 Z M 192 17 V 30 H 198 C 202 30 205.5 27 205.5 23.5 C 205.5 20 202 17 198 17 H 192 Z"/>
                  </g>
                </svg>
              </div>
              <p style="margin: 0; font-size: 13px; font-weight: 800; color: #0F172A; letter-spacing: 0.5px;">MARJAAH QATAR — Marjaah Trading W.L.L.</p>
              <p style="margin: 2px 0; font-size: 11px; color: #475569; font-weight: 600;">شركة مرجاح للتجارة ذ.م.م &bull; Commercial Registration (CR) No: <strong style="color: #0F172A;">228717</strong></p>
              <p style="margin: 2px 0; font-size: 11px; color: #475569; line-height: 1.4;">
                Shop No. 8, Building No. 12, Street No. 295, Zone No. 91<br/>
                SOUQ UMM BESHER, Doha, State of Qatar
              </p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">
                Tel: <strong style="color: #0F172A;">+974 7799 1013</strong> &bull; Email: <strong style="color: #0F172A;">info@marjaah.com</strong> &bull; Web: <strong style="color: #0F172A;">www.marjaah.com</strong>
              </p>
            </div>

            <!-- Right: Invoice Metadata -->
            <div style="text-align: right; min-width: 220px;">
              <div style="display: inline-block; padding: 4px 12px; background: #0F172A; color: #FFFFFF; font-size: 12px; font-weight: 800; border-radius: 6px; letter-spacing: 1px; text-transform: uppercase;">
                TAX INVOICE / فاتورة ضريبية
              </div>
              <p style="margin: 8px 0 2px 0; font-family: monospace; font-size: 20px; font-weight: 900; color: #4338CA; letter-spacing: -0.5px;">#${orderNum}</p>
              <p style="margin: 2px 0; font-size: 11px; color: #475569;">Invoice Date: <strong style="color: #0F172A;">${dateFormatted}</strong> <span style="font-size: 10px; color: #64748B;">(${timeFormatted})</span></p>
              <p style="margin: 4px 0 2px 0; font-size: 11px; color: #475569;">
                Payment: <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; background: ${paymentStatus === 'PAID' ? '#DCFCE7' : '#FEF3C7'}; color: ${paymentStatus === 'PAID' ? '#15803D' : '#B45309'}; border: 1px solid ${paymentStatus === 'PAID' ? '#86EFAC' : '#FCD34D'};">${paymentStatus}</span>
              </p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">
                Status: <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1;">${orderStatus}</span>
              </p>
            </div>

          </div>

          <!-- CUSTOMER & FULFILLMENT TWO-COLUMN BOX -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; padding: 16px 0; border-bottom: 1px solid #E2E8F0;">
            
            <!-- Billed To -->
            <div style="background: #F8FAFC; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0;">
              <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #64748B;">Billed To / العميل</p>
              <p style="margin: 0 0 3px 0; font-size: 13px; font-weight: 800; color: #0F172A;">${custName}</p>
              <p style="margin: 0 0 2px 0; font-size: 11px; color: #475569;">Phone: <strong style="color: #0F172A;">${custPhone}</strong></p>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #475569;">Email: ${custEmail}</p>
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #CBD5E1; font-size: 11px; color: #475569;">
                Payment Method: <strong style="color: #0F172A;">${paymentMethodLabel}</strong>
              </div>
            </div>

            <!-- Fulfillment Destination -->
            <div style="background: #F8FAFC; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0;">
              <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #64748B;">Fulfillment &amp; Delivery Destination / وجهة الاستلام</p>
              ${fulfillmentHtml}
            </div>

          </div>

          <!-- LINE ITEMS TABLE -->
          <div style="padding: 16px 0;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 11px;">
              <thead>
                <tr style="background: #F1F5F9; border-bottom: 2px solid #0F172A; color: #334155; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px;">
                  <th style="padding: 10px 12px; width: 36px; text-align: center;">#</th>
                  <th style="padding: 10px 12px;">Item Description</th>
                  <th style="padding: 10px 12px; text-align: right; width: 110px;">Unit Price</th>
                  <th style="padding: 10px 12px; text-align: center; width: 60px;">Qty</th>
                  <th style="padding: 10px 12px; text-align: right; width: 110px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRowsHtml}
              </tbody>
            </table>
          </div>

          <!-- TOTALS & FINANCIAL SUMMARY -->
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 20px; padding: 14px 0; border-top: 2px solid #E2E8F0;">
            
            <!-- Left: Amount in words & tax notice -->
            <div style="flex: 1; min-width: 250px;">
              <div style="background: #EEF2FF; border: 1px solid #C7D2FE; padding: 10px 14px; border-radius: 10px; margin-bottom: 10px;">
                <p style="margin: 0 0 3px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #3730A3;">Amount in Words / المبلغ بالحروف</p>
                <p style="margin: 0; font-size: 12px; font-weight: 700; color: #1E1B4B; font-style: italic;">${this.numberToWords(total)}</p>
              </div>
              <p style="margin: 0; font-size: 10px; color: #64748B; line-height: 1.4;">
                * All prices are designated in Qatari Riyals (QAR / ر.ق).<br/>
                * Zero-rated or standard tax compliant under Qatar State Commercial Regulations.
              </p>
            </div>

            <!-- Right: Calculations breakdown -->
            <div style="width: 280px;">
              <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #475569; border-bottom: 1px solid #F1F5F9;">
                <span>Subtotal</span>
                <span style="font-family: monospace; font-weight: 600; color: #0F172A;">${subtotal.toFixed(2)} QAR</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #475569; border-bottom: 1px solid #F1F5F9;">
                <span>Delivery / Shipping Fee</span>
                <span style="font-family: monospace; font-weight: 600; color: #059669;">${shippingLabel}</span>
              </div>
              ${discount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #E11D48; border-bottom: 1px solid #F1F5F9;">
                <span>Promotional Discount</span>
                <span style="font-family: monospace; font-weight: 600;">-${discount.toFixed(2)} QAR</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; margin-top: 6px; background: #F8FAFC; border: 2px solid #0F172A; border-radius: 8px;">
                <span style="font-size: 13px; font-weight: 800; color: #0F172A;">Total Amount Due / المدفوع</span>
                <span style="font-family: monospace; font-size: 17px; font-weight: 900; color: #4338CA;">${total.toFixed(2)} QAR</span>
              </div>
            </div>

          </div>

          <!-- FOOTER: WARRANTY, TERMS & COMPANY SEAL -->
          <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid #E2E8F0; display: grid; grid-template-columns: 2fr 1fr; gap: 16px; font-size: 10px; color: #64748B; line-height: 1.4;">
            
            <div>
              <p style="margin: 0 0 4px 0; font-weight: 800; color: #334155; text-transform: uppercase; font-size: 9px; letter-spacing: 0.6px;">Warranty &amp; Return Terms (الشروط والضمان)</p>
              <p style="margin: 0 0 3px 0;">1. <strong>Qatar Warranty:</strong> Genuine products covered under local authorized distributor warranty.</p>
              <p style="margin: 0 0 3px 0;">2. <strong>Returns &amp; Exchanges:</strong> Permitted within 14 days in original sealed packaging with this tax invoice as per Qatar Law No. (8) of 2008 on Consumer Protection.</p>
              <p style="margin: 0;">3. <strong>Service &amp; Inquiries:</strong> Contact support desk at +974 7799 1013 or email info@marjaah.com.</p>
            </div>

            <div style="border: 1px dashed #CBD5E1; border-radius: 10px; padding: 10px; text-align: center; background: #F8FAFC;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; border: 2px solid #6366F1; color: #6366F1; font-weight: 900; margin-bottom: 4px; font-size: 16px;">
                ✓
              </div>
              <p style="margin: 0; font-size: 10px; font-weight: 800; color: #0F172A;">MARJAAH TRADING W.L.L.</p>
              <p style="margin: 1px 0 0 0; font-size: 9px; color: #64748B;">Authorized Official Seal</p>
              <p style="margin: 3px 0 0 0; font-size: 8px; font-family: monospace; color: #94A3B8;">Commercial Reg. 228717</p>
            </div>

          </div>

          <!-- BOTTOM COPYRIGHT & BARCODE SIMULATION -->
          <div style="margin-top: 14px; padding-top: 8px; border-top: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94A3B8;">
            <span>MARJAAH Qatar &bull; State of Qatar &bull; Computer Generated Tax Invoice</span>
            <span style="font-family: monospace; letter-spacing: 2px; font-weight: 700; color: #64748B;">*${orderNum}*</span>
          </div>

        </div>
      `;
    },
  };
})();

