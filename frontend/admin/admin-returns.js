/**
 * MARJAAH QATAR — Admin Returns & Cancellations Controller
 * Manages dynamic return and cancellation policies, RMA reviews, restock automation, and status reports.
 */

(function (global) {
  'use strict';

  const AdminReturns = {
    items: [],
    policies: {
      cancellation_window_value: 24,
      cancellation_window_unit: 'hours',
      cancellation_allowed_statuses: ['placed', 'pending'],
      return_window_days: 14,
      return_allowed_statuses: ['delivered'],
    },
    currentFilter: 'all',

    async load() {
      await Promise.all([this.loadPolicies(), this.loadItems()]);
    },

    async loadPolicies() {
      try {
        const res = await AdminApp.api('/api/orders/admin/policies');
        if (res) {
          this.policies = { ...this.policies, ...res };
          this.renderPoliciesForm();
        }
      } catch (err) {
        console.warn('Failed to load policies:', err);
      }
    },

    renderPoliciesForm() {
      const valInput = document.getElementById('policy-cancel-window-val');
      const unitSelect = document.getElementById('policy-cancel-window-unit');
      const returnDaysInput = document.getElementById('policy-return-window-days');

      if (valInput) valInput.value = this.policies.cancellation_window_value || 24;
      if (unitSelect) unitSelect.value = this.policies.cancellation_window_unit || 'hours';
      if (returnDaysInput) returnDaysInput.value = this.policies.return_window_days || 14;

      const allowed = Array.isArray(this.policies.cancellation_allowed_statuses)
        ? this.policies.cancellation_allowed_statuses
        : ['placed', 'pending'];

      document.querySelectorAll('.cancel-status-checkbox').forEach((cb) => {
        cb.checked = allowed.includes(cb.value);
      });

      // Update KPI Policy Summary
      const summaryEl = document.getElementById('returns-kpi-policy-summary');
      if (summaryEl) {
        summaryEl.textContent = `Cancel: ${this.policies.cancellation_window_value} ${this.policies.cancellation_window_unit} • Return: ${this.policies.return_window_days} Days`;
      }
    },

    async savePolicies() {
      const saveBtn = document.getElementById('btn-save-policies');
      const origText = saveBtn ? saveBtn.textContent : 'Save Settings';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }

      try {
        const cancellation_window_value = Number(document.getElementById('policy-cancel-window-val')?.value) || 24;
        const cancellation_window_unit = document.getElementById('policy-cancel-window-unit')?.value || 'hours';
        const return_window_days = Number(document.getElementById('policy-return-window-days')?.value) || 14;

        const checkedStatuses = [];
        document.querySelectorAll('.cancel-status-checkbox:checked').forEach((cb) => {
          checkedStatuses.push(cb.value);
        });

        const payload = {
          cancellation_window_value,
          cancellation_window_unit,
          cancellation_allowed_statuses: checkedStatuses.length > 0 ? checkedStatuses : ['placed', 'pending'],
          return_window_days,
          return_allowed_statuses: ['delivered'],
        };

        const res = await AdminApp.api('/api/orders/admin/policies', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        this.policies = { ...this.policies, ...payload };
        this.renderPoliciesForm();
        AdminApp.toast(res?.message || 'Dynamic order policies updated successfully!');
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to update dynamic policies.', 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = origText;
        }
      }
    },

    async loadItems() {
      const tableBody = document.getElementById('returns-table-body');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-xs text-slate-400">Loading returns &amp; cancellations...</td></tr>';
      }

      try {
        const res = await AdminApp.api('/api/orders/admin/returns-and-cancellations');
        const items = Array.isArray(res) ? res : (res?.items || []);
        this.items = items;
        this.updateCounters(items);
        this.renderTable();
      } catch (err) {
        console.error('Failed to load returns and cancellations:', err);
        if (tableBody) {
          tableBody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-xs text-rose-400">Error loading data: ${err.message}</td></tr>`;
        }
      }
    },

    updateCounters(items) {
      const pendingReturns = items.filter(i => i.type === 'return' && i.return_status === 'pending').length;
      const approvedReturns = items.filter(i => i.type === 'return' && i.return_status === 'approved').length;
      const totalCancellations = items.filter(i => i.type === 'cancellation' || i.order_status === 'cancelled').length;

      const kpiPending = document.getElementById('returns-kpi-pending');
      const kpiApproved = document.getElementById('returns-kpi-approved');
      const kpiCancelled = document.getElementById('returns-kpi-cancelled');
      const sidebarBadge = document.getElementById('badge-pending-returns');

      if (kpiPending) kpiPending.textContent = pendingReturns;
      if (kpiApproved) kpiApproved.textContent = approvedReturns;
      if (kpiCancelled) kpiCancelled.textContent = totalCancellations;

      if (sidebarBadge) {
        sidebarBadge.textContent = pendingReturns;
        sidebarBadge.style.display = pendingReturns > 0 ? 'inline-flex' : 'none';
      }
    },

    setFilter(filter) {
      this.currentFilter = filter;
      document.querySelectorAll('.returns-filter-tab').forEach((tab) => {
        const f = tab.getAttribute('data-filter');
        if (f === filter) {
          tab.classList.add('bg-indigo-600', 'text-white');
          tab.classList.remove('text-slate-400', 'hover:text-white');
        } else {
          tab.classList.remove('bg-indigo-600', 'text-white');
          tab.classList.add('text-slate-400', 'hover:text-white');
        }
      });
      this.renderTable();
    },

    renderTable() {
      const tableBody = document.getElementById('returns-table-body');
      if (!tableBody) return;

      const q = (document.getElementById('returns-search-input')?.value || '').toLowerCase().trim();

      let filtered = this.items.filter((item) => {
        // Filter by type / status tab
        if (this.currentFilter === 'pending_returns') {
          if (item.type !== 'return' || item.return_status !== 'pending') return false;
        } else if (this.currentFilter === 'approved_returns') {
          if (item.type !== 'return' || item.return_status !== 'approved') return false;
        } else if (this.currentFilter === 'declined_returns') {
          if (item.type !== 'return' || item.return_status !== 'declined') return false;
        } else if (this.currentFilter === 'cancellations') {
          if (item.type !== 'cancellation' && item.order_status !== 'cancelled') return false;
        }

        // Filter by search query
        if (q) {
          const num = (item.order_number || item.order_id || '').toLowerCase();
          const name = (item.customer_name || '').toLowerCase();
          const phone = (item.customer_phone || '').toLowerCase();
          const reason = (item.reason || '').toLowerCase();
          return num.includes(q) || name.includes(q) || phone.includes(q) || reason.includes(q);
        }
        return true;
      });

      if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-xs text-slate-400">No records found matching current filter.</td></tr>`;
        return;
      }

      tableBody.innerHTML = filtered.map((it) => {
        const orderNum = it.order_number || (it.order_id ? (String(it.order_id).startsWith('MTQ-') ? it.order_id : `MTQ-${String(it.order_id).padStart(5, '0')}`) : 'MTQ-00000');
        const dateFormatted = it.request_date ? new Date(it.request_date).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : 'Recent';

        const isReturn = it.type === 'return';
        const typeBadge = isReturn
          ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">↩️ RMA RETURN</span>`
          : `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">✕ CANCELLATION</span>`;

        let statusBadge = '';
        if (isReturn) {
          if (it.return_status === 'approved') {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">APPROVED &amp; RESTOCKED</span>`;
          } else if (it.return_status === 'declined') {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">DECLINED</span>`;
          } else {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">PENDING REVIEW</span>`;
          }
        } else {
          statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">CANCELLED</span>`;
        }

        const actionsHtml = `
          <div class="flex items-center justify-end gap-1.5">
            ${isReturn && it.return_status === 'pending' ? `
              <button type="button" onclick="AdminReturns.approveReturn('${it.order_id}', '${orderNum}')"
                class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold text-white transition cursor-pointer shadow-sm" title="Approve RMA and restock inventory">
                ✓ Approve
              </button>
              <button type="button" onclick="AdminReturns.openDeclineModal('${it.order_id}', '${orderNum}')"
                class="px-2.5 py-1 rounded-lg border border-rose-500/40 hover:bg-rose-500/10 text-[11px] font-bold text-rose-400 transition cursor-pointer" title="Decline RMA request">
                ✕ Decline
              </button>
            ` : ''}

            <button type="button" onclick="AdminOrders.openOrderModal('${it.order_id}')"
              class="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer" title="View Full Order Details">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>

            <button type="button" onclick="AdminOrders.openInvoiceModal('${it.order_id}')"
              class="p-1.5 rounded-lg border border-indigo-500/30 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition cursor-pointer" title="View &amp; Download Tax Invoice">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </button>
          </div>
        `;

        return `
          <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
            <td class="py-3 px-4">
              <span class="font-mono font-bold text-xs text-indigo-400">#${orderNum}</span>
              <p class="text-[10px] text-slate-500 font-mono mt-0.5">${dateFormatted}</p>
            </td>
            <td class="py-3 px-4">
              <p class="font-bold text-xs text-white">${it.customer_name || 'Customer'}</p>
              <p class="text-[11px] text-slate-400 font-mono">${it.customer_phone || '—'}</p>
            </td>
            <td class="py-3 px-4">${typeBadge}</td>
            <td class="py-3 px-4 max-w-xs">
              <p class="text-xs font-semibold text-slate-200 truncate" title="${it.reason || ''}">${it.reason || 'General inquiry'}</p>
              ${it.notes ? `<p class="text-[11px] text-slate-400 truncate max-w-[200px]" title="${it.notes}">"${it.notes}"</p>` : ''}
              ${it.admin_notes ? `<p class="text-[10px] text-indigo-300 mt-0.5 truncate max-w-[200px]" title="${it.admin_notes}">Staff Note: ${it.admin_notes}</p>` : ''}
            </td>
            <td class="py-3 px-4">
              <span class="font-display font-black text-xs text-white">${Number(it.total || 0).toFixed(0)} <span class="text-[10px] font-normal text-slate-400">QAR</span></span>
              <p class="text-[10px] text-slate-400">${it.items_count || 1} item(s)</p>
            </td>
            <td class="py-3 px-4">${statusBadge}</td>
            <td class="py-3 px-4 text-right">${actionsHtml}</td>
          </tr>
        `;
      }).join('');
    },

    async approveReturn(orderId, orderNum) {
      if (!confirm(`Are you sure you want to APPROVE the return for Order #${orderNum}?\n\nThis will mark the RMA as Approved and automatically RESTOCK the items back to inventory.`)) {
        return;
      }

      try {
        const res = await AdminApp.api(`/api/orders/${orderId}/return-review`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'approved',
            admin_notes: 'RMA Approved by staff. Returned inventory restocked.',
            restock_items: true,
          }),
        });

        AdminApp.toast(res?.message || `RMA for Order #${orderNum} approved and restocked!`);
        await this.loadItems();
        if (window.AdminOrders) AdminOrders.load();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to approve return.', 'error');
      }
    },

    openDeclineModal(orderId, orderNum) {
      const modal = document.getElementById('return-decline-modal');
      const orderIdInput = document.getElementById('decline-target-order-id');
      const titleEl = document.getElementById('decline-modal-order-num');
      if (orderIdInput) orderIdInput.value = orderId;
      if (titleEl) titleEl.textContent = `#${orderNum}`;
      if (modal) modal.classList.remove('hidden');
    },

    closeDeclineModal() {
      const modal = document.getElementById('return-decline-modal');
      if (modal) modal.classList.add('hidden');
    },

    async submitDecline() {
      const orderId = document.getElementById('decline-target-order-id')?.value;
      const reason = (document.getElementById('decline-reason-notes')?.value || '').trim();
      if (!orderId) return;

      if (!reason) {
        AdminApp.toast('Please provide a reason for declining the RMA.', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-confirm-decline');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Declining...';
      }

      try {
        const res = await AdminApp.api(`/api/orders/${orderId}/return-review`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'declined',
            admin_notes: reason,
            restock_items: false,
          }),
        });

        this.closeDeclineModal();
        AdminApp.toast(res?.message || 'Return request declined.');
        await this.loadItems();
        if (window.AdminOrders) AdminOrders.load();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to decline return request.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm Decline';
        }
      }
    },
  };

  global.AdminReturns = AdminReturns;
})(typeof window !== 'undefined' ? window : this);

