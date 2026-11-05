/**
 * MARJAAH QATAR — Admin Dashboard & Analytics Controller (Requirement 10 & 14)
 * Handles real-time KPI metrics, time-series SVG revenue charts, status breakdowns, and immutable audit logs.
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. EXECUTIVE DASHBOARD & ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════
  window.AdminDashboard = {
    stats: null,

    async load() {
      try {
        const data = await AdminApp.api('/api/admin/dashboard');
        this.stats = data;
        this.renderKPIs();
        this.renderRevenueChart();
        this.renderStatusBreakdown();
        this.renderCategoryDistribution();
        this.renderTopProducts();
        this.renderTrafficMetrics();
        await this.renderCustomerDiagrams();
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      }
    },

    renderKPIs() {
      if (!this.stats) return;

      const k = this.stats.kpis || this.stats;

      const revEl = document.getElementById('kpi-gross-revenue');
      const ordersEl = document.getElementById('kpi-total-orders');
      const aovEl = document.getElementById('kpi-aov');
      const prodsEl = document.getElementById('kpi-total-products');
      const approvalsEl = document.getElementById('kpi-pending-approvals');
      const staffEl = document.getElementById('kpi-active-staff');

      if (revEl) revEl.textContent = `${Number(k.totalRevenue || k.gross_revenue || k.revenue || 0).toLocaleString()} QAR`;
      if (ordersEl) ordersEl.textContent = Number(k.totalOrders || k.total_orders || k.orders || 0).toLocaleString();
      if (aovEl) aovEl.textContent = `${Number(k.averageOrderValue || k.average_order_value || k.aov || 0).toFixed(0)} QAR`;
      if (prodsEl) prodsEl.textContent = Number(k.totalProducts || k.total_products || k.products || 0).toLocaleString();
      if (approvalsEl) approvalsEl.textContent = Number(k.pendingApprovals || k.pending_approvals || 0).toLocaleString();
      if (staffEl) staffEl.textContent = Number(k.active_staff || 1).toLocaleString();
    },

    renderRevenueChart() {
      const container = document.getElementById('revenue-chart-container');
      if (!container || !this.stats) return;

      const timeline = this.stats.salesTimeline || this.stats.revenue_timeline || this.stats.daily_revenue || [];
      if (timeline.length === 0) {
        container.innerHTML = `<div class="h-48 flex items-center justify-center text-xs text-slate-500 italic">No revenue data recorded yet for the selected period.</div>`;
        return;
      }

      const maxVal = Math.max(...timeline.map((t) => Number(t.revenue || t.amount || 0)), 100);
      const points = timeline.map((t, idx) => {
        const x = (idx / Math.max(timeline.length - 1, 1)) * 100;
        const rev = Number(t.revenue || t.amount || 0);
        // Generous headroom: baseline 88, peak at 20 leaves 20% safe clearance so peaks never clip
        const y = 88 - (rev / maxVal) * 66;
        return { x, y, rev, date: t.date || `Day ${idx + 1}` };
      });

      const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const fillPath = `0,95 ${polylinePoints} 100,95`;

      container.innerHTML = `
        <div class="relative w-full h-56 pt-3 pb-6">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#4F46E5" stop-opacity="0.4" />
                <stop offset="100%" stop-color="#4F46E5" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <polygon points="${fillPath}" fill="url(#chartGradient)" />
            <polyline points="${polylinePoints}" fill="none" stroke="#6366F1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            ${points.map((p) => `
              <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2" fill="#818CF8" class="transition-all hover:r-3 cursor-pointer">
                <title>${p.date}: ${p.rev.toLocaleString()} QAR</title>
              </circle>
            `).join('')}
          </svg>
          <div class="flex items-center justify-between text-[10px] text-slate-400 mt-3 font-mono">
            <span>${points[0]?.date || ''}</span>
            <span class="text-indigo-300 font-bold">Peak: ${maxVal.toLocaleString()} QAR</span>
            <span>${points[points.length - 1]?.date || ''}</span>
          </div>
        </div>
      `;
    },

    renderStatusBreakdown() {
      const container = document.getElementById('order-status-breakdown');
      if (!container || !this.stats) return;

      const breakdown = this.stats.orderStatuses || this.stats.status_breakdown || {};
      const total = Object.values(breakdown).reduce((a, b) => a + Number(b), 0) || 1;

      const statuses = [
        { key: 'delivered', label: 'Delivered', color: 'bg-emerald-500' },
        { key: 'shipped', label: 'Shipped / Out for Delivery', color: 'bg-purple-500' },
        { key: 'processing', label: 'Processing & QC', color: 'bg-amber-500' },
        { key: 'placed', label: 'Placed / New', color: 'bg-blue-500' },
        { key: 'cancelled', label: 'Cancelled', color: 'bg-rose-500' },
      ];

      container.innerHTML = statuses.map((st) => {
        const count = Number(breakdown[st.key] || 0);
        const pct = Math.round((count / total) * 100);
        return `
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs font-semibold gap-2">
              <span class="text-slate-300 flex items-center gap-2 truncate min-w-0">
                <span class="w-2 h-2 rounded-full flex-shrink-0 ${st.color}"></span>
                <span class="truncate">${st.label}</span>
              </span>
              <span class="text-white font-mono flex-shrink-0 whitespace-nowrap text-right text-xs">${count} <span class="text-slate-500 text-[10px]">(${pct}%)</span></span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div class="h-full rounded-full ${st.color}" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    },

    renderCategoryDistribution() {
      const container = document.getElementById('category-distribution-container');
      if (!container || !this.stats) return;

      const cats = this.stats.categoryDistribution || this.stats.category_breakdown || [];
      if (cats.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 italic py-4 text-center">No category distribution data.</p>`;
        return;
      }

      const totalProds = cats.reduce((acc, c) => acc + (c.count || 0), 0) || 1;

      container.innerHTML = cats.slice(0, 5).map((c) => {
        const pct = Math.round(((c.count || 0) / totalProds) * 100);
        return `
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs font-medium gap-2">
              <span class="text-slate-300 truncate min-w-0 text-xs" title="${c.name || c.category}">${c.name || c.category}</span>
              <span class="text-white font-mono text-[11px] flex-shrink-0 whitespace-nowrap">${c.count || 0} items</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div class="h-full rounded-full bg-indigo-500" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    },

    renderTopProducts() {
      const container = document.getElementById('top-products-tbody');
      if (!container || !this.stats) return;

      const topList = this.stats.bestSellers || this.stats.top_products || [];
      if (topList.length === 0) {
        container.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-xs text-slate-500 italic">No sales recorded yet.</td></tr>`;
        return;
      }

      container.innerHTML = topList.slice(0, 5).map((p, idx) => `
        <tr class="border-b border-slate-800/40 hover:bg-slate-800/20 text-xs transition">
          <td class="py-2.5 px-1 font-mono font-bold text-slate-500 w-6 text-center">#${idx + 1}</td>
          <td class="py-2.5 px-2 min-w-0">
            <div class="flex items-center gap-2.5 min-w-0">
              <img src="${p.image || '/assets/images/products/placeholder.svg'}" class="w-8 h-8 rounded-lg object-cover border border-slate-800 flex-shrink-0" onerror="this.src='/assets/images/products/placeholder.svg'" />
              <div class="min-w-0 flex-1">
                <span class="font-bold text-white block truncate text-xs" title="${p.name}">${p.name}</span>
                <span class="text-[10px] text-slate-400 block truncate">${p.brand || 'Catalog item'}</span>
              </div>
            </div>
          </td>
          <td class="py-2.5 px-2 text-right whitespace-nowrap">
            <div class="font-mono font-bold text-white text-xs">${Number(p.revenue || p.price || 0).toLocaleString()} <span class="text-[10px] text-slate-400 font-normal">QAR</span></div>
            <div class="text-[10px] text-indigo-400 font-semibold">${p.quantity || p.units_sold || p.count || 1} sold</div>
          </td>
        </tr>
      `).join('');
    },

    renderTrafficMetrics() {
      const visitorsEl = document.getElementById('kpi-traffic-visitors');
      const pageviewsEl = document.getElementById('kpi-traffic-pageviews');
      const mobileShareEl = document.getElementById('kpi-traffic-mobile-share');

      if (!this.stats || !this.stats.traffic) return;
      const t = this.stats.traffic;

      if (visitorsEl) visitorsEl.textContent = (t.totalVisitors || t.visitors_today || t.visitors || 0).toLocaleString();
      if (pageviewsEl) pageviewsEl.textContent = (t.totalViews || t.page_views_today || t.pageviews || 0).toLocaleString();
      if (mobileShareEl) mobileShareEl.textContent = `${t.mobile_percentage || 68}%`;
    },

    async renderCustomerDiagrams() {
      let metrics = this.stats?.customerMetrics;
      if (!metrics) {
        try {
          metrics = await AdminApp.api('/api/admin/customers/analytics');
        } catch (e) {
          console.warn('Failed to load customer analytics for dashboard diagrams:', e);
        }
      }
      if (!metrics) return;

      this.renderPresenceDiagram('dashboard-customer-presence-chart', 'dashboard-online-badge', metrics);
      this.renderFrequencyDiagram('dashboard-customer-frequency-chart', metrics);
    },

    renderPresenceDiagram(containerId, badgeId, metrics) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const pb = metrics.presence_breakdown || {
        online: metrics.online_customers || 0,
        active_today: metrics.recently_active || 0,
        active_week: 0,
        idle: metrics.offline_customers || 0,
      };

      const total = Math.max(metrics.total_customers || 0, 1);
      const online = pb.online || 0;
      const activeToday = pb.active_today || 0;
      const activeWeek = pb.active_week || 0;
      const idle = pb.idle || 0;

      if (badgeId) {
        const badge = document.getElementById(badgeId);
        if (badge) {
          badge.textContent = `${online} Online`;
        }
      }

      const slices = [
        { key: 'online', val: online, color: '#10B981', label: 'Online (≤15m)', desc: 'Live authenticated presence' },
        { key: 'active_today', val: activeToday, color: '#06B6D4', label: 'Active Today', desc: 'Seen within 24 hours' },
        { key: 'active_week', val: activeWeek, color: '#8B5CF6', label: 'Active 7 Days', desc: 'Seen within 7 days' },
        { key: 'idle', val: idle, color: '#475569', label: 'Idle / Inactive', desc: 'No recent activity' },
      ];

      const R = 38;
      const C = 2 * Math.PI * R;
      let offset = 0;
      const circles = [];

      slices.forEach((s) => {
        if (s.val > 0) {
          const pct = s.val / total;
          const dash = pct * C;
          circles.push(`
            <circle cx="50" cy="50" r="${R}" fill="none" stroke="${s.color}" stroke-width="8.5"
              stroke-dasharray="${dash.toFixed(2)} ${C.toFixed(2)}"
              stroke-dashoffset="${(-offset).toFixed(2)}"
              transform="rotate(-90 50 50)"
              class="transition-all duration-500 hover:opacity-80">
              <title>${s.label}: ${s.val} (${Math.round(pct * 100)}%)</title>
            </circle>
          `);
          offset += dash;
        }
      });

      if (circles.length === 0) {
        circles.push(`<circle cx="50" cy="50" r="${R}" fill="none" stroke="#334155" stroke-width="8.5" stroke-dasharray="${C.toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 50 50)"></circle>`);
      }

      // Calculated retention & engagement stats for bottom section
      const activeCount = online + activeToday + activeWeek;
      const activePct = Math.round((activeCount / total) * 100);
      const dormantPct = 100 - activePct;

      const fb = metrics.frequency_breakdown || {};
      const buyersCount = (fb.single_order || 0) + (fb.repeat_buyer || 0) + (fb.vip_buyer || 0);
      const buyerPct = Math.round((buyersCount / total) * 100);
      const totalRev = Number(metrics.total_revenue || 0).toLocaleString();

      container.innerHTML = `
        <div class="space-y-4">
          <!-- Top Section: Donut + 4 Slices Grid -->
          <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div class="relative w-36 h-36 flex-shrink-0">
              <svg viewBox="0 0 100 100" class="w-full h-full transform transition-all duration-300">
                <circle cx="50" cy="50" r="${R}" fill="none" stroke="#1E293B" stroke-width="8.5"></circle>
                ${circles.join('')}
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span class="text-xl sm:text-2xl font-black text-white font-mono leading-none">${metrics.total_customers || 0}</span>
                <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold mt-1">Users</span>
                <span class="inline-flex items-center gap-1 text-[8px] font-bold ${online > 0 ? 'text-emerald-400' : 'text-slate-400'} mt-1">
                  <span class="w-1.5 h-1.5 rounded-full ${online > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}"></span>
                  ${online} online
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5 flex-1 w-full min-w-0">
              ${slices.map((s) => {
                const pct = Math.round((s.val / total) * 100);
                return `
                  <div class="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 min-w-0 hover:border-slate-700/60 transition">
                    <div class="flex items-center gap-1.5 mb-1">
                      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background-color: ${s.color};"></span>
                      <span class="text-[11px] font-semibold text-slate-300 truncate" title="${s.label}">${s.label}</span>
                    </div>
                    <div class="flex items-baseline justify-between gap-1">
                      <span class="text-sm sm:text-base font-black text-white font-mono leading-none">${s.val}</span>
                      <span class="text-[10px] text-slate-400 font-mono">${pct}%</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Bottom Section: Customer Base Health & Activity Pulse (Eliminates Blank Space) -->
          <div class="pt-3 border-t border-slate-800/80 space-y-2.5">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="font-bold text-white text-[11px]">Customer Base Activity</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">${activePct}% Engaged</span>
              </div>
              <span class="text-[10px] text-slate-400 font-mono">${activeCount} Active &bull; ${idle} Dormant</span>
            </div>
            
            <!-- Segmented Dual Progress Bar -->
            <div class="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden flex">
              <div class="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-500" style="width: ${activePct}%" title="Engaged Users: ${activeCount} (${activePct}%)"></div>
              <div class="h-full bg-slate-700/70 transition-all duration-500" style="width: ${dormantPct}%" title="Dormant Users: ${idle} (${dormantPct}%)"></div>
            </div>

            <!-- 3 High-Value Metric Tiles -->
            <div class="grid grid-cols-3 gap-2 pt-1">
              <div class="p-2 sm:p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
                <span class="text-[9px] uppercase font-bold text-slate-400 block truncate">Active Ratio</span>
                <span class="text-xs sm:text-sm font-black text-emerald-400 font-mono">${activePct}%</span>
                <span class="text-[8px] text-slate-500 block truncate">Within 7d</span>
              </div>
              <div class="p-2 sm:p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
                <span class="text-[9px] uppercase font-bold text-slate-400 block truncate">Buyer Ratio</span>
                <span class="text-xs sm:text-sm font-black text-cyan-400 font-mono">${buyerPct}%</span>
                <span class="text-[8px] text-slate-500 block truncate">&ge; 1 Order</span>
              </div>
              <div class="p-2 sm:p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
                <span class="text-[9px] uppercase font-bold text-slate-400 block truncate">Total Spend</span>
                <span class="text-xs sm:text-sm font-black text-amber-400 font-mono truncate block">${totalRev} <span class="text-[9px] font-sans font-normal">QAR</span></span>
                <span class="text-[8px] text-slate-500 block truncate">Lifetime</span>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    renderFrequencyDiagram(containerId, metrics) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const daily = metrics.daily_activity || [];
      const fb = metrics.frequency_breakdown || {
        prospective: 0,
        single_order: 0,
        repeat_buyer: 0,
        vip_buyer: 0,
      };

      const total = Math.max(metrics.total_customers || 0, 1);
      const maxDaily = Math.max(...daily.map((d) => d.active_count || 0), 1);
      const total7d = daily.reduce((sum, d) => sum + (d.active_count || 0), 0);
      const avg7d = (total7d / Math.max(daily.length, 1)).toFixed(1);

      const chartWidth = 280;
      const chartHeight = 90;
      const barWidth = 22;
      const spacing = 38;
      const startX = 14;

      const bars = daily.map((d, i) => {
        const x = startX + i * spacing;
        const cnt = d.active_count || 0;
        const barH = cnt > 0 ? Math.max(8, (cnt / maxDaily) * 48) : 0;
        const y = 62 - barH;
        const label = d.label || '';
        return `
          <g class="transition-all duration-300 group">
            <!-- Background Column Track (eliminates blank gap on 0-value days) -->
            <rect x="${x}" y="12" width="${barWidth}" height="50" rx="4" fill="#1E293B" opacity="0.6" stroke="#334155" stroke-width="0.5" stroke-dasharray="2 2" />
            
            ${cnt > 0 ? `
              <!-- Active Gradient Bar -->
              <rect x="${x}" y="${y.toFixed(1)}" width="${barWidth}" height="${barH.toFixed(1)}" rx="4" fill="url(#barGradIndigo)" class="group-hover:opacity-90 transition cursor-pointer">
                <title>${d.date}: ${cnt} active customers, ${d.new_count || 0} newly registered</title>
              </rect>
              <text x="${x + barWidth / 2}" y="${(y - 3).toFixed(1)}" text-anchor="middle" font-size="9" font-family="monospace" fill="#C7D2FE" font-weight="bold">${cnt}</text>
            ` : `
              <!-- Subtle Baseline Pip for zero days -->
              <rect x="${x + 4}" y="60" width="${barWidth - 8}" height="2" rx="1" fill="#475569" opacity="0.5">
                <title>${d.date}: 0 active sessions</title>
              </rect>
            `}
            <text x="${x + barWidth / 2}" y="77" text-anchor="middle" font-size="9" font-family="monospace" fill="#94A3B8" font-weight="600">${label}</text>
          </g>
        `;
      });

      const buyersCount = (fb.single_order || 0) + (fb.repeat_buyer || 0) + (fb.vip_buyer || 0);
      const buyerPct = Math.round((buyersCount / total) * 100);

      const segments = [
        { label: 'Prospective (0 orders)', tag: 'Prospect', tagBg: 'bg-slate-800 text-slate-400 border-slate-700/60', val: fb.prospective || 0, color: '#64748B' },
        { label: '1st Time Buyer (1 order)', tag: '1st Order', tagBg: 'bg-sky-950/60 text-sky-400 border-sky-800/40', val: fb.single_order || 0, color: '#38BDF8' },
        { label: 'Repeat Buyer (2–4 orders)', tag: 'Repeat', tagBg: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/40', val: fb.repeat_buyer || 0, color: '#818CF8' },
        { label: 'VIP Buyer (5+ orders)', tag: 'VIP Whale', tagBg: 'bg-amber-950/60 text-amber-400 border-amber-800/40', val: fb.vip_buyer || 0, color: '#F59E0B' },
      ];

      container.innerHTML = `
        <div class="space-y-3">
          <!-- 7-Day Active Sessions Box -->
          <div class="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <div class="flex items-center justify-between text-[11px] mb-1.5 font-medium text-slate-300">
              <span class="flex items-center gap-1.5 font-bold">
                <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                7-Day Daily Active Sessions
              </span>
              <span class="text-[10px] text-slate-400 font-mono">Total: <strong class="text-white">${total7d}</strong> &bull; Peak: <strong class="text-indigo-300">${maxDaily}</strong>/day</span>
            </div>
            <div class="w-full flex justify-center overflow-x-auto">
              <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="w-full max-w-sm h-20 overflow-visible">
                <defs>
                  <linearGradient id="barGradIndigo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#818CF8" />
                    <stop offset="100%" stop-color="#4F46E5" />
                  </linearGradient>
                </defs>
                <!-- Subtle gridline -->
                <line x1="10" y1="62" x2="270" y2="62" stroke="#334155" stroke-width="1" opacity="0.6" />
                ${bars.join('')}
              </svg>
            </div>
          </div>

          <!-- Customer Order Frequency Breakdown -->
          <div class="space-y-1.5 pt-0.5">
            <div class="text-[11px] font-bold text-slate-300 flex items-center justify-between">
              <span>Customer Order Frequency</span>
              <span class="text-[10px] font-normal text-slate-400">Database Lifetime</span>
            </div>
            ${segments.map((seg) => {
              const pct = Math.round((seg.val / total) * 100);
              return `
                <div class="space-y-0.5">
                  <div class="flex items-center justify-between text-[11px]">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${seg.color}"></span>
                      <span class="text-slate-300 truncate">${seg.label}</span>
                      <span class="text-[9px] px-1 py-0.2 rounded border font-semibold ${seg.tagBg} hidden sm:inline">${seg.tag}</span>
                    </div>
                    <span class="font-mono text-white text-[11px] flex-shrink-0 ml-1">${seg.val} <span class="text-slate-500 text-[10px]">(${pct}%)</span></span>
                  </div>
                  <div class="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${pct}%; background-color: ${seg.color};"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Bottom Highlight: Buyer Conversion Rate Banner -->
          <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm">🛍️</span>
              <div class="min-w-0">
                <span class="text-[10px] font-bold text-white block truncate">Buyer Conversion Rate</span>
                <span class="text-[9px] text-slate-400 block truncate">${buyersCount} of ${total} customers placed orders</span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <span class="text-xs sm:text-sm font-black text-indigo-400 font-mono">${buyerPct}%</span>
              <span class="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Converted</span>
            </div>
          </div>
        </div>
      `;
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. IMMUTABLE AUDIT TRAIL (Requirement 2.6 & 14)
  // ═══════════════════════════════════════════════════════════════════════════
  window.AdminAudit = {
    logs: [],

    async load() {
      const container = document.getElementById('audit-table-body');
      if (container) {
        container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-slate-400">Loading immutable audit logs...</td></tr>`;
      }

      try {
        const data = await AdminApp.api('/api/admin/audit-logs?limit=50');
        this.logs = data.logs || data.items || data || [];
        this.renderTable();
      } catch (err) {
        console.error('Failed to load audit logs:', err);
        if (container) {
          container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-rose-400">Failed to load audit logs.</td></tr>`;
        }
      }
    },

    renderTable() {
      const container = document.getElementById('audit-table-body');
      if (!container) return;

      if (this.logs.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-xs text-slate-400">No administrative events recorded yet.</td></tr>`;
        return;
      }

      container.innerHTML = this.logs.map((l) => {
        const timeStr = l.created_at ? new Date(l.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' }) : '—';
        const actionBadges = {
          create: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          update: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          delete: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          approve: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          reject: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        };
        const actionKey = (l.action || 'action').toLowerCase();
        const badgeClass = actionBadges[actionKey] || 'bg-slate-700/30 text-slate-300 border-slate-700';

        return `
          <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors text-xs">
            <td class="py-3 px-4 font-mono text-slate-400">${timeStr}</td>
            <td class="py-3 px-4 font-bold text-white">@${l.user_username || l.user_id || 'admin'}</td>
            <td class="py-3 px-4">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">
                ${(l.action || 'EVENT').toUpperCase()}
              </span>
            </td>
            <td class="py-3 px-4">
              <span class="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-bold uppercase text-[10px] text-slate-300">${l.module || 'SYSTEM'}</span>
            </td>
            <td class="py-3 px-4 text-slate-300 truncate max-w-xs font-mono text-[11px]">${l.target_id || l.resource || '—'}</td>
            <td class="py-3 px-4 text-right">
              <button type="button" onclick="AdminAudit.openPayloadModal('${l.id}')" class="px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-700 text-[11px] font-bold text-indigo-300 hover:text-white transition cursor-pointer">
                Inspect Payload
              </button>
            </td>
          </tr>
        `;
      }).join('');
    },

    openPayloadModal(logId) {
      const l = this.logs.find((x) => x.id === logId);
      if (!l) return;

      document.getElementById('audit-modal-title').textContent = `Audit Log #${l.id} — ${l.module} (${l.action})`;
      const jsonEl = document.getElementById('audit-modal-json');
      if (jsonEl) {
        jsonEl.textContent = JSON.stringify(l, null, 2);
      }
      document.getElementById('audit-modal').classList.remove('hidden');
    },

    closePayloadModal() {
      document.getElementById('audit-modal').classList.add('hidden');
    },
  };
})();
