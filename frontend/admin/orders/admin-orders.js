// Only two payment methods exist: Cash on Delivery (doorstep) and Pay at Store (pickup).
// Legacy online-payment values on old orders are still labelled correctly.
function AdminOrders_payLabel(o) {
  const pickup = o && (o.fulfillment_type === 'store_pickup' || o.delivery_method === 'pickup');
  const pm = String((o && o.payment_method) || (pickup ? 'pay_at_store' : 'cash')).toLowerCase();
  if (pm === 'pay_at_store') return 'Pay at Store (Pickup)';
  if (pm === 'cash' || pm === 'cod') return 'Cash on Delivery';
  if (pm === 'card' || pm === 'credit_card') return 'Card (legacy)';
  return pm.replace(/_/g, ' ');
}



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
      if (container && (!this.orders || this.orders.length === 0)) {
        container.innerHTML = `
          <tr>
            <td colspan="7" class="py-12 text-center text-xs text-slate-400">
              <div class="flex flex-col items-center justify-center gap-2.5">
                <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading live orders &amp; fulfillment...</span>
              </div>
            </td>
          </tr>`;
      }

      this.loadStoreLocations();

      this.preloadCatalogProducts();

      try {
        const ordersRes = await AdminApp.api('/api/orders?limit=100');
        this.orders = ordersRes?.items || ordersRes?.orders || ordersRes?.data || (Array.isArray(ordersRes) ? ordersRes : []);
        this.renderTable();
      } catch (err) {
        console.error('Failed to load orders:', err);
        if (container) {
          container.innerHTML = `
            <tr>
              <td colspan="7" class="py-8 text-center text-xs text-rose-400">
                <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 max-w-md mx-auto space-y-2">
                  <p class="font-bold text-sm text-rose-300">Failed to load orders</p>
                  <p class="text-[11px] text-slate-400">${err.message || 'Unable to retrieve live orders from database.'}</p>
                  <button type="button" onclick="AdminOrders.load()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition">
                    ↻ Retry Loading Orders
                  </button>
                </div>
              </td>
            </tr>`;
        }
      }
    },

    async loadStoreLocations() {
      try {
        const locsRes = await AdminApp.api('/api/store-locations').catch(() => null);
        if (locsRes && (locsRes.locations || Array.isArray(locsRes))) {
          this.storeLocations = locsRes.locations || locsRes || [];
          return;
        }
      } catch (_) { }

      this.storeLocations = [
        {
          id: 'al-sadd-hub',
          name: 'MARJAAH Tech & Home Experience Hub — Al Sadd',
          address: 'Building 42, Al Mirqab Al Jadeed St',
          zone: 'Zone 39',
          city: 'Doha',
          country: 'Qatar',
          phone: '+974 7799 1013',
          working_hours: 'Saturday – Thursday: 9:00 AM – 10:00 PM | Friday: 2:00 PM – 10:00 PM',
          instructions: 'Please present your Order Confirmation Number (MTQ-XXXXX) at the collection desk.',
        },
        {
          id: 'mall-of-qatar-hub',
          name: 'MARJAAH Express Click & Collect — Mall of Qatar',
          address: 'Ground Floor, Near Gate 4',
          zone: 'Zone 51',
          city: 'Al Rayyan',
          country: 'Qatar',
          phone: '+974 7799 1013',
          working_hours: 'Daily: 10:00 AM – 11:00 PM',
          instructions: 'Show your order SMS or QR code for immediate pickup.',
        },
      ];
    },

    async preloadCatalogProducts() {
      if (this.catalogProducts && this.catalogProducts.length > 0) return;
      const cached = window.SmartCache?.getProducts();
      if (cached && cached.length > 0) {
        this.catalogProducts = cached;
        return;
      }
      try {
        const prodData = await AdminApp.api('/api/products?limit=10000&includeHidden=true&status=all').catch(() => null);
        const list = prodData?.products || prodData?.items || prodData?.data || (Array.isArray(prodData) ? prodData : []);
        if (list.length > 0) {
          this.catalogProducts = list;
          window.SmartCache?.setProducts(list);
        }
      } catch (_) { }
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
        const pickupLoc = o.store_pickup_location || o.pickup_location || {};

        const statusBadges = {
          placed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          ready_for_pickup: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
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
          ? `<button type="button" onclick="event.stopPropagation(); AdminOrders.confirmDeleteOrder('${o.id}', '${orderNum}')" class="p-1.5 rounded-xl border border-rose-500/30 hover:border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition cursor-pointer" title="Delete Order">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>`
          : '';

        return `
          <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer" onclick="AdminOrders.openDetailsModal('${o.id}')">
            <td class="py-3.5 px-4">
              <span class="font-mono font-bold text-xs text-primary hover:underline">#${orderNum}</span>
              <p class="text-[10px] text-slate-400 font-mono mt-0.5">${dateStr}</p>
            </td>
            <td class="py-3.5 px-4">
              <p class="font-bold text-xs text-slate-900">${custName}</p>
              <p class="text-[11px] text-slate-500 font-mono">${custPhone}</p>
            </td>
            <td class="py-3.5 px-4">${fulfillmentHtml}</td>
            <td class="py-3.5 px-4">
              <span class="font-display font-black text-xs text-slate-900">${totalVal} <span class="text-[10px] font-normal text-slate-400">QAR</span></span>
              <p class="text-[10px] text-slate-400">${AdminOrders_payLabel(o)}</p>
            </td>
            <td class="py-3.5 px-4">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}">
                ${(o.status || 'placed').toUpperCase()}
              </span>
              ${o.return_request ? `
                <div class="mt-1">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${o.return_request.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              o.return_request.status === 'declined' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
            }">
                    ↩️ RMA ${(o.return_request.status || 'PENDING').toUpperCase()}
                  </span>
                </div>
              ` : ''}
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5" onclick="event.stopPropagation()">
                <button type="button" onclick="AdminOrders.openInvoiceModal('${o.id}')" class="px-2.5 py-1.5 rounded-xl border border-primary/30 hover:border-primary bg-primary/10 hover:bg-primary/20 text-xs font-bold text-primary transition cursor-pointer flex items-center gap-1.5" title="Generate &amp; View Official Tax Invoice">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  <span>Invoice</span>
                </button>
                <button type="button" onclick="AdminOrders.openDetailsModal('${o.id}')" title="Inspect full order items, customer details, and fulfillment lifecycle" class="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 hover:text-slate-900 transition cursor-pointer">
                  Manage
                </button>
                ${deleteBtn}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    async openOrderModal(orderId) {
      return this.openDetailsModal(orderId);
    },

    async openDetailsModal(orderId) {
      let o = this.orders.find((x) => x.id === orderId || x.order_number === orderId);
      if (!o && orderId) {
        try {
          o = await AdminApp.api(`/api/orders/${encodeURIComponent(orderId)}`);
        } catch (err) {
          AdminApp.toast(err.message || 'Unable to load order details', 'error');
          return;
        }
      }
      if (!o) return;
      this.selectedOrder = o;

      const orderNum = o.order_number || o.id;
      const createdAt = o.created_at ? new Date(o.created_at) : new Date();
      const dateFormatted = createdAt.toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });

      const titleEl = document.getElementById('order-modal-title');
      if (titleEl) titleEl.textContent = `Order #${orderNum}`;

      const subtitleEl = document.getElementById('order-modal-subtitle');
      if (subtitleEl) {
        subtitleEl.innerHTML = `Placed on <strong>${dateFormatted}</strong> &bull; Firestore ID: <span class="font-mono text-indigo-300">${o.id}</span>`;
      }

      const statusSelect = document.getElementById('order-modal-status-select');
      if (statusSelect) statusSelect.value = o.status || 'placed';
      const statusNotesEl = document.getElementById('order-modal-status-notes');
      if (statusNotesEl) statusNotesEl.value = '';
      this.toggleEditOrderForm(false);
      this.populateEditOrderForm(o);

      const badgesContainer = document.getElementById('order-modal-badges');
      if (badgesContainer) {
        const statusColors = {
          placed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          pending: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          processing: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          ready_for_pickup: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          shipped: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          returned: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          cancelled: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        };
        const stBadge = statusColors[o.status] || statusColors.placed;
        const payStatus = (o.payment_status || 'cod').toLowerCase();
        const payBadge =
          payStatus === 'paid'
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : payStatus === 'cod'
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-slate-700/40 text-slate-300 border-slate-600/40';

        badgesContainer.innerHTML = `
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${stBadge}">
            ${o.status || 'PLACED'}
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${payBadge}">
            PAYMENT: ${payStatus.toUpperCase()}
          </span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 bg-slate-100 text-slate-700 font-mono">
            ${o.fulfillment_type === 'store_pickup' ? '🏪 STORE PICKUP' : '🚚 EXPRESS DELIVERY'}
          </span>
        `;
      }

      const isPickup = o.fulfillment_type === 'store_pickup' || o.delivery_method === 'pickup';
      const loc = o.store_pickup_location || o.pickup_location || {};
      const addr = o.delivery_address || {};
      const custPhone = o.customer_phone || o.phone || addr.phone || '';
      const cleanPhoneDigits = custPhone.replace(/\D/g, '');
      const custEmail = o.customer_email || o.email || '';

      const infoGrid = document.getElementById('order-modal-info-grid');
      if (infoGrid) {
        infoGrid.innerHTML = `
          <!-- Card 1: Customer Profile -->
          <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
            <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span class="font-bold text-slate-900 flex items-center gap-1.5">
                <span class="text-primary">👤</span> Customer Details
              </span>
              <span class="text-[10px] font-mono text-slate-500">${o.user_id || o.userId ? 'Registered User' : 'Guest'}</span>
            </div>
            <div>
              <p class="font-bold text-slate-900 text-sm">${o.customer_name || o.full_name || addr.full_name || 'Customer'}</p>
              <div class="mt-1 space-y-1">
                <div class="flex items-center gap-2">
                  <a href="tel:${custPhone}" class="text-primary hover:underline font-mono text-xs flex items-center gap-1 font-semibold">
                    <span>📞</span> ${custPhone || '—'}
                  </a>
                  ${cleanPhoneDigits.length >= 7
            ? `<a href="https://wa.me/${cleanPhoneDigits.startsWith('974') ? cleanPhoneDigits : '974' + cleanPhoneDigits}" target="_blank" rel="noopener" class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 transition">
                          💬 WhatsApp
                        </a>`
            : ''
          }
                </div>
                <p class="text-slate-600 truncate" title="${custEmail}">
                  <span>✉️</span> ${custEmail ? `<a href="mailto:${custEmail}" class="hover:underline">${custEmail}</a>` : '<span class="italic text-slate-400">Not provided</span>'}
                </p>
                <p class="text-[10px] text-slate-500 font-mono truncate">
                  Account ID: ${o.user_id || o.userId || 'GUEST-ACCOUNT'}
                </p>
              </div>
            </div>
          </div>

          <!-- Card 2: Delivery & Fulfillment -->
          <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
            <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span class="font-bold text-slate-900 flex items-center gap-1.5">
                <span class="${isPickup ? 'text-emerald-600' : 'text-primary'}">${isPickup ? '🏪' : '🚚'}</span>
                ${isPickup ? 'Store Pickup Hub' : 'Doorstep Delivery'}
              </span>
              <span class="text-[10px] font-bold ${isPickup ? 'text-emerald-700' : 'text-primary'}">Qatar Express</span>
            </div>
            ${isPickup
            ? `
                  <div>
                    <p class="font-bold text-emerald-800">${loc.name || 'MARJAAH Experience Hub — Al Sadd'}</p>
                    <p class="text-slate-600 mt-0.5">${loc.address || 'Building 42, Al Mirqab Al Jadeed St, Zone 39, Doha'}</p>
                    ${loc.phone ? `<p class="text-slate-500 mt-1">Store Phone: <strong class="text-slate-800">${loc.phone}</strong></p>` : ''}
                    ${loc.opening_hours || loc.working_hours ? `<p class="text-slate-500">Hours: <span class="text-slate-700 font-mono text-[11px]">${loc.opening_hours || loc.working_hours}</span></p>` : ''}
                    <p class="text-[11px] text-emerald-700 italic pt-1 mt-1 border-t border-slate-200">
                      Collection Note: ${loc.pickup_instructions || loc.instructions || 'Bring Order Confirmation & QID.'}
                    </p>
                  </div>
                `
            : `
                  <div>
                    <p class="font-bold text-slate-900">${addr.full_name || o.customer_name || 'Delivery Recipient'}</p>
                    <p class="text-slate-600 mt-0.5 leading-relaxed">
                      ${[addr.building ? `Building ${addr.building}` : '', addr.street, addr.zone ? `Zone ${addr.zone}` : '', addr.city || 'Doha', addr.country || 'Qatar'].filter(Boolean).join(', ')}
                    </p>
                    <p class="text-slate-500 mt-1 text-[11px]">
                      Billing: <span class="text-slate-700">${o.billing_address?.street ? [o.billing_address.building, o.billing_address.street, o.billing_address.city].filter(Boolean).join(', ') : 'Same as delivery address'}</span>
                    </p>
                    ${o.notes ? `<p class="text-[11px] text-primary italic pt-1 mt-1 border-t border-slate-200">Delivery Note: "${o.notes}"</p>` : ''}
                  </div>
                `
          }
          </div>

          <!-- Card 3: Payment & Logistics -->
          <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
            <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span class="font-bold text-slate-900 flex items-center gap-1.5">
                <span class="text-amber-500">💳</span> Payment &amp; Logistics
              </span>
              <span class="text-[10px] font-mono text-emerald-700 uppercase font-bold">${o.payment_status || 'COD'}</span>
            </div>
            <div class="space-y-1.5">
              <div class="flex justify-between">
                <span class="text-slate-500">Payment Method:</span>
                <span class="text-slate-900 font-bold capitalize">${AdminOrders_payLabel(o)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Logistics Partner:</span>
                <span class="text-primary font-medium">Qatar Express Courier</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Tracking Ref:</span>
                <span class="font-mono text-slate-700 text-[11px]">QEX-${String(orderNum).replace(/^#+/, '')}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Txn Reference:</span>
                <span class="font-mono text-slate-600 text-[11px]">TXN-${o.id.substring(0, 10).toUpperCase()}</span>
              </div>
            </div>
          </div>
        `;
      }

      const alertsContainer = document.getElementById('order-modal-alerts');
      if (alertsContainer) {
        if (o.return_request) {
          const rr = o.return_request;
          const rrStatus = (rr.status || 'pending').toUpperCase();
          alertsContainer.innerHTML = `
            <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <span>↩️</span> RMA Return Request (${rrStatus})
                </span>
                <span class="text-[10px] font-mono text-slate-400">${rr.requested_at ? new Date(rr.requested_at).toLocaleDateString('en-GB') : ''}</span>
              </div>
              <p class="text-slate-200"><strong>Customer Reason:</strong> ${rr.reason || 'General Return'}</p>
              ${rr.notes ? `<p class="text-slate-300 italic">"${rr.notes}"</p>` : ''}
              ${rr.admin_notes ? `<p class="text-indigo-300 font-semibold">Staff Review: ${rr.admin_notes}</p>` : ''}
              ${rr.status === 'pending'
              ? `
                    <div class="flex items-center gap-2 pt-2 border-t border-amber-500/20">
                      <button type="button" onclick="AdminReturns.approveReturn('${o.id}', '${orderNum}')" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-xl shadow-sm cursor-pointer transition">
                        ✓ Approve &amp; Restock
                      </button>
                      <button type="button" onclick="AdminReturns.openDeclineModal('${o.id}', '${orderNum}')" class="px-3.5 py-1.5 border border-rose-500/40 hover:bg-rose-500/10 text-xs font-bold text-rose-400 rounded-xl cursor-pointer transition">
                        ✕ Decline RMA
                      </button>
                    </div>
                  `
              : ''
            }
            </div>
          `;
        } else if (o.cancellation_reason || o.status === 'cancelled') {
          alertsContainer.innerHTML = `
            <div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
              <span class="font-bold text-rose-300 flex items-center gap-1.5">
                <span>✕</span> Order Cancellation Notice
              </span>
              <p class="text-slate-200"><strong>Reason:</strong> ${o.cancellation_reason || 'Order cancelled by customer/system.'}</p>
              ${o.cancellation_notes ? `<p class="text-slate-300 italic">"${o.cancellation_notes}"</p>` : ''}
            </div>
          `;
        } else {
          alertsContainer.innerHTML = '';
        }
      }

      const itemsContainer = document.getElementById('order-modal-items');
      const itemsCountBadge = document.getElementById('order-modal-items-count');
      const items = Array.isArray(o.items) ? o.items : [];

      if (itemsCountBadge) {
        itemsCountBadge.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
      }

      let subtotalCalc = 0;
      let totalDiscountCalc = 0;

      if (itemsContainer) {
        if (items.length === 0) {
          itemsContainer.innerHTML = `<div class="p-6 rounded-xl border border-slate-800 text-center text-xs text-slate-500 italic">No items recorded in this order package.</div>`;
        } else {
          itemsContainer.innerHTML = items
            .map((it) => {

              const prod = window.SmartCache?.findProduct(it.id || it.slug || it.name) || this.catalogProducts.find((p) => p.id === it.id || p.slug === it.slug || p.name === it.name) || null;

              const sku = it.sku || prod?.sku || prod?.model_number || it.id || 'MTQ-GEN-SKU';
              const imgUrl = it.image || prod?.image || prod?.images?.[0] || '/assets/images/products/placeholder.svg';
              const brand = it.brand || prod?.brand || prod?.brand_name || '';
              const variantName = it.variant || it.selected_variant || it.colour || it.size || prod?.colour || '';

              const unitPrice = Number(it.price || prod?.price || 0);
              const originalPrice = Number(it.original_price || prod?.original_price || 0);
              const qty = Number(it.quantity || 1);
              const lineTotal = Number(it.line_total || unitPrice * qty);

              subtotalCalc += lineTotal;

              const discountPerUnit = originalPrice > unitPrice ? originalPrice - unitPrice : 0;
              const lineDiscount = discountPerUnit * qty;
              totalDiscountCalc += lineDiscount;

              return `
                <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div class="flex items-center gap-3.5 min-w-0 flex-1">
                    <button type="button" onclick="window.openImageLightbox('${(imgUrl || '').replace(/'/g, "\\'")}', '${(it.name || 'Catalog Item').replace(/'/g, "\\'")}', '${(sku || '').replace(/'/g, "\\'")}')" class="group relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-primary flex-shrink-0 cursor-zoom-in transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40" title="Click to view full screen image">
                      <img src="${imgUrl}" alt="${it.name || 'Product'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.src='/assets/images/products/placeholder.svg'" />
                      <div class="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                      </div>
                    </button>
                    <div class="min-w-0 flex-1 space-y-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-slate-900 text-xs sm:text-sm hover:text-primary transition">${it.name || 'Catalog Item'}</span>
                        ${brand ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700 border border-slate-300">${brand}</span>` : ''}
                      </div>
                      ${it.name_ar ? `<p class="text-[11px] text-slate-500 font-arabic truncate" dir="rtl">${it.name_ar}</p>` : ''}
                      
                      <!-- SKU & Attributes Row -->
                      <div class="flex items-center gap-2 flex-wrap pt-0.5">
                        <span class="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                          <span class="text-slate-500">SKU:</span>
                          <span>${sku}</span>
                        </span>
                        ${variantName
                  ? `<span class="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                <span>Variant:</span>
                                <span>${variantName}</span>
                              </span>`
                  : ''
                }
                        <span class="text-[10px] text-slate-500 font-mono">
                          Unit: <strong class="text-slate-900">${unitPrice.toLocaleString()} QAR</strong>
                          ${originalPrice > unitPrice ? `<span class="line-through text-slate-400 ml-1">${originalPrice} QAR</span>` : ''}
                        </span>
                        ${lineDiscount > 0
                  ? `<span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                Saved ${lineDiscount} QAR
                              </span>`
                  : ''
                }
                      </div>
                    </div>
                  </div>

                  <!-- Price & Qty Summary Column -->
                  <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 gap-1 flex-shrink-0 min-w-[110px]">
                    <span class="text-slate-500 text-[11px] font-mono">Qty: <strong class="text-slate-900 text-xs">${qty}</strong></span>
                    <span class="font-display font-black text-sm text-primary font-mono">${lineTotal.toLocaleString()} <span class="text-[10px] text-slate-500 font-sans font-normal">QAR</span></span>
                  </div>
                </div>
              `;
            })
            .join('');
        }
      }

      const orderSubtotal = Number(o.subtotal || subtotalCalc || o.total || 0);
      const orderTotal = Number(o.total || orderSubtotal);
      const orderShipping = Number(o.shipping || 0);

      const subtotalEl = document.getElementById('order-modal-subtotal');
      if (subtotalEl) subtotalEl.textContent = `${orderSubtotal.toLocaleString()} QAR`;

      const discountEl = document.getElementById('order-modal-discount');
      if (discountEl) {
        discountEl.textContent = totalDiscountCalc > 0 ? `-${totalDiscountCalc.toLocaleString()} QAR` : '0 QAR';
      }

      const shippingEl = document.getElementById('order-modal-shipping');
      if (shippingEl) {
        shippingEl.textContent = isPickup ? '0 QAR (Free Store Pickup)' : orderShipping > 0 ? `${orderShipping} QAR` : '0 QAR (Free Qatar Express)';
      }

      const totalEl = document.getElementById('order-modal-total');
      if (totalEl) totalEl.textContent = `${orderTotal.toLocaleString()} QAR`;

      const dangerZone = document.getElementById('order-modal-danger-zone');
      if (dangerZone) {
        dangerZone.style.display = AdminApp.can('orders', 'delete') ? 'flex' : 'none';
      }

      document.getElementById('order-details-modal').classList.remove('hidden');
    },

    closeDetailsModal() {
      document.getElementById('order-details-modal').classList.add('hidden');
    },

    populateEditOrderForm(o) {
      if (!o) return;
      const addr = o.delivery_address || {};
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
      };
      const setSelectVal = (id, val, fallback) => {
        const el = document.getElementById(id);
        if (!el) return;
        const targetVal = (val || fallback || '').toString();
        if (targetVal && !Array.from(el.options).some((opt) => opt.value === targetVal)) {
          const opt = document.createElement('option');
          opt.value = targetVal;
          opt.textContent = targetVal;
          el.appendChild(opt);
        }
        el.value = targetVal || fallback || '';
      };

      setVal('order-edit-customer-name', o.customer_name || o.full_name || addr.full_name || '');
      setVal('order-edit-customer-phone', o.customer_phone || o.phone || addr.phone || '');
      setVal('order-edit-customer-email', o.customer_email || o.email || '');
      setVal('order-edit-building', addr.building || '');
      setVal('order-edit-street', addr.street || '');
      setVal('order-edit-zone', addr.zone || '');
      setVal('order-edit-city', addr.city || 'Doha');
      setSelectVal('order-edit-payment-method', (o.payment_method === 'pay_at_store' || o.fulfillment_type === 'store_pickup' || o.delivery_method === 'pickup') ? 'pay_at_store' : 'cash', 'cash');
      setSelectVal('order-edit-payment-status', (o.payment_status || 'cod').toLowerCase(), 'cod');
      setVal('order-edit-shipping', Number(o.shipping ?? o.shipping_cost ?? 0));
      setVal('order-edit-discount', Number(o.discount ?? o.discount_amount ?? 0));
      setVal('order-edit-notes', o.notes || '');
    },

    toggleEditOrderForm(forceState) {
      const container = document.getElementById('order-edit-form-container');
      const toggleBtn = document.getElementById('order-modal-edit-toggle-btn');
      const labelEl = document.getElementById('order-modal-edit-toggle-label');
      if (!container) return;

      const shouldShow = typeof forceState === 'boolean' ? forceState : container.classList.contains('hidden');
      if (shouldShow) {
        this.populateEditOrderForm(this.selectedOrder);
        container.classList.remove('hidden');
        if (toggleBtn) {
          toggleBtn.classList.add('bg-indigo-600', 'text-white', 'border-indigo-600');
          toggleBtn.classList.remove('bg-indigo-50', 'text-indigo-700', 'border-indigo-200');
        }
        if (labelEl) labelEl.textContent = 'Hide Edit Form';
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        container.classList.add('hidden');
        if (toggleBtn) {
          toggleBtn.classList.remove('bg-indigo-600', 'text-white', 'border-indigo-600');
          toggleBtn.classList.add('bg-indigo-50', 'text-indigo-700', 'border-indigo-200');
        }
        if (labelEl) labelEl.textContent = 'Edit Order';
      }
    },

    async saveOrderEdit(e) {
      e.preventDefault();
      if (!this.selectedOrder) return;

      const customer_name = (document.getElementById('order-edit-customer-name')?.value || '').trim();
      const customer_phone = (document.getElementById('order-edit-customer-phone')?.value || '').trim();
      if (!customer_name || !customer_phone) {
        AdminApp.toast('Customer name and phone number are required.', 'warning');
        return;
      }

      const payload = {
        customer_name,
        customer_phone,
        customer_email: (document.getElementById('order-edit-customer-email')?.value || '').trim(),
        delivery_address: {
          building: (document.getElementById('order-edit-building')?.value || '').trim(),
          street: (document.getElementById('order-edit-street')?.value || '').trim(),
          zone: (document.getElementById('order-edit-zone')?.value || '').trim(),
          city: (document.getElementById('order-edit-city')?.value || '').trim(),
        },
        payment_method: document.getElementById('order-edit-payment-method')?.value || 'cash',
        payment_status: document.getElementById('order-edit-payment-status')?.value || 'cod',
        shipping: Number(document.getElementById('order-edit-shipping')?.value || 0),
        discount: Number(document.getElementById('order-edit-discount')?.value || 0),
        notes: (document.getElementById('order-edit-notes')?.value || '').trim(),
      };

      const btn = document.getElementById('order-edit-save-btn');
      const originalHtml = btn ? btn.innerHTML : 'Save Order Changes';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5 align-middle"></span>Saving...';
      }

      try {
        const res = await AdminApp.api(`/api/orders/${this.selectedOrder.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        const updatedOrder = res?.order || { ...this.selectedOrder, ...payload };
        const idx = this.orders.findIndex((x) => x.id === this.selectedOrder.id);
        if (idx !== -1) this.orders[idx] = { ...this.orders[idx], ...updatedOrder };
        this.selectedOrder = { ...this.selectedOrder, ...updatedOrder };

        AdminApp.toast(`Order #${this.selectedOrder.order_number || this.selectedOrder.id} updated successfully.`, 'success');
        this.toggleEditOrderForm(false);
        this.openDetailsModal(this.selectedOrder.id);
        this.renderTable();
        this.load().catch(() => {});
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to save order updates', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
      }
    },

    async updateStatus() {
      if (!this.selectedOrder) return;
      const newStatus = document.getElementById('order-modal-status-select')?.value;
      const notesEl = document.getElementById('order-modal-status-notes');
      const notes = notesEl ? notesEl.value.trim() : '';
      const btn = document.getElementById('order-modal-status-btn');
      const originalHtml = btn ? btn.innerHTML : 'Update Status';

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5 align-middle"></span>Updating...';
      }

      try {
        const res = await AdminApp.api(`/api/orders/${this.selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus, notes }),
        });

        const updatedOrder = res?.order || { ...this.selectedOrder, status: newStatus };
        const idx = this.orders.findIndex((x) => x.id === this.selectedOrder.id);
        if (idx !== -1) this.orders[idx] = { ...this.orders[idx], ...updatedOrder };
        this.selectedOrder = { ...this.selectedOrder, ...updatedOrder };

        if (notesEl) notesEl.value = '';
        AdminApp.toast(`Order #${this.selectedOrder.order_number || this.selectedOrder.id} status updated to ${newStatus.toUpperCase()}.`, 'success');
        this.openDetailsModal(this.selectedOrder.id);
        this.renderTable();
        AdminApp.updatePendingBadges();
        this.load().catch(() => {});
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to update order status', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
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

    async openCreateOrderModal() {
      this.orderCart = [];
      document.getElementById('create-order-form').reset();
      this.toggleCreateOrderFulfillment('delivery');
      this.renderOrderCart();

      if (!this.storeLocations || this.storeLocations.length === 0) {
        await this.loadStoreLocations();
      }
      const locSelect = document.getElementById('create-order-pickup-location');
      if (locSelect) {
        locSelect.innerHTML = this.storeLocations.map((l) => `
          <option value="${l.id}">${l.name} — ${l.address}, ${l.city || 'Doha'}</option>
        `).join('');
      }

      if (this.catalogProducts.length === 0) {
        await this.preloadCatalogProducts();
      }
      if (this.catalogProducts.length === 0) {
        try {
          const res = await AdminApp.api('/api/products?limit=10000&includeHidden=true&status=all');
          const list = res?.products || res?.items || res?.data || (Array.isArray(res) ? res : []);
          this.catalogProducts = list;
          if (list.length > 0) window.SmartCache?.setProducts(list);
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
          <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 transition">
            <div class="flex items-center gap-2.5 min-w-0">
              <img src="${p.image || '/assets/images/products/placeholder.svg'}" class="w-9 h-9 object-cover rounded-lg border border-slate-200" onerror="this.src='/assets/images/products/placeholder.svg'" />
              <div class="min-w-0">
                <p class="text-xs font-bold text-slate-900 truncate max-w-[200px]">${p.name}</p>
                <p class="text-[10px] text-slate-500">${p.price} QAR &bull; <span class="${isOutOfStock ? 'text-rose-600 font-bold' : 'text-emerald-600'}">${isOutOfStock ? 'Out of Stock' : `${stockCount} available`}</span></p>
              </div>
            </div>
            <button type="button" ${isOutOfStock ? 'disabled' : ''} onclick="AdminOrders.addItemToCart('${p.id || p.slug}')" class="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-white transition">
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
          <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
            <div class="flex items-center gap-2.5">
              <img src="${it.image}" class="w-8 h-8 rounded-lg object-cover" />
              <div>
                <p class="font-bold text-slate-900 truncate max-w-[160px]">${it.name}</p>
                <p class="text-[10px] text-slate-500">${it.price} QAR each</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1 bg-slate-200 rounded-lg p-0.5">
                <button type="button" onclick="AdminOrders.updateCartQty('${it.product_id}', -1)" class="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900">&minus;</button>
                <span class="font-bold text-slate-900 px-1.5">${it.quantity}</span>
                <button type="button" onclick="AdminOrders.updateCartQty('${it.product_id}', 1)" class="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900">&plus;</button>
              </div>
              <span class="font-bold text-slate-900 w-14 text-right">${itemTotal.toFixed(0)} QAR</span>
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
      const customer_name = document.getElementById('create-order-name').value.trim();
      const customer_phone = document.getElementById('create-order-phone').value.trim();
      const customer_email = document.getElementById('create-order-email')?.value?.trim() || '';
      const payment_method = document.getElementById('create-order-payment').value;
      const notes = document.getElementById('create-order-notes')?.value?.trim() || 'Created manually by Staff';

      const payload = {
        customer_name,
        customer_phone,
        customer_email,
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
        payload.pickup_location_id = locId;
        payload.store_pickup_location_id = locId;
        payload.store_pickup_location = loc;
        payload.shipping_cost = 0;
      } else {
        payload.delivery_address = {
          building: document.getElementById('create-order-building')?.value?.trim() || '',
          street: document.getElementById('create-order-street')?.value?.trim() || '',
          zone: document.getElementById('create-order-zone')?.value?.trim() || 'Doha',
          city: document.getElementById('create-order-city')?.value?.trim() || 'Doha',
        };
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
        pay_at_store: 'Pay at Store (Store Pickup)',
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
              <div style="margin-bottom: 10px;">
                <img src="/assets/images/branding/logo-light.png?v=5" alt="M.SHOP" style="height: 36px; width: auto; max-width: 180px; object-fit: contain; display: block;" />
              </div>
              <p style="margin: 0; font-size: 13px; font-weight: 800; color: #0F172A; letter-spacing: 0.5px;">M.SHOP — Marjaah Trading W.L.L.</p>
              <p style="margin: 2px 0; font-size: 11px; color: #475569; font-weight: 600;"><span dir="rtl">شركة مرجاح للتجارة ذ.م.م</span> &bull; Commercial Registration (CR) No: <strong style="color: #0F172A;">228717</strong></p>
              <p style="margin: 2px 0; font-size: 11px; color: #475569; line-height: 1.4;">
                Shop No. 8, Building No. 12, Street No. 295, Zone No. 91<br/>
                SOUQ UMM BESHER, Doha, State of Qatar
              </p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">
                Tel: <strong style="color: #0F172A;">+974 7799 1013</strong> &bull; Email: <strong style="color: #0F172A;">info@marjaah.com</strong> &bull; Web: <strong style="color: #0F172A;">www.marjaah.shop</strong>
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
            <div style="width: 340px; max-width: 100%; min-width: 280px;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 5px 0; font-size: 12px; color: #475569; border-bottom: 1px solid #F1F5F9;">
                <span style="white-space: nowrap;">Subtotal</span>
                <span style="font-family: monospace; font-weight: 600; color: #0F172A; white-space: nowrap;">${subtotal.toFixed(2)} QAR</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 5px 0; font-size: 12px; color: #475569; border-bottom: 1px solid #F1F5F9;">
                <span style="white-space: nowrap;">Delivery / Shipping Fee</span>
                <span style="font-family: monospace; font-weight: 600; color: #059669; text-align: right; white-space: nowrap;">${shippingLabel}</span>
              </div>
              ${discount > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 5px 0; font-size: 12px; color: #E11D48; border-bottom: 1px solid #F1F5F9;">
                <span style="white-space: nowrap;">Promotional Discount</span>
                <span style="font-family: monospace; font-weight: 600; white-space: nowrap;">-${discount.toFixed(2)} QAR</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 10px 14px; margin-top: 8px; background: #F8FAFC; border: 2px solid #0F172A; border-radius: 8px;">
                <span style="font-size: 12px; font-weight: 800; color: #0F172A; line-height: 1.3; flex: 1; padding-right: 8px;">Total Amount Due <span dir="rtl" style="display: inline-block;">/ المدفوع</span></span>
                <span style="font-family: monospace; font-size: 17px; font-weight: 900; color: #4338CA; white-space: nowrap; flex-shrink: 0;">${total.toFixed(2)} QAR</span>
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
            <span>M.SHOP (Marjaah Trading W.L.L.) &bull; State of Qatar &bull; Computer Generated Tax Invoice</span>
            <span style="font-family: monospace; letter-spacing: 2px; font-weight: 700; color: #64748B;">*${orderNum}*</span>
          </div>

        </div>
      `;
    },
  };
})();

