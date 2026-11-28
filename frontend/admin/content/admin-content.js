

(function () {
  'use strict';

  window.AdminContent = {
    banners: [],
    promotions: [],
    locations: [],
    settings: {},

    async loadBanners() {
      const container = document.getElementById('banners-table-body');
      const refreshBtn = document.getElementById('btn-refresh-banners');
      const refreshIcon = document.getElementById('btn-refresh-banners-icon');

      if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.classList.add('opacity-75', 'cursor-not-allowed');
      }
      if (refreshIcon) {
        refreshIcon.classList.add('animate-spin');
      }

      if (container) {
        container.innerHTML = `
          <tr>
            <td colspan="6" class="py-12 text-center">
              <div class="flex flex-col items-center justify-center gap-3">
                <div class="relative w-10 h-10 flex items-center justify-center">
                  <div class="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <svg class="w-4 h-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  </div>
                </div>
                <div class="text-xs font-semibold text-slate-300">Synchronizing Hero Banners...</div>
                <div class="text-[11px] text-slate-500">Retrieving live configurations from database</div>
              </div>
            </td>
          </tr>`;
      }

      try {
        const data = await AdminApp.api('/api/banners?includeInactive=true');
        this.banners = data.banners || data.items || data || [];
        this.renderBannersTable();
      } catch (err) {
        console.error('Failed to load banners:', err);
        if (container) {
          container.innerHTML = `
            <tr>
              <td colspan="6" class="py-10 text-center">
                <div class="inline-flex flex-col items-center gap-2 text-rose-400">
                  <svg class="w-8 h-8 opacity-80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/></svg>
                  <p class="text-xs font-semibold">Failed to load hero banners</p>
                  <button type="button" onclick="AdminContent.loadBanners()" class="mt-1 px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-bold border border-rose-500/30 transition cursor-pointer">Retry</button>
                </div>
              </td>
            </tr>`;
        }
      } finally {
        if (refreshBtn) {
          refreshBtn.disabled = false;
          refreshBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        }
        if (refreshIcon) {
          refreshIcon.classList.remove('animate-spin');
        }
      }
    },

    renderBannersTable() {
      const container = document.getElementById('banners-table-body');
      if (!container) return;

      if (this.banners.length === 0) {
        container.innerHTML = `
          <tr>
            <td colspan="6" class="py-12 text-center">
              <div class="flex flex-col items-center justify-center gap-2 text-slate-400">
                <svg class="w-8 h-8 opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" stroke-width="2"/><circle cx="9" cy="9" r="2" stroke-width="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" stroke-width="2"/></svg>
                <p class="text-xs font-semibold">No hero banners configured yet.</p>
                <button type="button" onclick="AdminContent.openBannerModal()" class="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer">+ Add First Banner</button>
              </div>
            </td>
          </tr>`;
        return;
      }

      container.innerHTML = this.banners.map((b) => {
        const isActive = b.is_active !== false && b.status !== 'inactive';
        return `
          <tr id="banner-row-${b.id}" class="border-b border-slate-200 hover:bg-slate-50 transition-all duration-200">
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                <img src="${b.image || b.image_desktop || '/assets/images/products/placeholder.svg'}" class="w-14 h-9 object-cover rounded-lg border border-slate-200 bg-slate-100 flex-shrink-0" onerror="this.src='/assets/images/products/placeholder.svg'" />
                <div class="min-w-0">
                  <p class="font-bold text-xs text-slate-900 truncate max-w-xs">${b.headline || b.title || 'Hero Banner'}</p>
                  <p class="text-[11px] text-slate-500 truncate max-w-xs">${b.subtitle || '—'}</p>
                </div>
              </div>
            </td>
            <td class="py-3 px-4 text-xs text-slate-700">
              <span class="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">${b.cta_text || 'Shop Now'}</span>
              <p class="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[180px]">${b.cta_link || '/shop/'}</p>
            </td>
            <td class="py-3 px-4 text-xs text-slate-700 font-mono">${b.order !== undefined ? b.order : 0}</td>
            <td class="py-3 px-4">
              <button type="button" id="banner-toggle-${b.id}" onclick="AdminContent.toggleBannerStatus('${b.id}', ${isActive})" title="Click to toggle banner status" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}">
                <span id="banner-toggle-indicator-${b.id}" class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></span>
                <span id="banner-toggle-text-${b.id}">${isActive ? 'ACTIVE' : 'INACTIVE'}</span>
              </button>
            </td>
            <td class="py-3 px-4 text-xs text-slate-500">
              ${b.start_date ? `${new Date(b.start_date).toLocaleDateString()} &ndash; ${b.end_date ? new Date(b.end_date).toLocaleDateString() : 'Ongoing'}` : 'Permanent'}
            </td>
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button type="button" id="banner-edit-btn-${b.id}" onclick="AdminContent.openBannerModal('${b.id}')" title="Edit Banner" class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
                <button type="button" id="banner-del-btn-${b.id}" onclick="AdminContent.deleteBanner('${b.id}')" title="Delete Banner" class="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-500 transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    updateBannerImagePreview() {
      const input = document.getElementById('banner-modal-image');
      const wrap = document.getElementById('banner-modal-preview-wrap');
      const img = document.getElementById('banner-modal-preview-img');
      const urlText = document.getElementById('banner-modal-preview-url');
      if (!input || !wrap || !img) return;

      const url = input.value.trim();
      if (url) {
        img.src = url;
        if (urlText) urlText.textContent = url;
        wrap.classList.remove('hidden');
      } else {
        wrap.classList.add('hidden');
      }
    },

    openBannerModal(bannerId = null) {
      this.selectedBannerId = bannerId;
      const form = document.getElementById('banner-modal-form');
      const alertEl = document.getElementById('banner-modal-alert');
      const submitBtn = document.getElementById('banner-modal-submit-btn');
      const cancelBtn = document.getElementById('banner-modal-cancel-btn');

      if (form) form.reset();
      if (alertEl) {
        alertEl.classList.add('hidden');
        alertEl.innerHTML = '';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
      }
      if (cancelBtn) {
        cancelBtn.disabled = false;
      }

      if (bannerId) {
        const b = this.banners.find((x) => x.id === bannerId);
        if (!b) return;
        document.getElementById('banner-modal-title').textContent = 'Edit Hero Banner';
        if (submitBtn) submitBtn.innerHTML = '<span>Update Hero Banner</span>';
        document.getElementById('banner-modal-headline').value = b.headline || b.title || '';
        document.getElementById('banner-modal-subtitle').value = b.subtitle || b.description || '';
        document.getElementById('banner-modal-cta-text').value = b.cta_text || b.button_text || 'Shop Now';
        document.getElementById('banner-modal-cta-link').value = b.cta_link || b.link_url || '/shop/';
        document.getElementById('banner-modal-image').value = b.image_desktop || b.image || b.image_url || '';
        document.getElementById('banner-modal-mobile-image').value = b.image_mobile || b.mobile_image || '';
        document.getElementById('banner-modal-order').value = b.order !== undefined ? b.order : 0;
        document.getElementById('banner-modal-active').checked = b.is_active !== false && b.status !== 'inactive';
      } else {
        document.getElementById('banner-modal-title').textContent = 'Add Hero Banner';
        if (submitBtn) submitBtn.innerHTML = '<span>Create Hero Banner</span>';
        document.getElementById('banner-modal-headline').value = 'M.SHOP Technology, Lifestyle & More – All in One Place';
        document.getElementById('banner-modal-subtitle').value = 'Discover quality electronics, smart technology, and home appliances at great value.';
        document.getElementById('banner-modal-cta-text').value = 'Discover Catalog';
        document.getElementById('banner-modal-cta-link').value = '/shop/';
        document.getElementById('banner-modal-image').value = '/assets/images/banners/hero-station.jpg';
        document.getElementById('banner-modal-mobile-image').value = '';
        document.getElementById('banner-modal-order').value = (this.banners.length + 1) * 10;
        document.getElementById('banner-modal-active').checked = true;
      }

      this.updateBannerImagePreview();
      document.getElementById('banner-modal').classList.remove('hidden');
    },

    closeBannerModal() {
      const modal = document.getElementById('banner-modal');
      if (modal) modal.classList.add('hidden');
    },

    async saveBanner(e) {
      e.preventDefault();
      const headline = document.getElementById('banner-modal-headline').value.trim();
      const subtitle = document.getElementById('banner-modal-subtitle').value.trim();
      const cta_text = document.getElementById('banner-modal-cta-text').value.trim();
      const cta_link = document.getElementById('banner-modal-cta-link').value.trim();
      const image = document.getElementById('banner-modal-image').value.trim();
      const mobile_image = document.getElementById('banner-modal-mobile-image').value.trim();
      const order = Number(document.getElementById('banner-modal-order').value);
      const is_active = document.getElementById('banner-modal-active').checked;

      const isEdit = Boolean(this.selectedBannerId);
      const actionText = isEdit ? 'Updating Hero Banner...' : 'Creating Hero Banner...';

      const submitBtn = document.getElementById('banner-modal-submit-btn');
      const cancelBtn = document.getElementById('banner-modal-cancel-btn');
      const alertEl = document.getElementById('banner-modal-alert');
      const formInputs = document.querySelectorAll('#banner-modal-form input, #banner-modal-form textarea, #banner-modal-form button');

      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-80', 'cursor-not-allowed');
        submitBtn.innerHTML = `
          <span class="inline-flex items-center gap-2">
            <svg class="animate-spin -ml-0.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>${actionText}</span>
          </span>`;
      }
      if (cancelBtn) cancelBtn.disabled = true;
      formInputs.forEach((el) => { if (el !== submitBtn) el.disabled = true; });

      if (alertEl) {
        alertEl.className = 'mt-3 p-3 rounded-xl text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center gap-2.5 transition-all';
        alertEl.innerHTML = `
          <svg class="animate-spin h-4 w-4 text-indigo-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <div>
            <p class="font-semibold text-white">${actionText}</p>
            <p class="text-[11px] text-indigo-300/80">Saving configurations to Cloud Firestore &amp; syncing landing page</p>
          </div>`;
        alertEl.classList.remove('hidden');
      }

      AdminApp.toast(isEdit ? 'Updating hero banner...' : 'Creating hero banner...', 'info');

      const payload = {
        title: headline,
        headline,
        subtitle,
        cta_text,
        button_text: cta_text,
        cta_link,
        link_url: cta_link,
        image,
        image_url: image,
        image_desktop: image,
        image_mobile: mobile_image || image,
        mobile_image: mobile_image || image,
        order,
        is_active,
        banner_type: 'hero',
        type: 'hero',
      };

      try {
        let res;
        if (!this.selectedBannerId) {
          res = await AdminApp.api('/api/banners', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          if (res?.pending_approval || res?.status === 'pending_approval') {
            AdminApp.toast('Banner creation submitted for Supervisor Approval.', 'info');
          } else {
            AdminApp.toast('Hero Banner created successfully.', 'success');
          }
        } else {
          res = await AdminApp.api(`/api/banners/${this.selectedBannerId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
          if (res?.pending_approval || res?.status === 'pending_approval') {
            AdminApp.toast('Banner changes submitted for Supervisor Approval.', 'info');
          } else {
            AdminApp.toast('Hero Banner updated successfully.', 'success');
          }
        }

        try { localStorage.removeItem('marjaah_hero_banner_cache'); } catch(e){}
        this.closeBannerModal();
        await this.loadBanners();
      } catch (err) {
        console.error('Save banner error:', err);
        AdminApp.toast(err.message || 'Failed to save banner', 'error');

        if (alertEl) {
          alertEl.className = 'mt-3 p-3 rounded-xl text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2.5';
          alertEl.innerHTML = `
            <svg class="h-4 w-4 text-rose-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <span>${err.message || 'Failed to save banner. Please check fields and retry.'}</span>`;
          alertEl.classList.remove('hidden');
        }
      } finally {
        formInputs.forEach((el) => { el.disabled = false; });
        if (cancelBtn) cancelBtn.disabled = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
          submitBtn.innerHTML = originalBtnHtml || (isEdit ? '<span>Update Hero Banner</span>' : '<span>Create Hero Banner</span>');
        }
      }
    },

    async deleteBanner(bannerId) {
      if (!confirm('Are you sure you want to delete this hero banner? This will immediately remove it from the live landing page.')) return;

      const rowEl = document.getElementById('banner-row-' + bannerId);
      const delBtn = document.getElementById('banner-del-btn-' + bannerId);
      const editBtn = document.getElementById('banner-edit-btn-' + bannerId);
      const toggleBtn = document.getElementById('banner-toggle-' + bannerId);

      if (rowEl) {
        rowEl.classList.add('opacity-40', 'pointer-events-none', 'transition-opacity');
      }
      if (delBtn) {
        delBtn.disabled = true;
        delBtn.innerHTML = `
          <svg class="animate-spin h-3.5 w-3.5 text-rose-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>`;
      }
      if (editBtn) editBtn.disabled = true;
      if (toggleBtn) toggleBtn.disabled = true;

      AdminApp.toast('Deleting hero banner...', 'info');

      try {
        await AdminApp.api(`/api/banners/${bannerId}`, { method: 'DELETE' });
        try { localStorage.removeItem('marjaah_hero_banner_cache'); } catch(e){}
        AdminApp.toast('Hero Banner deleted successfully.', 'success');
        await this.loadBanners();
      } catch (err) {
        console.error('Delete banner error:', err);
        AdminApp.toast(err.message || 'Failed to delete banner', 'error');

        if (rowEl) rowEl.classList.remove('opacity-40', 'pointer-events-none');
        if (delBtn) {
          delBtn.disabled = false;
          delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
        }
        if (editBtn) editBtn.disabled = false;
        if (toggleBtn) toggleBtn.disabled = false;
      }
    },

    async toggleBannerStatus(bannerId, currentStatus) {
      const toggleBtn = document.getElementById('banner-toggle-' + bannerId);
      const textEl = document.getElementById('banner-toggle-text-' + bannerId);
      const indicatorEl = document.getElementById('banner-toggle-indicator-' + bannerId);

      if (toggleBtn) {
        toggleBtn.disabled = true;
        toggleBtn.classList.add('opacity-75', 'cursor-not-allowed');
      }
      if (indicatorEl) {
        indicatorEl.className = 'w-2.5 h-2.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin';
      }
      if (textEl) {
        textEl.textContent = 'Updating...';
      }

      AdminApp.toast('Updating banner status...', 'info');

      try {
        const res = await AdminApp.api(`/api/banners/${bannerId}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: !currentStatus }),
        });
        try { localStorage.removeItem('marjaah_hero_banner_cache'); } catch(e){}
        if (res?.pending_approval || res?.status === 'pending_approval') {
          AdminApp.toast('Status change submitted for Supervisor Approval.', 'info');
        } else {
          AdminApp.toast(`Hero Banner is now ${!currentStatus ? 'ACTIVE' : 'INACTIVE'}.`, 'success');
        }
        await this.loadBanners();
      } catch (err) {
        console.error('Toggle banner status error:', err);
        AdminApp.toast(err.message || 'Failed to update banner status', 'error');
        await this.loadBanners();
      }
    },

    async loadPromotions() {
      const container = document.getElementById('promotions-table-body');
      if (container) {
        container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-slate-400">Loading promotional sections...</td></tr>`;
      }

      try {
        const data = await AdminApp.api('/api/promotional-sections?includeInactive=true');
        this.promotions = data.sections || data.items || data || [];
        this.renderPromotionsTable();
      } catch (err) {
        console.error('Failed to load promotions:', err);
        if (container) {
          container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-rose-400">Failed to load promotional sections.</td></tr>`;
        }
      }
    },

    renderPromotionsTable() {
      const container = document.getElementById('promotions-table-body');
      if (!container) return;

      if (this.promotions.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-xs text-slate-400">No promotional sections found.</td></tr>`;
        return;
      }

      container.innerHTML = this.promotions.map((p) => {
        const isActive = p.is_active !== false && p.status !== 'inactive' && p.status !== 'pending_approval';
        const priceVal = p.product_price ?? p.card_price;
        const orderVal = p.display_order ?? p.order ?? 1;
        return `
          <tr id="promo-row-${p.id}" class="border-b border-slate-200 hover:bg-slate-50 transition-all duration-200">
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                <img src="${p.image || p.image_desktop || '/assets/images/products/placeholder.svg'}" class="w-12 h-12 object-cover rounded-xl border border-slate-200 bg-slate-100 flex-shrink-0" onerror="this.src='/assets/images/products/placeholder.svg'" />
                <div class="min-w-0">
                  <span class="text-[9px] uppercase font-bold tracking-widest text-primary">${p.tag || p.badge || p.badge_text || 'PROMOTION'}</span>
                  <p class="font-bold text-xs text-slate-900 truncate max-w-xs">${p.title || '—'}</p>
                  <p class="text-[11px] text-slate-500 truncate max-w-xs">${p.subtitle || p.description || '—'}</p>
                </div>
              </div>
            </td>
            <td class="py-3 px-4 text-xs text-slate-700">
              <span class="font-semibold text-slate-900">${p.cta_text || 'DISCOVER ALL'}</span>
              <p class="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">${p.cta_link || '/shop/'}</p>
            </td>
            <td class="py-3 px-4 text-xs text-slate-700 font-mono">${orderVal}</td>
            <td class="py-3 px-4">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                ${p.status === 'pending_approval' ? 'PENDING APPROVAL' : (isActive ? 'ACTIVE' : 'INACTIVE')}
              </span>
            </td>
            <td class="py-3 px-4 text-xs text-slate-600 font-mono">${priceVal ? (String(priceVal).toUpperCase().includes('QAR') ? priceVal : `QAR ${priceVal}`) : '—'}</td>
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button type="button" id="promo-edit-btn-${p.id}" onclick="AdminContent.openPromotionModal('${p.id}')" title="Edit Promo Section" class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
                <button type="button" id="promo-del-btn-${p.id}" onclick="AdminContent.deletePromotion('${p.id}')" title="Delete Promo Section" class="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-500 transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    openPromotionModal(promoId = null) {
      this.selectedPromoId = promoId;
      const form = document.getElementById('promo-modal-form');
      const alertEl = document.getElementById('promo-modal-alert');
      const submitBtn = document.getElementById('promo-modal-submit-btn');
      const cancelBtn = document.getElementById('promo-modal-cancel-btn');

      if (form) form.reset();
      if (alertEl) {
        alertEl.classList.add('hidden');
        alertEl.innerHTML = '';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
      }
      if (cancelBtn) cancelBtn.disabled = false;

      if (promoId) {
        const p = this.promotions.find((x) => x.id === promoId);
        if (!p) return;
        document.getElementById('promo-modal-title').textContent = 'Edit Promotional Section';
        if (submitBtn) submitBtn.innerHTML = '<span>Update Promotion</span>';
        document.getElementById('promo-modal-tag').value = p.tag || p.badge || p.badge_text || '';
        document.getElementById('promo-modal-heading').value = p.title || '';
        document.getElementById('promo-modal-desc').value = p.subtitle || p.description || '';
        document.getElementById('promo-modal-cta-text').value = p.cta_text || 'DISCOVER ALL PRODUCTS';
        document.getElementById('promo-modal-cta-link').value = p.cta_link || '/shop/';
        document.getElementById('promo-modal-image').value = p.image || p.image_desktop || '';
        document.getElementById('promo-modal-product-name').value = p.product_name || p.card_tag || '';
        const rawPromoPrice = p.product_price ?? p.card_price ?? '';
        document.getElementById('promo-modal-product-price').value = rawPromoPrice !== '' ? String(rawPromoPrice).replace(/[^0-9.]/g, '') : '';
        document.getElementById('promo-modal-active').checked = p.is_active !== false;
      } else {
        document.getElementById('promo-modal-title').textContent = 'Add Promotional Section';
        if (submitBtn) submitBtn.innerHTML = '<span>Create Promotion</span>';
        document.getElementById('promo-modal-tag').value = 'AUTHORIZED GCC DISTRIBUTION';
        document.getElementById('promo-modal-heading').value = 'ULTRA RIGS & WORKSTATIONS';
        document.getElementById('promo-modal-desc').value = 'Bridging the pinnacle of global computing hardware with Qatar\'s visionary tech community.';
        document.getElementById('promo-modal-cta-text').value = 'DISCOVER ALL PRODUCTS';
        document.getElementById('promo-modal-cta-link').value = '/shop/';
        document.getElementById('promo-modal-image').value = '/assets/images/products/asus-rog-g16.jpg';
      }

      document.getElementById('promo-modal').classList.remove('hidden');
    },

    closePromotionModal() {
      document.getElementById('promo-modal').classList.add('hidden');
    },

    async savePromotion(e) {
      e.preventDefault();
      const tag = document.getElementById('promo-modal-tag').value.trim();
      const title = document.getElementById('promo-modal-heading').value.trim();
      const subtitle = document.getElementById('promo-modal-desc').value.trim();
      const cta_text = document.getElementById('promo-modal-cta-text').value.trim();
      const cta_link = document.getElementById('promo-modal-cta-link').value.trim();
      const image = document.getElementById('promo-modal-image').value.trim();
      const product_name = document.getElementById('promo-modal-product-name')?.value?.trim();
      const product_price = document.getElementById('promo-modal-product-price')?.value ? Number(document.getElementById('promo-modal-product-price').value) : undefined;
      const is_active = document.getElementById('promo-modal-active').checked;

      const isEdit = Boolean(this.selectedPromoId);
      const actionText = isEdit ? 'Updating Promotional Section...' : 'Creating Promotional Section...';

      const submitBtn = document.getElementById('promo-modal-submit-btn');
      const cancelBtn = document.getElementById('promo-modal-cancel-btn');
      const alertEl = document.getElementById('promo-modal-alert');
      const formInputs = document.querySelectorAll('#promo-modal-form input, #promo-modal-form textarea, #promo-modal-form button');

      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-80', 'cursor-not-allowed');
        submitBtn.innerHTML = `
          <span class="inline-flex items-center gap-2">
            <svg class="animate-spin -ml-0.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>${actionText}</span>
          </span>`;
      }
      if (cancelBtn) cancelBtn.disabled = true;
      formInputs.forEach((el) => { if (el !== submitBtn) el.disabled = true; });

      if (alertEl) {
        alertEl.className = 'mt-3 p-3 rounded-xl text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center gap-2.5 transition-all';
        alertEl.innerHTML = `
          <svg class="animate-spin h-4 w-4 text-indigo-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <div>
            <p class="font-semibold text-white">${actionText}</p>
            <p class="text-[11px] text-indigo-300/80">Saving promotional section to database</p>
          </div>`;
        alertEl.classList.remove('hidden');
      }

      AdminApp.toast(isEdit ? 'Updating promotional section...' : 'Creating promotional section...', 'info');

      const payload = {
        tag,
        badge: tag,
        badge_text: tag,
        title,
        subtitle,
        description: subtitle,
        cta_text,
        cta_link,
        image,
        image_desktop: image,
        product_name,
        card_tag: product_name,
        product_price,
        card_price: product_price,
        is_active,
      };

      try {
        let res;
        if (!this.selectedPromoId) {
          res = await AdminApp.api('/api/promotional-sections', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          AdminApp.toast(res?.pending_approval ? 'Promotional section submitted for approval.' : 'Promotional section created successfully.', res?.pending_approval ? 'info' : 'success');
        } else {
          res = await AdminApp.api(`/api/promotional-sections/${this.selectedPromoId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          AdminApp.toast(res?.pending_approval ? 'Promotional update submitted for approval.' : 'Promotional section updated successfully.', res?.pending_approval ? 'info' : 'success');
        }
        this.closePromotionModal();
        await this.loadPromotions();
      } catch (err) {
        console.error('Save promo error:', err);
        AdminApp.toast(err.message || 'Failed to save promotional section', 'error');

        if (alertEl) {
          alertEl.className = 'mt-3 p-3 rounded-xl text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2.5';
          alertEl.innerHTML = `
            <svg class="h-4 w-4 text-rose-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <span>${err.message || 'Failed to save promotional section.'}</span>`;
          alertEl.classList.remove('hidden');
        }
      } finally {
        formInputs.forEach((el) => { el.disabled = false; });
        if (cancelBtn) cancelBtn.disabled = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
          submitBtn.innerHTML = originalBtnHtml || (isEdit ? '<span>Update Promotion</span>' : '<span>Create Promotion</span>');
        }
      }
    },

    async deletePromotion(promoId) {
      if (!confirm('Are you sure you want to delete this promotional section?')) return;

      const rowEl = document.getElementById('promo-row-' + promoId);
      const delBtn = document.getElementById('promo-del-btn-' + promoId);
      const editBtn = document.getElementById('promo-edit-btn-' + promoId);

      if (rowEl) {
        rowEl.classList.add('opacity-40', 'pointer-events-none', 'transition-opacity');
      }
      if (delBtn) {
        delBtn.disabled = true;
        delBtn.innerHTML = `
          <svg class="animate-spin h-3.5 w-3.5 text-rose-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>`;
      }
      if (editBtn) editBtn.disabled = true;

      AdminApp.toast('Deleting promotional section...', 'info');

      try {
        const res = await AdminApp.api(`/api/promotional-sections/${promoId}`, { method: 'DELETE' });
        AdminApp.toast(res?.pending_approval ? 'Deletion submitted for Supervisor Approval.' : 'Promotional section deleted.', res?.pending_approval ? 'info' : 'success');
        await this.loadPromotions();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to delete section', 'error');
        if (rowEl) rowEl.classList.remove('opacity-40', 'pointer-events-none');
        if (delBtn) {
          delBtn.disabled = false;
          delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
        }
        if (editBtn) editBtn.disabled = false;
      }
    },

    async loadLocations() {
      const container = document.getElementById('locations-table-body');
      if (container) {
        container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-slate-400">Loading store pickup locations...</td></tr>`;
      }

      try {
        const data = await AdminApp.api('/api/store-locations?includeInactive=true');
        this.locations = data.locations || data.items || data || [];
        this.renderLocationsTable();
      } catch (err) {
        console.error('Failed to load locations:', err);
        if (container) {
          container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-rose-400">Failed to load locations.</td></tr>`;
        }
      }
    },

    renderLocationsTable() {
      const container = document.getElementById('locations-table-body');
      if (!container) return;

      if (this.locations.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-xs text-slate-400">No store pickup locations configured yet.</td></tr>`;
        return;
      }

      container.innerHTML = this.locations.map((loc) => {
        const isActive = loc.is_active !== false;
        const isPrimary = Boolean(loc.is_primary || loc.is_default);
        const hours = loc.working_hours || loc.opening_hours || '9:00 AM - 10:00 PM';
        const instr = loc.instructions || loc.pickup_instructions || 'Order ID required';
        return `
          <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors">
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs text-slate-900">${loc.name}</span>
                ${isPrimary ? `<span class="text-[9px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase tracking-wider border border-primary/20">Main Hub</span>` : ''}
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">${loc.address || ''}${loc.city ? `, ${loc.city}` : ''}</p>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-700 font-mono">${loc.phone || '—'}</td>
            <td class="py-3.5 px-4 text-xs text-slate-700">${hours}</td>
            <td class="py-3.5 px-4 text-xs text-slate-500 italic max-w-xs truncate">${instr}</td>
            <td class="py-3.5 px-4">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                ${isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button type="button" onclick="AdminContent.openLocationModal('${loc.id}')" title="Edit Location" class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
                <button type="button" onclick="AdminContent.deleteLocation('${loc.id}')" title="Delete Location" class="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-500 transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    openLocationModal(locId = null) {
      this.selectedLocId = locId;
      const form = document.getElementById('location-modal-form');
      if (form) form.reset();

      if (locId) {
        const l = this.locations.find((x) => x.id === locId);
        if (!l) return;
        document.getElementById('location-modal-title').textContent = 'Edit Store Pickup Location';
        document.getElementById('location-modal-name').value = l.name || '';
        document.getElementById('location-modal-address').value = l.address || '';
        document.getElementById('location-modal-city').value = l.city || 'Doha';
        document.getElementById('location-modal-phone').value = l.phone || '';
        document.getElementById('location-modal-hours').value = l.working_hours || l.opening_hours || '';
        document.getElementById('location-modal-instructions').value = l.instructions || l.pickup_instructions || '';
        document.getElementById('location-modal-primary').checked = Boolean(l.is_primary || l.is_default);
        document.getElementById('location-modal-active').checked = l.is_active !== false;
      } else {
        document.getElementById('location-modal-title').textContent = 'Add Store Pickup Location';
        document.getElementById('location-modal-city').value = 'Doha';
        document.getElementById('location-modal-hours').value = 'Saturday – Thursday: 9:00 AM – 10:00 PM | Friday: 4:00 PM – 10:00 PM';
        document.getElementById('location-modal-instructions').value = 'Please present your Order ID and Qatar ID/Passport upon arrival at the collection counter.';
      }

      document.getElementById('location-modal').classList.remove('hidden');
    },

    closeLocationModal() {
      document.getElementById('location-modal').classList.add('hidden');
    },

    async saveLocation(e) {
      e.preventDefault();
      const name = document.getElementById('location-modal-name').value.trim();
      const address = document.getElementById('location-modal-address').value.trim();
      const city = document.getElementById('location-modal-city').value.trim();
      const phone = document.getElementById('location-modal-phone').value.trim();
      const working_hours = document.getElementById('location-modal-hours').value.trim();
      const instructions = document.getElementById('location-modal-instructions').value.trim();
      const is_primary = document.getElementById('location-modal-primary').checked;
      const is_active = document.getElementById('location-modal-active').checked;

      const payload = {
        name,
        address,
        city,
        phone,
        working_hours,
        opening_hours: working_hours,
        instructions,
        pickup_instructions: instructions,
        is_primary,
        is_default: is_primary,
        is_active,
      };

      try {
        if (!this.selectedLocId) {
          await AdminApp.api('/api/store-locations', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          AdminApp.toast('Store pickup location added successfully.', 'success');
        } else {
          await AdminApp.api(`/api/store-locations/${this.selectedLocId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          AdminApp.toast('Store pickup location updated successfully.', 'success');
        }
        this.closeLocationModal();
        await this.loadLocations();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to save store location', 'error');
      }
    },

    async deleteLocation(locId) {
      if (!confirm('Are you sure you want to delete this store pickup location?')) return;
      try {
        await AdminApp.api(`/api/store-locations/${locId}`, { method: 'DELETE' });
        AdminApp.toast('Pickup location deleted successfully.', 'success');
        await this.loadLocations();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to delete location', 'error');
      }
    },

    async loadSettings() {
      try {
        const data = await AdminApp.api('/api/admin/settings');
        this.settings = data || {};

        document.getElementById('settings-store-name').value = this.settings.store_name || 'M.SHOP Qatar';
        document.getElementById('settings-company-name').value = this.settings.company_name || this.settings.trade_name || 'Marjaah Trading WLL';
        document.getElementById('settings-cr-number').value = this.settings.cr_number || '228717';
        document.getElementById('settings-contact-email').value = this.settings.email || 'info@marjaah.com';
        document.getElementById('settings-contact-phone').value = this.settings.phone || '+974 7799 1013';
        document.getElementById('settings-whatsapp').value = this.settings.whatsapp || '+974 7799 1013';
        document.getElementById('settings-address').value = this.settings.address || 'Al Sadd, Doha, State of Qatar';
        document.getElementById('settings-footer-text').value = this.settings.footer_text || this.settings.footer_cr_text || 'CR No. 228717 • Qatar';
      } catch (err) {
        console.error('Failed to load store settings:', err);
      }
    },

    async saveSettings(e) {
      e.preventDefault();
      const company_name = document.getElementById('settings-company-name').value.trim();
      const footer_text = document.getElementById('settings-footer-text').value.trim();
      const payload = {
        store_name: document.getElementById('settings-store-name').value.trim(),
        company_name,
        trade_name: company_name,
        cr_number: document.getElementById('settings-cr-number').value.trim(),
        email: document.getElementById('settings-contact-email').value.trim(),
        phone: document.getElementById('settings-contact-phone').value.trim(),
        whatsapp: document.getElementById('settings-whatsapp').value.trim(),
        address: document.getElementById('settings-address').value.trim(),
        footer_text,
        footer_cr_text: footer_text,
      };

      try {
        await AdminApp.api('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        AdminApp.toast('Store settings & CR configuration saved successfully.', 'success');
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to update store settings', 'error');
      }
    },
  };
})();

