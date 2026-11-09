/**
 * MARJAAH QATAR — Customer Order Notifications & Real-Time Status Pop-ups
 * Handles the navbar notification bell, unread status badges, bottom-sheet pop-up notifications,
 * and the notification history drawer.
 */

(function (global) {
  'use strict';

  const CustomerNotifications = {
    notifications: [],
    pollTimer: null,
    isPanelOpen: false,

    getSeenIds() {
      try {
        return JSON.parse(localStorage.getItem('marjaah_seen_notifs') || '[]');
      } catch (e) {
        return [];
      }
    },

    saveSeenIds(ids) {
      try {
        localStorage.setItem('marjaah_seen_notifs', JSON.stringify(ids));
      } catch (e) {}
    },

    init() {
      this.injectUiComponents();
      this.bindEvents();

      if (window.api && window.api.getToken && window.api.getToken()) {
        this.fetchAndUpdate();
        this.startPolling();
      }
    },

    injectUiComponents() {
      // 1. Inject or wire up Notification Bell in main navbar
      const cartBtn = document.querySelector('[data-open-cart]');
      const navContainer = cartBtn ? cartBtn.parentElement : document.querySelector('#main-navbar .flex.items-center.gap-1\\.5');
      
      if (navContainer && !document.getElementById('customer-notification-btn')) {
        const bellWrapper = document.createElement('div');
        bellWrapper.className = 'relative flex items-center flex-shrink-0';
        bellWrapper.innerHTML = `
          <button id="customer-notification-btn" type="button" aria-label="Order Notifications"
            class="nav-btn relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer flex-shrink-0 text-slate-300 hover:text-white"
            title="Order Notifications">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
            <span id="customer-notification-badge" class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold shadow-md ring-2 ring-slate-900 hidden animate-pulse">0</span>
          </button>
        `;
        // Insert right before Cart button
        navContainer.insertBefore(bellWrapper, cartBtn);
      }

      // 2. Inject Notifications Dropdown Drawer if not already present
      if (!document.getElementById('customer-notifications-dropdown')) {
        const drawer = document.createElement('div');
        drawer.id = 'customer-notifications-dropdown';
        drawer.className = 'hidden fixed top-16 right-3 sm:right-6 md:right-16 z-[130] w-[92vw] sm:w-84 max-w-sm rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl animate-fade-in-up';
        drawer.style.background = 'var(--bg-surface, #111C38)';
        drawer.style.borderColor = 'var(--border-color, rgba(255,255,255,0.12))';
        drawer.innerHTML = `
          <div class="p-3.5 border-b flex items-center justify-between" style="border-color:var(--border-color, rgba(255,255,255,0.08))">
            <div class="flex items-center gap-2">
              <span class="text-sm">🔔</span>
              <h4 class="font-bold text-xs uppercase tracking-wider" style="color:var(--text-primary, #FFFFFF)">Order Notifications</h4>
            </div>
            <button type="button" onclick="CustomerNotifications.markAllAsRead()" class="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer">
              Mark all read
            </button>
          </div>
          <div id="customer-notifications-list" class="max-h-80 overflow-y-auto divide-y" style="divide-color:var(--border-color, rgba(255,255,255,0.06))">
            <div class="p-6 text-center text-xs text-slate-400">Loading order alerts...</div>
          </div>
          <div class="p-2.5 text-center border-t text-[11px]" style="border-color:var(--border-color, rgba(255,255,255,0.08));background:var(--bg-surface-2, rgba(0,0,0,0.2))">
            <a href="/account/?tab=orders" class="font-bold text-indigo-400 hover:underline">View All Order History →</a>
          </div>
        `;
        document.body.appendChild(drawer);
      }

      // 3. Inject Bottom-Sheet Pop-up Toast
      if (!document.getElementById('customer-bottom-sheet-notification')) {
        const bottomSheet = document.createElement('div');
        bottomSheet.id = 'customer-bottom-sheet-notification';
        bottomSheet.className = 'hidden fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto sm:max-w-md z-[120] rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 transform translate-y-10 opacity-0';
        bottomSheet.style.background = 'var(--bg-surface, #111C38)';
        bottomSheet.style.borderColor = 'var(--color-accent, #4F46E5)';
        bottomSheet.innerHTML = `
          <div class="flex items-start gap-3">
            <div id="notif-sheet-icon" class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-lg flex-shrink-0">
              📦
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span id="notif-sheet-title" class="font-bold text-xs text-white truncate">Order Status Update</span>
                <span class="text-[10px] text-slate-400 font-mono">Just now</span>
              </div>
              <p id="notif-sheet-message" class="text-xs text-slate-300 mt-1 leading-relaxed">Your order status has changed.</p>
              <div class="flex items-center gap-2 mt-3 pt-2 border-t border-slate-700/60">
                <button type="button" id="notif-sheet-action-btn" class="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition cursor-pointer">
                  View Details &amp; Invoice
                </button>
                <button type="button" onclick="CustomerNotifications.dismissBottomSheet()" class="px-2.5 py-1 text-xs text-slate-400 hover:text-white transition">
                  Dismiss
                </button>
              </div>
            </div>
            <button type="button" onclick="CustomerNotifications.dismissBottomSheet()" class="text-slate-400 hover:text-white p-1 text-sm leading-none flex-shrink-0">
              ✕
            </button>
          </div>
        `;
        document.body.appendChild(bottomSheet);
      }
    },

    bindEvents() {
      document.addEventListener('click', (e) => {
        const btn = document.getElementById('customer-notification-btn');
        const drawer = document.getElementById('customer-notifications-dropdown');
        if (!drawer || !btn) return;

        if (btn.contains(e.target)) {
          this.togglePanel();
        } else if (!drawer.contains(e.target) && this.isPanelOpen) {
          this.closePanel();
        }
      });

      // Periodic check on window focus
      window.addEventListener('focus', () => {
        if (window.api && window.api.getToken && window.api.getToken()) {
          this.fetchAndUpdate();
        }
      });
    },

    startPolling() {
      if (this.pollTimer) clearInterval(this.pollTimer);
      // Poll every 35 seconds for live status updates from admin
      this.pollTimer = setInterval(() => {
        if (window.api && window.api.getToken && window.api.getToken()) {
          this.fetchAndUpdate();
        }
      }, 35000);
    },

    async fetchAndUpdate() {
      try {
        let res = null;
        if (window.api && typeof window.api.getOrderNotifications === 'function') {
          res = await window.api.getOrderNotifications();
        } else {
          const token = window.api ? window.api.getToken() : localStorage.getItem('marjaah_auth_token');
          if (!token) return;
          const r = await fetch('/api/orders/notifications', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (r.ok) res = await r.json();
        }

        const items = res?.notifications || [];
        this.notifications = items;

        const seenIds = new Set(this.getSeenIds());
        const unreadItems = items.filter((n) => !seenIds.has(n.id));

        // Update badge
        const badge = document.getElementById('customer-notification-badge');
        if (badge) {
          if (unreadItems.length > 0) {
            badge.textContent = unreadItems.length > 9 ? '9+' : String(unreadItems.length);
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        }

        // Render drawer items
        this.renderDrawerList(items, seenIds);

        // If there is an unread item, pop up bottom sheet notification
        if (unreadItems.length > 0) {
          const newest = unreadItems[0];
          const lastPoppedId = sessionStorage.getItem('marjaah_last_popped_notif');
          if (lastPoppedId !== newest.id) {
            this.showBottomSheet(newest);
            sessionStorage.setItem('marjaah_last_popped_notif', newest.id);
          }
        }
      } catch (err) {
        console.warn('Notifications fetch notice:', err);
      }
    },

    renderDrawerList(items, seenIds) {
      const listContainer = document.getElementById('customer-notifications-list');
      if (!listContainer) return;

      if (!items || items.length === 0) {
        listContainer.innerHTML = `
          <div class="p-6 text-center text-xs text-slate-400 space-y-1">
            <span class="text-2xl block">🎉</span>
            <p class="font-bold text-white">No alerts right now</p>
            <p class="text-[11px]">When the status of your orders change, they'll appear here.</p>
          </div>
        `;
        return;
      }

      const icons = {
        placed: '🛍️',
        pending: '⏳',
        processing: '⚙️',
        shipped: '🚚',
        delivered: '✅',
        cancelled: '❌',
        return_requested: '↩️',
        return_approved: '🎉',
        return_rejected: '⚠️',
      };

      listContainer.innerHTML = items.map((n) => {
        const isUnread = !seenIds.has(n.id);
        const icon = icons[n.type] || '📦';
        const dateStr = n.timestamp ? new Date(n.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent';

        return `
          <div class="p-3 transition-colors hover:bg-white/5 cursor-pointer ${isUnread ? 'bg-indigo-500/5' : ''}" onclick="CustomerNotifications.onNotificationClick('${n.id}', '${n.order_number}')">
            <div class="flex items-start gap-2.5">
              <span class="text-base flex-shrink-0 mt-0.5">${icon}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1">
                  <p class="font-bold text-xs truncate ${isUnread ? 'text-indigo-400' : 'text-slate-200'}">${n.title}</p>
                  ${isUnread ? '<span class="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></span>' : ''}
                </div>
                <p class="text-[11px] text-slate-400 line-clamp-2 mt-0.5">${n.message}</p>
                <div class="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                  <span class="font-mono">#${n.order_number}</span>
                  <span>${dateStr}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    showBottomSheet(notif) {
      const sheet = document.getElementById('customer-bottom-sheet-notification');
      if (!sheet) return;

      const icons = {
        placed: '🛍️',
        pending: '⏳',
        processing: '⚙️',
        shipped: '🚚',
        delivered: '✅',
        cancelled: '❌',
        return_requested: '↩️',
        return_approved: '🎉',
        return_rejected: '⚠️',
      };

      document.getElementById('notif-sheet-icon').textContent = icons[notif.type] || '📦';
      document.getElementById('notif-sheet-title').textContent = notif.title || `Order #${notif.order_number}`;
      document.getElementById('notif-sheet-message').textContent = notif.message || 'Your order status has been updated.';

      const actionBtn = document.getElementById('notif-sheet-action-btn');
      if (actionBtn) {
        actionBtn.onclick = () => {
          this.dismissBottomSheet();
          this.onNotificationClick(notif.id, notif.order_number);
        };
      }

      sheet.classList.remove('hidden');
      setTimeout(() => {
        sheet.classList.remove('translate-y-10', 'opacity-0');
        sheet.classList.add('translate-y-0', 'opacity-100');
      }, 50);

      // Auto dismiss after 8 seconds
      setTimeout(() => {
        this.dismissBottomSheet();
      }, 8000);
    },

    dismissBottomSheet() {
      const sheet = document.getElementById('customer-bottom-sheet-notification');
      if (!sheet) return;
      sheet.classList.remove('translate-y-0', 'opacity-100');
      sheet.classList.add('translate-y-10', 'opacity-0');
      setTimeout(() => {
        sheet.classList.add('hidden');
      }, 300);
    },

    togglePanel() {
      const drawer = document.getElementById('customer-notifications-dropdown');
      if (!drawer) return;
      if (this.isPanelOpen) {
        this.closePanel();
      } else {
        drawer.classList.remove('hidden');
        this.isPanelOpen = true;
      }
    },

    closePanel() {
      const drawer = document.getElementById('customer-notifications-dropdown');
      if (drawer) drawer.classList.add('hidden');
      this.isPanelOpen = false;
    },

    markAllAsRead() {
      const allIds = this.notifications.map((n) => n.id);
      this.saveSeenIds(allIds);

      const badge = document.getElementById('customer-notification-badge');
      if (badge) badge.classList.add('hidden');

      this.renderDrawerList(this.notifications, new Set(allIds));
      if (window.Toast) window.Toast.success('All notifications marked as read.');
    },

    onNotificationClick(notifId, orderNum) {
      const seen = this.getSeenIds();
      if (!seen.includes(notifId)) {
        seen.push(notifId);
        this.saveSeenIds(seen);
      }
      this.closePanel();

      // If CustomerInvoice is present, open invoice directly or navigate to account orders
      if (window.CustomerInvoice && typeof window.CustomerInvoice.open === 'function') {
        window.CustomerInvoice.open(orderNum);
      } else if (window.location.pathname.includes('/account')) {
        if (typeof window.showTab === 'function') window.showTab('orders');
      } else {
        window.location.href = `/account/?tab=orders&order=${encodeURIComponent(orderNum)}`;
      }
    },
  };

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CustomerNotifications.init());
  } else {
    CustomerNotifications.init();
  }

  global.CustomerNotifications = CustomerNotifications;
})(typeof window !== 'undefined' ? window : this);

