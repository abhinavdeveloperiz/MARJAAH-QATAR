/**
 * MARJAAH QATAR — Customer Analytics & Management Controller (Requirement 2)
 * Handles customer overview KPIs, presence tracking (Online/Offline), server-side pagination,
 * customer profile drawers, order history, and account suspension/activation.
 */

(function () {
  'use strict';

  window.AdminCustomers = {
    customers: [],
    analytics: null,
    selectedCustomer: null,
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    searchDebounceTimer: null,
    abortController: null,

    filters: {
      search: '',
      presence: 'all',
      status: 'all',
      date_range: 'all',
      sort_by: 'created_at',
      sort_dir: 'desc',
    },

    async load() {
      this.bindEventsOnce();
      this.updateFilterMenuUI();
      await Promise.allSettled([
        this.loadAnalytics(),
        this.loadCustomers(),
      ]);
    },

    // ── 1. CUSTOMER OVERVIEW DASHBOARD (Requirement 2.A) ──
    async loadAnalytics() {
      try {
        const data = await AdminApp.api('/api/admin/customers/analytics');
        this.analytics = data;
        this.renderAnalytics();
      } catch (err) {
        console.error('Failed to load customer analytics:', err);
      }
    },

    renderAnalytics() {
      if (!this.analytics) return;
      const a = this.analytics;

      const totalEl = document.getElementById('kpi-cust-total');
      const activeEl = document.getElementById('kpi-cust-active');
      const onlineEl = document.getElementById('kpi-cust-online');
      const offlineEl = document.getElementById('kpi-cust-offline');
      const newEl = document.getElementById('kpi-cust-new');
      const retEl = document.getElementById('kpi-cust-returning');
      const recentEl = document.getElementById('kpi-cust-recent');
      const badgeOnline = document.getElementById('badge-online-customers');

      if (totalEl) totalEl.textContent = Number(a.total_customers || 0).toLocaleString();
      if (activeEl) activeEl.textContent = Number(a.active_customers || 0).toLocaleString();
      if (onlineEl) onlineEl.textContent = Number(a.online_customers || 0).toLocaleString();
      if (offlineEl) offlineEl.textContent = Number(a.offline_customers || 0).toLocaleString();
      if (newEl) newEl.textContent = Number(a.new_customers || 0).toLocaleString();
      if (retEl) retEl.textContent = Number(a.returning_customers || 0).toLocaleString();
      if (recentEl) recentEl.textContent = Number(a.recently_active || 0).toLocaleString();

      if (badgeOnline) {
        const count = a.online_customers || 0;
        badgeOnline.textContent = `${count} Online`;
        badgeOnline.style.display = count > 0 ? 'inline-flex' : 'none';
      }

      if (window.AdminDashboard) {
        AdminDashboard.renderPresenceDiagram('customers-presence-chart', 'customers-online-badge-text', a);
        AdminDashboard.renderFrequencyDiagram('customers-frequency-chart', a);
      }
    },

    // ── 2. PAGINATED CUSTOMER DIRECTORY (Requirements 2.B & 2.E) ──
    async loadCustomers() {
      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();
      const signal = this.abortController.signal;

      const tbody = document.getElementById('customers-table-body');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-xs text-slate-400"><div class="flex items-center justify-center gap-2"><span class="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span> Searching directory...</div></td></tr>`;
      }

      const params = new URLSearchParams({
        page: String(this.page),
        limit: String(this.limit),
        search: this.filters.search,
        presence: this.filters.presence,
        status: this.filters.status,
        date_range: this.filters.date_range,
        sort_by: this.filters.sort_by,
        sort_dir: this.filters.sort_dir,
      });

      try {
        const data = await AdminApp.api(`/api/admin/customers?${params.toString()}`, { signal });
        this.customers = data.items || [];
        this.total = data.total || 0;
        this.page = data.page || 1;
        this.totalPages = data.totalPages || 1;
        this.renderTable();
        this.renderPagination();
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load customers:', err);
        if (tbody) {
          tbody.innerHTML = `
            <tr>
              <td colspan="7" class="py-10 text-center text-xs">
                <div class="inline-flex flex-col items-center gap-2 max-w-sm mx-auto p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                  <span class="font-bold">Failed to load customers (${err.message})</span>
                  <p class="text-[11px] text-slate-400">The server may be warming up or temporarily busy.</p>
                  <button type="button" onclick="AdminCustomers.loadCustomers()" class="mt-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer">
                    &#x21bb; Retry Loading
                  </button>
                </div>
              </td>
            </tr>
          `;
        }
      }
    },

    renderTable() {
      const tbody = document.getElementById('customers-table-body');
      if (!tbody) return;

      if (this.customers.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="py-12 text-center text-xs text-slate-400">
              <svg class="mx-auto mb-2 text-slate-600" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              No customers found matching the selected search or filter criteria.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = this.customers.map((c) => {
        const name = c.name || c.username || 'Customer';
        const initial = name.charAt(0).toUpperCase();
        const avatarHtml = c.avatar
          ? `<img src="${c.avatar}" class="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-800" onerror="this.outerHTML='<div class=\\'w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center text-xs\\'>${initial}</div>'" />`
          : `<div class="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center text-xs flex-shrink-0">${initial}</div>`;

        const isOnline = Boolean(c.is_online);
        const presenceBadge = isOnline
          ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Online Now</span>`
          : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/80"><span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>Offline</span>`;

        const lastSeenText = this.formatRelativeTime(c.last_seen);
        const joinedDate = c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        const isSuspended = c.status === 'suspended';
        const statusBadge = isSuspended
          ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">Suspended</span>`
          : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Active</span>`;

        return `
          <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors text-xs">
            <!-- Customer -->
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                ${avatarHtml}
                <div class="min-w-0">
                  <button type="button" onclick="AdminCustomers.viewDetails('${c.id}')" class="font-bold text-white hover:text-indigo-400 transition text-left block truncate max-w-[180px] cursor-pointer">
                    ${name}
                  </button>
                  <span class="text-[10px] text-slate-500 font-mono block truncate">@${c.username || c.id}</span>
                </div>
              </div>
            </td>

            <!-- Contact -->
            <td class="py-3 px-4">
              <div class="min-w-0">
                <span class="text-slate-300 block truncate max-w-[200px]">${c.email || '—'}</span>
                <span class="text-[11px] text-slate-500 font-mono block">${c.phone || '—'}</span>
              </div>
            </td>

            <!-- Presence & Last Seen -->
            <td class="py-3 px-4 whitespace-nowrap">
              <div class="space-y-0.5">
                ${presenceBadge}
                <span class="text-[10px] text-slate-500 block">${lastSeenText}</span>
              </div>
            </td>

            <!-- Joined Date -->
            <td class="py-3 px-4 whitespace-nowrap text-slate-400 font-mono">
              ${joinedDate}
            </td>

            <!-- Orders & Spend -->
            <td class="py-3 px-4 text-center whitespace-nowrap">
              <div class="space-y-0.5">
                <span class="font-bold text-white text-xs">${Number(c.total_orders || 0)} orders</span>
                <span class="text-[11px] font-bold text-indigo-300 font-mono block">${Number(c.total_spent || 0).toLocaleString()} QAR</span>
              </div>
            </td>

            <!-- Status -->
            <td class="py-3 px-4 text-center whitespace-nowrap">
              ${statusBadge}
            </td>

            <!-- Actions: Pop-up Menu Button -->
            <td class="py-3 px-4 text-right whitespace-nowrap relative">
              <div class="inline-flex items-center gap-1.5 justify-end">
                <button type="button" onclick="AdminCustomers.viewDetails('${c.id}')" title="Quick View" class="p-1.5 rounded-lg border border-admin-border hover:bg-white/5 text-slate-300 hover:text-white transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>

                <div class="relative inline-block text-left">
                  <button type="button" onclick="AdminCustomers.toggleRowMenu(event, '${c.id}')" title="Customer Options" class="px-2 py-1.5 rounded-lg border border-admin-border hover:bg-white/5 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                    </svg>
                    <span class="text-[11px] font-medium hidden sm:inline">Options</span>
                  </button>

                  <div id="row-menu-${c.id}" class="hidden absolute right-0 mt-1 w-52 rounded-xl bg-[#0F172A] border border-slate-700 shadow-2xl py-1 z-50 text-left backdrop-blur-xl">
                    <button type="button" onclick="AdminCustomers.viewDetails('${c.id}'); AdminCustomers.closeRowMenus();" class="w-full px-3 py-2 text-xs text-left text-slate-200 hover:bg-indigo-600/20 hover:text-white flex items-center gap-2 cursor-pointer transition">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span>View Profile &amp; Orders</span>
                    </button>
                    ${c.phone ? `
                      <a href="https://wa.me/${c.phone.replace(/[^0-9]/g, '')}" target="_blank" onclick="AdminCustomers.closeRowMenus()" class="w-full px-3 py-2 text-xs text-left text-slate-200 hover:bg-emerald-600/20 hover:text-emerald-300 flex items-center gap-2 transition">
                        <span class="text-emerald-400 font-bold">💬</span> WhatsApp Customer
                      </a>
                    ` : ''}
                    ${c.email ? `
                      <a href="mailto:${c.email}" onclick="AdminCustomers.closeRowMenus()" class="w-full px-3 py-2 text-xs text-left text-slate-200 hover:bg-indigo-600/20 hover:text-white flex items-center gap-2 transition">
                        <span class="text-indigo-400 font-bold">✉️</span> Email Customer
                      </a>
                    ` : ''}
                    <button type="button" onclick="AdminCustomers.toggleStatus('${c.id}', '${c.status || 'active'}'); AdminCustomers.closeRowMenus();" class="w-full px-3 py-2 text-xs text-left ${isSuspended ? 'text-emerald-400 hover:bg-emerald-600/20' : 'text-rose-400 hover:bg-rose-600/20'} flex items-center gap-2 cursor-pointer transition">
                      <span>${isSuspended ? '✓' : '⊘'}</span> ${isSuspended ? 'Reactivate Account' : 'Suspend Account'}
                    </button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    renderPagination() {
      const infoEl = document.getElementById('customers-pagination-info');
      const pageEl = document.getElementById('customers-current-page');
      const prevBtn = document.getElementById('customers-prev-btn');
      const nextBtn = document.getElementById('customers-next-btn');

      const start = this.total === 0 ? 0 : (this.page - 1) * this.limit + 1;
      const end = Math.min(this.page * this.limit, this.total);

      if (infoEl) infoEl.textContent = `Showing ${start}–${end} of ${this.total} customers`;
      if (pageEl) pageEl.textContent = `${this.page} / ${this.totalPages}`;
      if (prevBtn) prevBtn.disabled = this.page <= 1;
      if (nextBtn) nextBtn.disabled = this.page >= this.totalPages;
    },

    onSearchInput() {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        const val = document.getElementById('customers-search-input')?.value || '';
        this.filters.search = val.trim();
        this.page = 1;
        this.loadCustomers();
      }, 250);
    },

    // ── FILTER POP-UP MENU CONTROLS ──
    toggleFilterMenu(event) {
      if (event) event.stopPropagation();
      const popover = document.getElementById('customers-filter-popover');
      const chevron = document.getElementById('customers-filter-chevron');
      if (!popover) return;

      const isHidden = popover.classList.contains('hidden');
      if (isHidden) {
        popover.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-180');
      } else {
        popover.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
      }
    },

    closeFilterMenu() {
      const popover = document.getElementById('customers-filter-popover');
      const chevron = document.getElementById('customers-filter-chevron');
      if (popover && !popover.classList.contains('hidden')) {
        popover.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
      }
    },

    setFilter(key, value) {
      if (key === 'sort') {
        const [by, dir] = value.split('-');
        this.filters.sort_by = by;
        this.filters.sort_dir = dir || 'desc';
      } else {
        this.filters[key] = value;
      }
      this.page = 1;
      this.updateFilterMenuUI();
      this.loadCustomers();
    },

    resetFilters() {
      this.filters.presence = 'all';
      this.filters.status = 'all';
      this.filters.date_range = 'all';
      this.filters.sort_by = 'created_at';
      this.filters.sort_dir = 'desc';
      this.page = 1;
      this.updateFilterMenuUI();
      this.loadCustomers();
    },

    updateFilterMenuUI() {
      let activeCount = 0;
      if (this.filters.presence !== 'all') activeCount++;
      if (this.filters.status !== 'all') activeCount++;
      if (this.filters.date_range !== 'all') activeCount++;
      const currentSort = `${this.filters.sort_by}-${this.filters.sort_dir}`;
      if (currentSort !== 'created_at-desc') activeCount++;

      const countBadge = document.getElementById('customers-filter-active-count');
      const filterBtn = document.getElementById('customers-filter-btn');
      if (countBadge) {
        countBadge.textContent = activeCount;
        countBadge.style.display = activeCount > 0 ? 'inline-flex' : 'none';
      }
      if (filterBtn) {
        if (activeCount > 0) {
          filterBtn.classList.add('border-indigo-500', 'bg-indigo-600/10', 'text-white');
          filterBtn.classList.remove('border-admin-border');
        } else {
          filterBtn.classList.remove('border-indigo-500', 'bg-indigo-600/10');
          filterBtn.classList.add('border-admin-border');
        }
      }

      document.querySelectorAll('[data-filter-key]').forEach((btn) => {
        const k = btn.getAttribute('data-filter-key');
        const v = btn.getAttribute('data-filter-val');
        const isSelected = (k === 'sort' && v === currentSort) || (k !== 'sort' && this.filters[k] === v);

        if (isSelected) {
          btn.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold border border-indigo-500 bg-indigo-600 text-white transition text-center cursor-pointer shadow-sm';
        } else {
          btn.className = 'px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-700/60 bg-slate-800/80 text-slate-300 hover:text-white transition text-center cursor-pointer';
        }
      });

      const pillsContainer = document.getElementById('customers-active-pills');
      if (pillsContainer) {
        if (activeCount === 0) {
          pillsContainer.innerHTML = '';
          pillsContainer.classList.add('hidden');
        } else {
          pillsContainer.classList.remove('hidden');
          const pills = [];

          if (this.filters.presence !== 'all') {
            const label = this.filters.presence === 'online' ? '🟢 Online (≤15m)' : '⚫ Offline';
            pills.push(`
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200">
                <span>Presence: <strong>${label}</strong></span>
                <button type="button" onclick="AdminCustomers.setFilter('presence', 'all')" class="hover:text-rose-400 font-bold transition cursor-pointer">&times;</button>
              </span>
            `);
          }

          if (this.filters.status !== 'all') {
            const label = this.filters.status === 'active' ? 'Active' : 'Suspended';
            pills.push(`
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200">
                <span>Status: <strong>${label}</strong></span>
                <button type="button" onclick="AdminCustomers.setFilter('status', 'all')" class="hover:text-rose-400 font-bold transition cursor-pointer">&times;</button>
              </span>
            `);
          }

          if (this.filters.date_range !== 'all') {
            const map = { today: 'Today', '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days' };
            pills.push(`
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200">
                <span>Joined: <strong>${map[this.filters.date_range] || this.filters.date_range}</strong></span>
                <button type="button" onclick="AdminCustomers.setFilter('date_range', 'all')" class="hover:text-rose-400 font-bold transition cursor-pointer">&times;</button>
              </span>
            `);
          }

          if (currentSort !== 'created_at-desc') {
            const sortMap = {
              'created_at-asc': 'Oldest First',
              'last_seen-desc': 'Recently Active',
              'spent-desc': 'Highest Spent',
              'orders-desc': 'Most Orders',
              'name-asc': 'Name (A-Z)'
            };
            pills.push(`
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200">
                <span>Sort: <strong>${sortMap[currentSort] || currentSort}</strong></span>
                <button type="button" onclick="AdminCustomers.setFilter('sort', 'created_at-desc')" class="hover:text-rose-400 font-bold transition cursor-pointer">&times;</button>
              </span>
            `);
          }

          pills.push(`
            <button type="button" onclick="AdminCustomers.resetFilters()" class="text-xs text-indigo-400 hover:text-indigo-300 underline font-semibold transition ml-1 cursor-pointer">
              Clear All Filters
            </button>
          `);

          pillsContainer.innerHTML = pills.join('');
        }
      }
    },

    bindEventsOnce() {
      if (this._eventsBound) return;
      this._eventsBound = true;

      document.addEventListener('click', (e) => {
        const filterContainer = document.getElementById('customers-filter-menu-container');
        const popover = document.getElementById('customers-filter-popover');
        if (filterContainer && popover && !popover.classList.contains('hidden')) {
          if (!filterContainer.contains(e.target)) {
            this.closeFilterMenu();
          }
        }

        document.querySelectorAll('[id^="row-menu-"]').forEach((m) => {
          if (!m.classList.contains('hidden') && !m.parentElement.contains(e.target)) {
            m.classList.add('hidden');
          }
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeFilterMenu();
          this.closeRowMenus();
        }
      });
    },

    toggleRowMenu(event, customerId) {
      if (event) event.stopPropagation();
      const menu = document.getElementById(`row-menu-${customerId}`);
      if (!menu) return;

      const isHidden = menu.classList.contains('hidden');
      this.closeRowMenus();
      if (isHidden) {
        menu.classList.remove('hidden');
      }
    },

    closeRowMenus() {
      document.querySelectorAll('[id^="row-menu-"]').forEach((m) => m.classList.add('hidden'));
    },

    onFilterChange() {
      this.loadCustomers();
    },

    onPageSizeChange() {
      const size = Number(document.getElementById('customers-page-size')?.value || 10);
      this.limit = size;
      this.page = 1;
      this.loadCustomers();
    },

    prevPage() {
      if (this.page > 1) {
        this.page--;
        this.loadCustomers();
      }
    },

    nextPage() {
      if (this.page < this.totalPages) {
        this.page++;
        this.loadCustomers();
      }
    },

    // ── 3. INDIVIDUAL CUSTOMER DETAILS (Requirement 2.C) ──
    async viewDetails(customerId) {
      const modal = document.getElementById('customer-details-modal');
      if (!modal) return;
      modal.classList.remove('hidden');

      // Set loading state
      document.getElementById('cust-modal-name').textContent = 'Loading customer profile...';
      document.getElementById('cust-modal-email').textContent = '';
      document.getElementById('cust-modal-orders-list').innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">Loading order history...</td></tr>`;

      try {
        const cust = await AdminApp.api(`/api/admin/customers/${customerId}`);
        this.selectedCustomer = cust;

        const name = cust.name || cust.username || 'Customer';
        const initial = name.charAt(0).toUpperCase();

        const avatarEl = document.getElementById('cust-modal-avatar');
        if (avatarEl) {
          if (cust.avatar) {
            avatarEl.innerHTML = `<img src="${cust.avatar}" class="w-full h-full object-cover" />`;
          } else {
            avatarEl.textContent = initial;
          }
        }

        document.getElementById('cust-modal-name').textContent = name;
        document.getElementById('cust-modal-email').textContent = cust.email || '—';
        document.getElementById('cust-modal-phone').textContent = cust.phone || '—';
        document.getElementById('cust-modal-username').textContent = cust.username ? `@${cust.username}` : '—';
        document.getElementById('cust-modal-id').textContent = cust.id;

        const isOnline = Boolean(cust.is_online);
        const presBadge = document.getElementById('cust-modal-presence-badge');
        if (presBadge) {
          presBadge.textContent = isOnline ? 'Online Now' : 'Offline';
          presBadge.className = isOnline
            ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700';
        }

        document.getElementById('cust-modal-spent').textContent = `${Number(cust.total_spent || 0).toLocaleString()} QAR`;
        document.getElementById('cust-modal-orders-count').textContent = Number(cust.total_orders || 0).toLocaleString();
        document.getElementById('cust-modal-aov').textContent = `${Number(cust.average_order_value || 0).toLocaleString()} QAR`;

        const isSuspended = cust.status === 'suspended';
        const statusText = document.getElementById('cust-modal-status-text');
        if (statusText) {
          statusText.textContent = isSuspended ? 'Suspended' : 'Active';
          statusText.className = isSuspended ? 'text-xs font-bold text-rose-400 uppercase tracking-wider mt-1' : 'text-xs font-bold text-emerald-400 uppercase tracking-wider mt-1';
        }

        const createdDate = cust.created_at ? new Date(cust.created_at).toLocaleString('en-GB') : '—';
        const lastSeenDate = cust.last_seen ? new Date(cust.last_seen).toLocaleString('en-GB') : '—';
        const lastLoginDate = cust.last_login ? new Date(cust.last_login).toLocaleString('en-GB') : '—';

        document.getElementById('cust-modal-created').textContent = createdDate;
        document.getElementById('cust-modal-last-seen').textContent = `${lastSeenDate} (${this.formatRelativeTime(cust.last_seen)})`;
        document.getElementById('cust-modal-last-login').textContent = lastLoginDate;

        // Render customer's order history
        const ordersBadge = document.getElementById('cust-modal-orders-badge');
        if (ordersBadge) ordersBadge.textContent = `${(cust.orders || []).length} total`;

        const ordersTbody = document.getElementById('cust-modal-orders-list');
        if (ordersTbody) {
          if (!cust.orders || cust.orders.length === 0) {
            ordersTbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">No orders placed by this customer yet.</td></tr>`;
          } else {
            ordersTbody.innerHTML = cust.orders.map((o) => {
              const oNum = o.order_number || o.id;
              const oDate = o.created_at ? new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
              const itemsCount = Array.isArray(o.items) ? o.items.length : (o.item_count || 1);
              const oStatus = o.status || 'placed';
              return `
                <tr class="border-b border-admin-border/50 hover:bg-white/5 transition-colors">
                  <td class="py-2.5 px-3 font-mono font-bold text-indigo-400">#${oNum}</td>
                  <td class="py-2.5 px-3 text-slate-400">${oDate}</td>
                  <td class="py-2.5 px-3 text-slate-300">${itemsCount} item${itemsCount > 1 ? 's' : ''}</td>
                  <td class="py-2.5 px-3 font-bold text-white font-mono">${Number(o.total || 0).toLocaleString()} QAR</td>
                  <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${this.getStatusBadgeClass(oStatus)}">${oStatus.toUpperCase()}</span></td>
                </tr>
              `;
            }).join('');
          }
        }

        // Toggle Status Button
        const toggleBtn = document.getElementById('cust-modal-toggle-status-btn');
        if (toggleBtn) {
          toggleBtn.textContent = isSuspended ? 'Reactivate Account' : 'Suspend Account';
          toggleBtn.className = isSuspended
            ? 'px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition cursor-pointer'
            : 'px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition cursor-pointer';
          toggleBtn.onclick = () => this.toggleStatus(cust.id, cust.status || 'active', true);
        }
      } catch (err) {
        console.error('Failed to load customer details:', err);
        AdminApp.toast(err.message || 'Failed to load customer details', 'error');
        this.closeModal();
      }
    },

    closeModal() {
      const modal = document.getElementById('customer-details-modal');
      if (modal) modal.classList.add('hidden');
      this.selectedCustomer = null;
    },

    // ── 4. STATUS TOGGLE (Suspend / Activate) ──
    async toggleStatus(customerId, currentStatus, fromModal = false) {
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
      const actionName = newStatus === 'suspended' ? 'suspend' : 'reactivate';

      if (!confirm(`Are you sure you want to ${actionName} this customer account?`)) return;

      try {
        await AdminApp.api(`/api/admin/customers/${customerId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus }),
        });

        AdminApp.toast(`Customer account successfully ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}.`, 'success');

        if (fromModal) {
          await this.viewDetails(customerId);
        }
        await this.load();
      } catch (err) {
        console.error('Failed to update customer status:', err);
        AdminApp.toast(err.message || 'Failed to update customer status', 'error');
      }
    },

    // ── 5. EXPORT CSV ──
    async exportCSV() {
      try {
        AdminApp.toast('Generating customer export CSV...', 'info');
        const data = await AdminApp.api('/api/admin/customers?limit=1000');
        const items = data.items || [];
        if (items.length === 0) {
          AdminApp.toast('No customer records to export.', 'info');
          return;
        }

        const headers = ['ID', 'Name', 'Username', 'Email', 'Phone', 'Status', 'Presence', 'Total Orders', 'Total Spent (QAR)', 'Registered Date', 'Last Seen'];
        const rows = items.map((c) => [
          `"${c.id}"`,
          `"${(c.name || '').replace(/"/g, '""')}"`,
          `"${(c.username || '').replace(/"/g, '""')}"`,
          `"${(c.email || '').replace(/"/g, '""')}"`,
          `"${(c.phone || '').replace(/"/g, '""')}"`,
          `"${c.status || 'active'}"`,
          `"${c.is_online ? 'Online' : 'Offline'}"`,
          c.total_orders || 0,
          c.total_spent || 0,
          `"${c.created_at || ''}"`,
          `"${c.last_seen || ''}"`,
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `marjaah_customers_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        AdminApp.toast('Customer CSV exported successfully.', 'success');
      } catch (err) {
        AdminApp.toast('Failed to export CSV: ' + err.message, 'error');
      }
    },

    // ── HELPERS ──
    formatRelativeTime(isoDateStr) {
      if (!isoDateStr) return 'Never seen';
      const time = new Date(isoDateStr).getTime();
      if (isNaN(time)) return 'Never seen';
      const diffMs = Date.now() - time;
      if (diffMs < 60 * 1000) return 'Just now';
      const diffMin = Math.floor(diffMs / (60 * 1000));
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays}d ago`;
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths}mo ago`;
    },

    getStatusBadgeClass(status) {
      const map = {
        placed: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        processing: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        shipped: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
        delivered: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        cancelled: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      };
      return map[status] || 'bg-slate-700 text-slate-300';
    },
  };
})();

