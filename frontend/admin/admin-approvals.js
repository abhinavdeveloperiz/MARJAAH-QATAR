/**
 * MARJAAH QATAR — Admin Approval Workflows Controller (Requirement 2.4 & 2.5)
 * Handles approval queue, change diffs, approval/rejection reasons, and independent module approval rules.
 */

(function () {
  'use strict';

  window.AdminApprovals = {
    approvals: [],
    configs: [],
    currentStatus: 'pending',
    selectedApproval: null,

    async load() {
      const container = document.getElementById('approvals-table-body');
      if (container) {
        container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-slate-400">Loading approval submissions...</td></tr>`;
      }

      try {
        const [apprData, cfgData] = await Promise.all([
          AdminApp.api(`/api/admin/approvals?status=${this.currentStatus === 'all' ? '' : this.currentStatus}`),
          AdminApp.api('/api/admin/approvals/configs'),
        ]);

        this.approvals = apprData.items || apprData || [];
        this.configs = cfgData.configs || cfgData.items || cfgData || [];
        this.renderTable();
        this.renderConfigsTable();
      } catch (err) {
        console.error('Failed to load approvals:', err);
        if (container) {
          container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-rose-400">Failed to load approvals queue.</td></tr>`;
        }
      }
    },

    setStatusTab(status) {
      this.currentStatus = status;
      document.querySelectorAll('.approval-tab-btn').forEach((btn) => {
        const s = btn.getAttribute('data-status');
        if (s === status) {
          btn.classList.add('active', 'border-indigo-500', 'text-white', 'bg-indigo-600/10');
          btn.classList.remove('border-transparent', 'text-slate-400');
        } else {
          btn.classList.remove('active', 'border-indigo-500', 'text-white', 'bg-indigo-600/10');
          btn.classList.add('border-transparent', 'text-slate-400');
        }
      });
      this.load();
    },

    renderTable() {
      const container = document.getElementById('approvals-table-body');
      if (!container) return;

      if (this.approvals.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-xs text-slate-400">No submissions found in ${this.currentStatus.toUpperCase()} queue.</td></tr>`;
        return;
      }

      container.innerHTML = this.approvals.map((appr) => {
        const statusBadges = {
          pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        };
        const statusBadge = statusBadges[appr.status] || statusBadges.pending;
        const submittedTime = appr.created_at ? new Date(appr.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—';
        const itemTitle = appr.target_title || appr.target_id || 'Item Modification';

        return `
          <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-2">
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">${appr.module}</span>
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">${appr.action}</span>
              </div>
              <p class="font-bold text-xs text-white mt-1.5 truncate max-w-xs">${itemTitle}</p>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-300">
              <span class="font-medium text-slate-200">@${appr.submitted_by_username || appr.submitted_by || 'Staff'}</span>
              <p class="text-[10px] text-slate-500 font-mono mt-0.5">${submittedTime}</p>
            </td>
            <td class="py-3.5 px-4">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}">
                ${(appr.status || 'pending').toUpperCase()}
              </span>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-400">
              ${appr.reviewed_by ? `
                <div class="text-xs text-slate-300">@${appr.reviewed_by}</div>
                <div class="text-[10px] text-slate-500 font-mono">${new Date(appr.reviewed_at).toLocaleDateString('en-GB')}</div>
              ` : '—'}
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-300">
              ${appr.rejection_reason ? `
                <span class="text-rose-400 font-medium italic block max-w-xs truncate" title="${appr.rejection_reason}">
                  "${appr.rejection_reason}"
                </span>
              ` : (appr.status === 'approved' ? '<span class="text-emerald-400 text-[11px]">Approved & Published</span>' : '<span class="text-slate-500">Awaiting Decision</span>')}
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button type="button" onclick="AdminApprovals.openDiffModal('${appr.id}')" class="px-2.5 py-1.5 rounded-xl border border-slate-700/60 hover:bg-slate-700/40 text-xs font-semibold text-indigo-300 hover:text-white transition cursor-pointer">
                  Review Diff
                </button>
                ${appr.status === 'pending' ? `
                  <button type="button" onclick="AdminApprovals.approveSubmission('${appr.id}')" class="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition shadow-sm cursor-pointer">
                    Approve
                  </button>
                  <button type="button" onclick="AdminApprovals.promptRejectSubmission('${appr.id}')" class="px-2.5 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-xs font-bold text-white transition shadow-sm cursor-pointer">
                    Reject
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    openDiffModal(apprId) {
      const appr = this.approvals.find((x) => x.id === apprId);
      if (!appr) return;
      this.selectedApproval = appr;

      document.getElementById('diff-modal-title').textContent = `Review Submission: ${appr.module} (${appr.action})`;
      document.getElementById('diff-modal-meta').innerHTML = `
        Submitted by <strong>@${appr.submitted_by_username || appr.submitted_by}</strong> on ${new Date(appr.created_at).toLocaleString('en-GB')}.
      `;

      const beforeEl = document.getElementById('diff-modal-before');
      const afterEl = document.getElementById('diff-modal-after');

      const beforeData = appr.before_data || appr.previous_state || { status: 'Original State / None' };
      const afterData = appr.after_data || appr.payload || appr.new_state || {};

      if (beforeEl) beforeEl.textContent = JSON.stringify(beforeData, null, 2);
      if (afterEl) afterEl.textContent = JSON.stringify(afterData, null, 2);

      const actionFooter = document.getElementById('diff-modal-actions');
      if (actionFooter) {
        if (appr.status === 'pending') {
          actionFooter.innerHTML = `
            <button type="button" onclick="AdminApprovals.promptRejectSubmission('${appr.id}')" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition">Reject with Reason</button>
            <button type="button" onclick="AdminApprovals.approveSubmission('${appr.id}')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition">Approve &amp; Publish</button>
          `;
        } else {
          actionFooter.innerHTML = `
            <span class="text-xs font-bold text-slate-400">Status: <strong class="text-white uppercase">${appr.status}</strong></span>
          `;
        }
      }

      document.getElementById('approval-diff-modal').classList.remove('hidden');
    },

    closeDiffModal() {
      document.getElementById('approval-diff-modal').classList.add('hidden');
    },

    async approveSubmission(apprId) {
      if (!confirm('Approve this submission? Changes will immediately take effect on the live website.')) return;
      try {
        await AdminApp.api(`/api/admin/approvals/${apprId}/approve`, {
          method: 'POST',
          body: JSON.stringify({ notes: 'Approved via Admin Panel' }),
        });
        AdminApp.toast('Submission approved successfully.', 'success');
        this.closeDiffModal();
        await this.load();
        AdminApp.updatePendingBadges();
      } catch (err) {
        AdminApp.toast(err.message || 'Approval failed', 'error');
      }
    },

    async promptRejectSubmission(apprId) {
      const reason = prompt('Please enter a rejection reason (mandatory for the submitter):');
      if (!reason || !reason.trim()) {
        AdminApp.toast('Rejection reason is required.', 'warning');
        return;
      }

      try {
        await AdminApp.api(`/api/admin/approvals/${apprId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() }),
        });
        AdminApp.toast('Submission rejected with reason.', 'info');
        this.closeDiffModal();
        await this.load();
        AdminApp.updatePendingBadges();
      } catch (err) {
        AdminApp.toast(err.message || 'Rejection failed', 'error');
      }
    },

    // ── Configurable Approval Workflows Per Module / Operation (Requirement 2.4) ──
    renderConfigsTable() {
      const tbody = document.getElementById('approval-configs-tbody');
      if (!tbody) return;

      const MODULES = [
        { key: 'products', name: 'Products Catalog' },
        { key: 'categories', name: 'Categories' },
        { key: 'banners', name: 'Hero Banners' },
        { key: 'promotional_sections', name: 'Promotional Sections' },
        { key: 'orders', name: 'Order Cancellations / Modifications' },
        { key: 'coupons', name: 'Coupons & Discounts' },
      ];

      tbody.innerHTML = MODULES.map((m) => {
        const cfg = this.configs.find((c) => c.module === m.key) || { requires_approval: false, operations: [] };
        const reqCreate = cfg.operations?.includes('create') || false;
        const reqEdit = cfg.operations?.includes('edit') || false;
        const reqDelete = cfg.operations?.includes('delete') || false;

        return `
          <tr class="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
            <td class="py-3 px-4 font-bold text-xs text-white">${m.name}</td>
            <td class="py-3 px-3 text-center">
              <input type="checkbox" data-cfg-mod="${m.key}" data-cfg-op="create" ${reqCreate ? 'checked' : ''} class="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-500" />
            </td>
            <td class="py-3 px-3 text-center">
              <input type="checkbox" data-cfg-mod="${m.key}" data-cfg-op="edit" ${reqEdit ? 'checked' : ''} class="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-500" />
            </td>
            <td class="py-3 px-3 text-center">
              <input type="checkbox" data-cfg-mod="${m.key}" data-cfg-op="delete" ${reqDelete ? 'checked' : ''} class="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-500" />
            </td>
            <td class="py-3 px-4 text-right">
              <button type="button" onclick="AdminApprovals.saveModuleApprovalConfig('${m.key}')" class="px-3 py-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-bold text-indigo-300 hover:text-white transition">
                Save Rule
              </button>
            </td>
          </tr>
        `;
      }).join('');
    },

    async saveModuleApprovalConfig(moduleKey) {
      const ops = [];
      document.querySelectorAll(`[data-cfg-mod="${moduleKey}"]:checked`).forEach((cb) => {
        ops.push(cb.getAttribute('data-cfg-op'));
      });

      const requires_approval = ops.length > 0;
      try {
        await AdminApp.api('/api/admin/approvals/configs', {
          method: 'POST',
          body: JSON.stringify({
            module: moduleKey,
            requires_approval,
            operations: ops,
          }),
        });
        AdminApp.toast(`Approval rules for ${moduleKey} updated successfully.`, 'success');
        await this.load();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to update approval config', 'error');
      }
    },
  };
})();

