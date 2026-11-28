(function () {
  'use strict';

  window.AdminProducts = {
    products: [],
    categories: [],
    subcategories: [],
    brands: [],
    selectedProdId: null,
    selectedIds: new Set(),
    pendingFlagKeys: new Set(),
    modalImages: [],
    isUploadingImages: false,
    isSavingProduct: false,
    searchDebounceTimer: null,
    currentPage: 1,
    pageSize: 25,
    totalProducts: 0,
    totalPages: 1,
    fetchSeq: 0,

    onSearchInput() {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.currentPage = 1;
        this.fetchProductsPage();
      }, 350);
    },

    onFilterChange() {
      this.currentPage = 1;
      this.updateFilterCountBadge();
      this.fetchProductsPage();
    },

    openFilterDrawer() {
      const drawer = document.getElementById('products-filter-drawer');
      const panel = document.getElementById('products-filter-panel');
      if (!drawer) return;
      drawer.classList.remove('hidden', 'pointer-events-none');
      void drawer.offsetWidth;
      drawer.classList.remove('opacity-0');
      if (panel) panel.classList.remove('translate-x-full');
      document.body.style.overflow = 'hidden';
    },

    closeFilterDrawer() {
      const drawer = document.getElementById('products-filter-drawer');
      const panel = document.getElementById('products-filter-panel');
      if (!drawer) return;
      drawer.classList.add('opacity-0');
      if (panel) panel.classList.add('translate-x-full');
      setTimeout(() => {
        drawer.classList.add('hidden', 'pointer-events-none');
        document.body.style.overflow = '';
      }, 280);
    },

    resetFilters() {
      const catEl = document.getElementById('products-category-filter');
      const subEl = document.getElementById('products-subcategory-filter');
      const badgeEl = document.getElementById('products-badge-filter');
      const statusEl = document.getElementById('products-status-filter');
      const searchEl = document.getElementById('products-search-input');
      if (catEl) catEl.value = 'all';
      if (subEl) subEl.value = 'all';
      if (badgeEl) badgeEl.value = 'all';
      if (statusEl) statusEl.value = 'all';
      if (searchEl) searchEl.value = '';
      this.onCategoryFilterChange();
    },

    updateFilterCountBadge() {
      const cat = document.getElementById('products-category-filter')?.value || 'all';
      const sub = document.getElementById('products-subcategory-filter')?.value || 'all';
      const badge = document.getElementById('products-badge-filter')?.value || 'all';
      const status = document.getElementById('products-status-filter')?.value || 'all';
      const count = [cat, sub, badge, status].filter((v) => v !== 'all').length;
      const el = document.getElementById('products-filter-active-count');
      if (!el) return;
      if (count > 0) {
        el.textContent = count;
        el.classList.remove('hidden');
        el.classList.add('inline-flex');
      } else {
        el.classList.add('hidden');
        el.classList.remove('inline-flex');
      }
    },

    goToPage(page) {
      const target = Math.max(1, Math.min(this.totalPages || 1, Number(page) || 1));
      if (target === this.currentPage) return;
      this.currentPage = target;
      this.fetchProductsPage();
    },

    async load() {
      this.updateFilterCountBadge();
      const cachedCats = window.SmartCache?.getCategories();
      const cachedSubs = window.SmartCache?.getSubcategories();
      const cachedBrands = window.SmartCache?.getBrands();
      if (cachedCats && cachedCats.length > 0) this.categories = cachedCats;
      if (cachedSubs && cachedSubs.length > 0) this.subcategories = cachedSubs;
      if (cachedBrands && cachedBrands.length > 0) this.brands = cachedBrands;
      this.populateFilterDropdowns();

      await Promise.all([
        this.fetchProductsPage(),
        this.revalidateMetadata(),
      ]);
    },

    async revalidateMetadata() {
      try {
        const [catData, subData, brandData] = await Promise.all([
          AdminApp.api('/api/categories').catch(() => ({ categories: [] })),
          AdminApp.api('/api/subcategories?includeInactive=true').catch(() => ({ subcategories: [] })),
          AdminApp.api('/api/brands').catch(() => ({ brands: [] })),
        ]);
        const freshCats = Array.isArray(catData) ? catData : (catData.categories || catData.items || []);
        const freshSubs = Array.isArray(subData) ? subData : (subData.subcategories || subData.items || []);
        const freshBrands = Array.isArray(brandData) ? brandData : (brandData.brands || brandData.items || []);
        if (Array.isArray(catData) || Array.isArray(catData?.categories) || Array.isArray(catData?.items)) {
          this.categories = freshCats;
        }
        if (Array.isArray(subData) || Array.isArray(subData?.subcategories) || Array.isArray(subData?.items)) {
          this.subcategories = freshSubs;
        }
        if (Array.isArray(brandData) || Array.isArray(brandData?.brands) || Array.isArray(brandData?.items)) {
          this.brands = freshBrands;
        }
        window.SmartCache?.setCategories(this.categories);
        window.SmartCache?.setSubcategories(this.subcategories);
        window.SmartCache?.setBrands(this.brands);
        this.populateFilterDropdowns();
      } catch (err) {
        console.warn('Metadata sync failed:', err);
      }
    },

    async fetchProductsPage() {
      const container = document.getElementById('products-table-body');
      const seq = ++this.fetchSeq;

      if (container) {
        container.innerHTML = `
          <tr>
            <td colspan="7" class="py-12 text-center text-xs text-slate-400">
              <div class="flex flex-col items-center justify-center gap-2">
                <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Searching &amp; loading products from database...</span>
              </div>
            </td>
          </tr>`;
      }

      const params = new URLSearchParams();
      params.set('page', String(this.currentPage));
      params.set('limit', String(this.pageSize));
      params.set('includeHidden', 'true');

      const q = (document.getElementById('products-search-input')?.value || '').trim();
      const cat = document.getElementById('products-category-filter')?.value || 'all';
      const sub = document.getElementById('products-subcategory-filter')?.value || 'all';
      const badge = document.getElementById('products-badge-filter')?.value || 'all';
      const status = document.getElementById('products-status-filter')?.value || 'all';

      if (q) params.set('search', q);
      if (cat !== 'all') params.set('category', cat);
      if (sub !== 'all') params.set('subcategory', sub);
      params.set('status', status);
      if (badge === 'featured') params.set('isFeatured', 'true');
      if (badge === 'favorite') params.set('isFavorite', 'true');
      if (badge === 'offer') params.set('isOffer', 'true');

      try {
        const res = await AdminApp.api(`/api/products?${params.toString()}`);
        if (seq !== this.fetchSeq) return; // Ignore stale out-of-order response

        this.products = res.items || res.products || res.data || [];
        this.totalProducts = Number(res.total !== undefined ? res.total : this.products.length);
        this.totalPages = Math.max(1, Number(res.totalPages || Math.ceil(this.totalProducts / this.pageSize) || 1));
        this.currentPage = Math.min(this.currentPage, this.totalPages);

        this.renderTable();
      } catch (err) {
        if (seq !== this.fetchSeq) return;
        console.error('Failed to fetch products page:', err);
        if (container) {
          container.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-xs text-rose-400">Failed to load catalog products.</td></tr>`;
        }
      }
    },

    populateFilterDropdowns() {
      const catSelect = document.getElementById('products-category-filter');
      const subSelect = document.getElementById('products-subcategory-filter');
      const catModalSelect = document.getElementById('product-modal-category');

      if (catSelect) {
        const curVal = catSelect.value;
        catSelect.innerHTML = `
          <option value="all">All Categories</option>
          ${this.categories.map((c) => `<option value="${c.slug || c.id}">${c.name}</option>`).join('')}
        `;
        if (curVal) catSelect.value = curVal;
      }

      this.updateTableSubcategoryFilter();

      if (catModalSelect) {
        const curModalCat = catModalSelect.value;
        catModalSelect.innerHTML = `
          <option value="">Select Category *</option>
          ${this.categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}
        `;
        if (curModalCat) catModalSelect.value = curModalCat;

        // Ensure change listener dynamically loads subcategories
        catModalSelect.onchange = (e) => {
          this.onModalCategoryChange(e.target.value);
        };
      }

      const brandListEl = document.getElementById('product-modal-brands-list');
      if (brandListEl && Array.isArray(this.brands)) {
        brandListEl.innerHTML = this.brands
          .map((b) => `<option value="${String(b.name || '').replace(/"/g, '&quot;')}"></option>`)
          .join('');
      }
    },

    updateTableSubcategoryFilter() {
      const catSelect = document.getElementById('products-category-filter');
      const subSelect = document.getElementById('products-subcategory-filter');
      if (!subSelect) return;

      const prevSub = subSelect.value;
      const selectedCat = catSelect ? catSelect.value : 'all';
      let eligibleSubs = this.subcategories;

      if (selectedCat !== 'all') {
        const cat = this.categories.find((c) => c.slug === selectedCat || c.id === selectedCat);
        if (cat) {
          eligibleSubs = this.subcategories.filter((s) => s.category_id === cat.id || s.category_slug === cat.slug);
        }
      }

      subSelect.innerHTML = `
        <option value="all">All Subcategories</option>
        ${eligibleSubs.map((s) => `<option value="${s.slug || s.id}">${s.name}</option>`).join('')}
      `;
      if (prevSub && Array.from(subSelect.options).some((opt) => opt.value === prevSub)) {
        subSelect.value = prevSub;
      }
    },

    onCategoryFilterChange() {
      this.updateTableSubcategoryFilter();
      this.onFilterChange();
    },

    onModalCategoryChange(catIdOrSlug, selectedSubIdOrSlug = null) {
      const subModalSelect = document.getElementById('product-modal-subcategory');
      if (!subModalSelect) return;

      if (!catIdOrSlug) {
        subModalSelect.innerHTML = `<option value="">Select Category first...</option>`;
        subModalSelect.disabled = true;
        return;
      }

      const cat = this.categories.find((c) => c.id === catIdOrSlug || c.slug === catIdOrSlug);
      const eligibleSubs = this.subcategories.filter((s) => {
        if (!cat) return false;
        return s.category_id === cat.id || s.category_slug === cat.slug;
      });

      subModalSelect.disabled = false;
      subModalSelect.innerHTML = `
        <option value="">Select Subcategory *</option>
        ${eligibleSubs.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}
      `;

      if (selectedSubIdOrSlug) {
        const match = eligibleSubs.find(
          (s) => s.id === selectedSubIdOrSlug || s.slug === selectedSubIdOrSlug || s.name.toLowerCase() === String(selectedSubIdOrSlug).toLowerCase()
        );
        if (match) {
          subModalSelect.value = match.id;
        }
      }
    },

    renderTable() {
      const container = document.getElementById('products-table-body');
      if (!container) return;

      const displayList = this.products || [];
      const totalBadge = document.getElementById('products-total-count-badge');
      if (totalBadge) {
        totalBadge.textContent = (this.totalProducts || displayList.length).toLocaleString();
      }

      if (displayList.length === 0) {
        container.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-xs text-slate-400">No products matching your search or filter criteria.</td></tr>`;
        this.renderPagination();
        this.updateBulkBar();
        return;
      }

      const rowsHtml = displayList
        .map((p) => {
          const isSelected = this.selectedIds.has(p.id);
          const stockCount = p.stock_count !== undefined ? Number(p.stock_count) : (p.stock !== undefined ? Number(p.stock) : 10);
          const isOutOfStock = stockCount <= 0;
          const status = p.status || 'active';

          const statusBadges = {
            active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            hidden: 'bg-slate-100 text-slate-600 border-slate-200',
            pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
            rejected: 'bg-rose-50 text-rose-700 border-rose-200',
          };
          const statusBadge = statusBadges[status] || statusBadges.active;

          const isFeat = Boolean(p.is_featured || p.featured);
          const isFav = Boolean(p.is_favorite || p.is_liked);
          const isOffer = Boolean(p.is_offer || p.is_on_sale || (p.original_price && Number(p.original_price) > Number(p.price)) || p.offer_badge || p.offer_title);
          const offerPct = p.original_price && Number(p.original_price) > Number(p.price)
            ? Math.round(((Number(p.original_price) - Number(p.price)) / Number(p.original_price)) * 100)
            : (p.discount_percent ? Math.round(Number(p.discount_percent)) : 0);
          const offerPillLabel = p.offer_badge || (offerPct > 0 ? `${offerPct}% OFF` : '') || p.offer_title || 'Offer';
          const offerTooltip = [p.offer_title, p.offer_badge, p.offer_description].filter(Boolean).join(' · ') || 'Click to configure or edit special offer';
          const isFeatPending = this.pendingFlagKeys.has(`${p.id}:featured`);
          const isFavPending = this.pendingFlagKeys.has(`${p.id}:favorite`);
          const isOfferPending = this.pendingFlagKeys.has(`${p.id}:offer`);
          const syncSpin = '<svg class="w-3.5 h-3.5 animate-spin inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>';

          return `
            <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-primary/5' : ''}">
              <td class="py-3 px-3 text-center">
                <input type="checkbox" data-prod-select="${p.id}" ${isSelected ? 'checked' : ''} onchange="AdminProducts.toggleSelect('${p.id}')" class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-0 cursor-pointer accent-primary" />
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <button type="button" onclick="window.openImageLightbox('${(p.image || '/assets/images/products/placeholder.svg').replace(/'/g, "\\'")}', '${(p.name || 'Product').replace(/'/g, "\\'")}', '${(p.sku || '').replace(/'/g, "\\'")}')" class="group relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 cursor-zoom-in hover:border-primary transition-all shadow-sm focus:outline-none" title="Click to view full screen image">
                    <img src="${p.image || '/assets/images/products/placeholder.svg'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" onerror="this.src='/assets/images/products/placeholder.svg'" />
                    <div class="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
                    </div>
                  </button>
                  <div class="min-w-0">
                    <p class="font-bold text-xs text-slate-900 truncate max-w-xs" title="${p.name}">${p.name}</p>
                    ${p.name_ar ? `<p class="text-[10px] text-slate-400 truncate max-w-xs" dir="rtl">${p.name_ar}</p>` : ''}
                    <div class="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span class="text-[10px] text-slate-400 font-mono mr-1">${p.sku || p.slug || '—'}</span>
                      ${isFeat ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">⭐ Featured</span>` : ''}
                      ${isFav ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30">❤️ Liked</span>` : ''}
                      ${isOffer ? `<button type="button" onclick="event.stopPropagation();AdminProducts.openOfferModal('${p.id}')" title="${offerTooltip.replace(/"/g, '&quot;')}" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-700 border border-purple-500/30 hover:bg-purple-500/25 cursor-pointer transition">🔥 ${offerPillLabel}</button>` : ''}
                    </div>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4 text-xs">
                <span class="font-bold text-slate-800 block truncate">${p.category_name || p.category || 'General'}</span>
                <span class="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-semibold truncate mt-0.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>${p.subcategory_name || p.subcategory || '—'}</span>
                </span>
                <p class="text-[10px] text-slate-400 mt-0.5">${p.brand || '—'}</p>
              </td>
              <td class="py-3 px-4">
                <span class="font-display font-black text-xs text-slate-900">${Number(p.price || 0).toFixed(0)} <span class="text-[10px] font-normal text-slate-400">QAR</span></span>
                ${p.original_price ? `<p class="text-[10px] text-slate-400 line-through">${p.original_price} QAR</p>` : ''}
              </td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isOutOfStock ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
                  ${isOutOfStock ? 'Out of Stock' : `${stockCount} in stock`}
                </span>
              </td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}">
                  ${status.replace('_', ' ').toUpperCase()}
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="inline-flex items-center justify-end">
                  <button type="button" onclick="AdminProducts.openActionMenu(event, '${p.id}')" aria-label="Product actions" class="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition inline-flex items-center justify-center cursor-pointer">
                    ${(isFeatPending || isFavPending || isOfferPending) ? syncSpin : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>'}
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');

      container.innerHTML = rowsHtml;
      this.renderPagination();
      this.updateBulkBar();
    },

    renderPagination() {
      const bar = document.getElementById('products-pagination-bar');
      if (!bar) return;

      const total = this.totalProducts || 0;
      const totalPages = this.totalPages || 1;
      const cur = this.currentPage || 1;
      const start = total === 0 ? 0 : (cur - 1) * this.pageSize + 1;
      const end = Math.min(total, cur * this.pageSize);

      const pageNums = [];
      const minP = Math.max(1, cur - 2);
      const maxP = Math.min(totalPages, cur + 2);
      for (let i = minP; i <= maxP; i++) pageNums.push(i);

      bar.innerHTML = `
        <div class="text-slate-500 font-medium">
          Showing <strong class="text-slate-800">${start}–${end}</strong> of <strong class="text-slate-800">${total.toLocaleString()}</strong> products
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="AdminProducts.goToPage(${cur - 1})" ${cur <= 1 ? 'disabled' : ''} class="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">Prev</button>
          ${minP > 1 ? `<button type="button" onclick="AdminProducts.goToPage(1)" class="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold cursor-pointer">1</button><span class="px-1 text-slate-400">…</span>` : ''}
          ${pageNums.map((n) => `
            <button type="button" onclick="AdminProducts.goToPage(${n})" class="px-2.5 py-1.5 rounded-lg border font-bold cursor-pointer ${n === cur ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}">${n}</button>
          `).join('')}
          ${maxP < totalPages ? `<span class="px-1 text-slate-400">…</span><button type="button" onclick="AdminProducts.goToPage(${totalPages})" class="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold cursor-pointer">${totalPages}</button>` : ''}
          <button type="button" onclick="AdminProducts.goToPage(${cur + 1})" ${cur >= totalPages ? 'disabled' : ''} class="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">Next</button>
        </div>
      `;
    },

    toggleSelect(id) {
      if (this.selectedIds.has(id)) {
        this.selectedIds.delete(id);
      } else {
        this.selectedIds.add(id);
      }
      this.updateBulkBar();
    },

    toggleSelectAll(checked) {
      if (checked) {
        this.products.forEach((p) => this.selectedIds.add(p.id));
      } else {
        this.selectedIds.clear();
      }
      this.renderTable();
    },

    updateBulkBar() {
      const bar = document.getElementById('products-bulk-bar');
      const countEl = document.getElementById('products-bulk-count');
      if (!bar) return;

      const size = this.selectedIds.size;
      if (size > 0) {
        bar.classList.remove('hidden');
        if (countEl) countEl.textContent = `${size} selected`;
      } else {
        bar.classList.add('hidden');
      }
    },

    async applyBulkStatus(status) {
      const ids = Array.from(this.selectedIds);
      if (ids.length === 0) return;

      try {
        await AdminApp.api('/api/products/bulk-status', {
          method: 'PATCH',
          body: JSON.stringify({ ids, status }),
        });
        AdminApp.toast(`Updated ${ids.length} products to ${status.toUpperCase()}.`, 'success');
        this.selectedIds.clear();
        await this.load();
      } catch (err) {
        AdminApp.toast(err.message || 'Bulk status update failed', 'error');
      }
    },

    async toggleFlag(prodId, flagType) {
      const p = this.products.find((x) => x.id === prodId);
      if (!p) return;

      const lockKey = `${prodId}:${flagType}`;
      if (this.pendingFlagKeys.has(lockKey)) return;

      const prevSnapshot = {
        is_featured: p.is_featured,
        featured: p.featured,
        is_favorite: p.is_favorite,
        is_liked: p.is_liked,
        is_offer: p.is_offer,
        is_on_sale: p.is_on_sale,
      };

      const payload = {};
      let label = '';
      if (flagType === 'featured') {
        const next = !(p.is_featured || p.featured);
        payload.is_featured = next;
        payload.featured = next;
        label = next ? 'Marked as Featured ⭐' : 'Removed from Featured';
      } else if (flagType === 'favorite') {
        const next = !(p.is_favorite || p.is_liked);
        payload.is_favorite = next;
        payload.is_liked = next;
        label = next ? 'Added to Liked / Showcase ❤️' : 'Removed from Liked';
      } else if (flagType === 'offer') {
        const next = !(p.is_offer || p.is_on_sale);
        payload.is_offer = next;
        payload.is_on_sale = next;
        label = next ? 'Marked as Special Offer 🔥' : 'Removed Special Offer';
      }

      // Optimistic UI update immediately + background sync indicator
      this.pendingFlagKeys.add(lockKey);
      Object.assign(p, payload);
      window.SmartCache?.updateProduct(p);
      this.renderTable();

      try {
        const res = await AdminApp.api(`/api/products/${prodId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const updated = res.product || { ...p, ...payload };
        Object.assign(p, updated);
        window.SmartCache?.updateProduct(p);
        AdminApp.toast(label, 'success');
      } catch (err) {
        // Roll back optimistic state if backend update fails
        Object.assign(p, prevSnapshot);
        window.SmartCache?.updateProduct(p);
        AdminApp.toast(err.message || 'Failed to update product badge — reverted', 'error');
      } finally {
        this.pendingFlagKeys.delete(lockKey);
        this.renderTable();
      }
    },

    async duplicateProduct(prodId) {
      try {
        const res = await AdminApp.api(`/api/products/${prodId}/duplicate`, {
          method: 'POST',
        });
        AdminApp.toast(`Duplicated product: "${res.name}"`, 'success');
        await this.load();
      } catch (err) {
        AdminApp.toast(err.message || 'Duplicate product failed', 'error');
      }
    },

    switchTab(tabName) {
      document.querySelectorAll('.prod-tab-panel').forEach((el) => el.classList.add('hidden'));
      const target = document.getElementById(`product-tab-${tabName}`);
      if (target) target.classList.remove('hidden');

      document.querySelectorAll('.prod-tab-btn').forEach((btn) => {
        const isActive = btn.getAttribute('data-prod-tab') === tabName;
        btn.className = isActive
          ? 'prod-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white cursor-pointer whitespace-nowrap'
          : 'prod-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer whitespace-nowrap';
      });
    },

    slugify(text) {
      return String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    },

    syncSlugInputs(rawVal, markManual = false) {
      const slugEl = document.getElementById('product-modal-slug');
      const seoSlugEl = document.getElementById('product-modal-slug-seo');
      const cleaned = this.slugify(rawVal);
      const valToUse = markManual ? rawVal : cleaned;

      if (slugEl) {
        if (markManual) slugEl.dataset.manuallyEdited = 'true';
        if (document.activeElement !== slugEl) slugEl.value = valToUse;
      }
      if (seoSlugEl) {
        if (document.activeElement !== seoSlugEl) seoSlugEl.value = valToUse;
      }
      this.updateSeoPreview();
    },

    generateSlugFromName() {
      const name = document.getElementById('product-modal-name')?.value.trim() || '';
      const cleaned = this.slugify(name);
      this.syncSlugInputs(cleaned, true);
    },

    generateSlugFromSeo() {
      const seoTitle = document.getElementById('product-modal-seo-title')?.value.trim() || '';
      const name = document.getElementById('product-modal-name')?.value.trim() || '';
      const base = seoTitle.replace(/\s*[\-\|]\s*(M\.SHOP|MARJAAH|Qatar|Store|Shop).*$/i, '').trim() || name;
      const cleaned = this.slugify(base);
      this.syncSlugInputs(cleaned, true);
    },

    onNameInput(val) {
      const slugEl = document.getElementById('product-modal-slug');
      if (slugEl && !slugEl.dataset.manuallyEdited) {
        const nextSlug = this.slugify(val);
        slugEl.value = nextSlug;
        const seoSlugEl = document.getElementById('product-modal-slug-seo');
        if (seoSlugEl) seoSlugEl.value = nextSlug;
      }
      this.updateSeoPreview();
    },

    updateSeoPreview() {
      const name = document.getElementById('product-modal-name')?.value.trim() || 'Product Title';
      const slugRaw = document.getElementById('product-modal-slug')?.value.trim() || document.getElementById('product-modal-slug-seo')?.value.trim() || '';
      const slug = this.slugify(slugRaw) || this.slugify(name) || 'product-slug';
      const rawSeoTitle = document.getElementById('product-modal-seo-title')?.value || '';
      const rawMetaDesc = document.getElementById('product-modal-meta-desc')?.value || '';
      const seoTitle = rawSeoTitle.trim() || `${name} — M.SHOP Qatar`;
      const metaDesc = rawMetaDesc.trim() || 'Genuine tech products in Qatar with express delivery.';

      const titleCount = document.getElementById('product-modal-seo-title-count');
      if (titleCount) {
        titleCount.textContent = `${rawSeoTitle.length} / 60 chars`;
        titleCount.className = rawSeoTitle.length > 60
          ? 'text-[10px] font-mono font-bold text-amber-600'
          : 'text-[10px] font-mono text-slate-500';
      }
      const descCount = document.getElementById('product-modal-meta-desc-count');
      if (descCount) {
        descCount.textContent = `${rawMetaDesc.length} / 160 chars`;
        descCount.className = rawMetaDesc.length > 160
          ? 'text-[10px] font-mono font-bold text-amber-600'
          : 'text-[10px] font-mono text-slate-500';
      }

      const pUrl = document.getElementById('product-modal-seo-preview-url');
      if (pUrl) pUrl.textContent = `https://www.marjaah.shop/product/${slug}/`;
      const pTitle = document.getElementById('product-modal-seo-preview-title');
      if (pTitle) pTitle.textContent = seoTitle;
      const pDesc = document.getElementById('product-modal-seo-preview-desc');
      if (pDesc) pDesc.textContent = metaDesc;
    },

    addSpecRow(key = '', value = '') {
      const list = document.getElementById('product-modal-specs-list');
      if (!list) return;
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2 spec-row';
      row.innerHTML = `
        <input type="text" class="spec-key admin-input flex-1 text-xs" placeholder="Attribute (e.g. Display)" value="${String(key).replace(/"/g, '&quot;')}" />
        <input type="text" class="spec-val admin-input flex-1 text-xs" placeholder="Value (e.g. 6.7 OLED)" value="${String(value).replace(/"/g, '&quot;')}" />
        <button type="button" onclick="this.parentElement.remove()" class="px-2.5 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold hover:bg-rose-100 cursor-pointer">✕</button>
      `;
      list.appendChild(row);
    },

    addVariantRow(v = {}) {
      const list = document.getElementById('product-modal-variants-list');
      if (!list) return;
      const row = document.createElement('div');
      row.className = 'grid grid-cols-2 sm:grid-cols-7 gap-2 items-center variant-row p-2.5 rounded-xl border border-slate-200 bg-slate-50';
      if (v.image) row.dataset.variantImage = v.image;
      if (v.original_price) row.dataset.variantOrigPrice = v.original_price;
      row.innerHTML = `
        <input type="text" class="var-name admin-input text-xs" placeholder="Variant Name *" value="${String(v.name || '').replace(/"/g, '&quot;')}" />
        <input type="text" class="var-color admin-input text-xs" placeholder="Colour" value="${String(v.color || v.colour || '').replace(/"/g, '&quot;')}" />
        <input type="text" class="var-size admin-input text-xs" placeholder="Size / Spec" value="${String(v.size || v.spec || '').replace(/"/g, '&quot;')}" />
        <input type="number" step="0.01" class="var-price admin-input text-xs font-mono" placeholder="Price" value="${v.price !== undefined && v.price !== null ? v.price : ''}" />
        <input type="number" class="var-stock admin-input text-xs font-mono" placeholder="Stock" value="${v.stock !== undefined && v.stock !== null ? v.stock : ''}" />
        <input type="text" class="var-sku admin-input text-xs font-mono" placeholder="SKU" value="${String(v.sku || '').replace(/"/g, '&quot;')}" />
        <button type="button" onclick="this.parentElement.remove()" class="px-2.5 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold hover:bg-rose-100 cursor-pointer">Remove</button>
      `;
      list.appendChild(row);
    },

    openModal(prodId = null) {
      this.selectedProdId = prodId;
      this.switchTab('general');
      const form = document.getElementById('product-modal-form');
      if (form) form.reset();

      const specsList = document.getElementById('product-modal-specs-list');
      if (specsList) specsList.innerHTML = '';
      const variantsList = document.getElementById('product-modal-variants-list');
      if (variantsList) variantsList.innerHTML = '';
      const slugEl = document.getElementById('product-modal-slug');
      if (slugEl) delete slugEl.dataset.manuallyEdited;
      const seoSlugEl = document.getElementById('product-modal-slug-seo');
      if (seoSlugEl) seoSlugEl.value = '';

      this.populateFilterDropdowns();

      if (prodId) {
        const p = this.products.find((x) => x.id === prodId);
        if (!p) return;

        document.getElementById('product-modal-title').textContent = `Edit Product: ${p.name}`;
        document.getElementById('product-modal-name').value = p.name || '';
        const nameArEl = document.getElementById('product-modal-name-ar');
        if (nameArEl) nameArEl.value = p.name_ar || '';
        const resolvedSlug = p.slug || p.urlSlug || this.slugify(p.name);
        if (slugEl) {
          slugEl.value = resolvedSlug;
          if (p.slug) slugEl.dataset.manuallyEdited = 'true';
        }
        if (seoSlugEl) seoSlugEl.value = resolvedSlug;
        const skuEl = document.getElementById('product-modal-sku');
        if (skuEl) skuEl.value = p.sku || '';

        // Select Category & trigger Subcategories load
        const catSelect = document.getElementById('product-modal-category');
        const matchedCat = this.categories.find(
          (c) =>
            (p.category_id && c.id === p.category_id) ||
            (p.category_slug && c.slug === p.category_slug) ||
            (p.category && (c.slug === p.category || c.name?.toLowerCase() === String(p.category).toLowerCase())) ||
            (p.category_name && c.name?.toLowerCase() === String(p.category_name).toLowerCase()),
        );
        const catTarget = matchedCat ? matchedCat.id : (p.category_id || p.category_slug || '');
        if (catSelect) catSelect.value = catTarget;
        this.onModalCategoryChange(catTarget, p.subcategory_id || p.subcategory_slug || p.subcategory_name || p.subcategory);

        document.getElementById('product-modal-brand').value = p.brand || '';
        const colourEl = document.getElementById('product-modal-colour');
        if (colourEl) colourEl.value = p.colour || p.color || '';
        document.getElementById('product-modal-price').value = p.price || '';
        document.getElementById('product-modal-orig-price').value = p.original_price || '';
        document.getElementById('product-modal-stock').value = p.stock_count !== undefined ? p.stock_count : (p.stock || 0);
        document.getElementById('product-modal-status').value = p.status || 'active';

        const featEl = document.getElementById('product-modal-featured');
        if (featEl) featEl.checked = Boolean(p.is_featured || p.featured);
        const favEl = document.getElementById('product-modal-favorite');
        if (favEl) favEl.checked = Boolean(p.is_favorite || p.is_liked);
        const offerEl = document.getElementById('product-modal-offer');
        if (offerEl) offerEl.checked = Boolean(p.is_offer || p.is_on_sale || (p.original_price && Number(p.original_price) > Number(p.price)));
        const offerTitleEl = document.getElementById('product-modal-offer-title');
        if (offerTitleEl) offerTitleEl.value = p.offer_title || '';
        const offerBadgeEl = document.getElementById('product-modal-offer-badge');
        if (offerBadgeEl) offerBadgeEl.value = p.offer_badge || '';
        const offerDescEl = document.getElementById('product-modal-offer-description');
        if (offerDescEl) offerDescEl.value = p.offer_description || '';
        const offerPctEl = document.getElementById('product-modal-offer-quick-pct');
        if (offerPctEl) {
          const hasDrop = p.original_price && Number(p.original_price) > Number(p.price);
          offerPctEl.value = hasDrop
            ? Math.round(((Number(p.original_price) - Number(p.price)) / Number(p.original_price)) * 100)
            : (p.discount_percent || '');
        }

        const shortDescEl = document.getElementById('product-modal-short-desc');
        if (shortDescEl) shortDescEl.value = p.short_description || '';
        const shortDescArEl = document.getElementById('product-modal-short-desc-ar');
        if (shortDescArEl) shortDescArEl.value = p.short_description_ar || '';
        document.getElementById('product-modal-desc').value = p.description || '';
        const descArEl = document.getElementById('product-modal-desc-ar');
        if (descArEl) descArEl.value = p.description_ar || '';
        const boxEl = document.getElementById('product-modal-box');
        if (boxEl) boxEl.value = p.whats_in_box || '';
        const boxArEl = document.getElementById('product-modal-box-ar');
        if (boxArEl) boxArEl.value = p.whats_in_box_ar || '';
        const warrantyEl = document.getElementById('product-modal-warranty');
        if (warrantyEl) warrantyEl.value = p.warranty || '';
        const compEl = document.getElementById('product-modal-compatibility');
        if (compEl) compEl.value = Array.isArray(p.compatibility) ? p.compatibility.join(', ') : (p.compatibility || '');

        const seoTitleEl = document.getElementById('product-modal-seo-title');
        if (seoTitleEl) seoTitleEl.value = p.seo_title || '';
        const metaDescEl = document.getElementById('product-modal-meta-desc');
        if (metaDescEl) metaDescEl.value = p.meta_description || '';

        if (Array.isArray(p.specifications)) {
          p.specifications.forEach((s) => this.addSpecRow(s.key || s.label || '', s.value || s.val || ''));
        }
        if (Array.isArray(p.variants)) {
          p.variants.forEach((v) => this.addVariantRow(v));
        }

        // Populate up to 10 images (from p.images array/string + p.image)
        let imgs = [];
        if (Array.isArray(p.images)) {
          imgs = p.images.filter(Boolean);
        } else if (typeof p.images === 'string' && p.images.trim()) {
          try {
            const parsed = JSON.parse(p.images);
            if (Array.isArray(parsed)) imgs = parsed.filter(Boolean);
          } catch (e) {
            imgs = p.images.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
          }
        }
        if (p.image && !imgs.includes(p.image)) {
          imgs.unshift(p.image);
        }
        this.modalImages = Array.from(new Set(imgs)).slice(0, 10);
      } else {
        document.getElementById('product-modal-title').textContent = 'Add New Product';
        this.onModalCategoryChange(null);
        this.modalImages = [];
      }

      const urlInput = document.getElementById('product-modal-image-url-input');
      if (urlInput) urlInput.value = '';
      const fileInput = document.getElementById('product-modal-image-files');
      if (fileInput) fileInput.value = '';
      this.renderModalImages();
      this.updateSeoPreview();
      this.syncProductModalOfferPreview();

      document.getElementById('product-modal').classList.remove('hidden');
    },

    renderModalImages() {
      const grid = document.getElementById('product-modal-images-grid');
      const countEl = document.getElementById('product-modal-images-count');
      const hiddenPrimary = document.getElementById('product-modal-image');
      if (hiddenPrimary) hiddenPrimary.value = this.modalImages[0] || '';
      if (countEl) countEl.textContent = `${this.modalImages.length} / 10`;
      if (!grid) return;

      if (this.modalImages.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full flex items-center justify-center text-xs text-slate-400 py-4 text-center">
            No images added yet. Upload from gallery or paste an image URL above.
          </div>
        `;
        return;
      }

      grid.innerHTML = this.modalImages.map((imgUrl, idx) => {
        const isPrimary = idx === 0;
        const safeUrl = String(imgUrl).replace(/"/g, '&quot;');
        return `
          <div class="relative group rounded-xl overflow-hidden border ${isPrimary ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-slate-200'} bg-white aspect-square flex flex-col">
            <img src="${safeUrl}" alt="Product image ${idx + 1}" class="w-full h-full object-cover" onerror="this.src='/assets/images/products/placeholder.svg'" />
            <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isPrimary ? 'bg-indigo-600 text-white' : 'bg-black/70 text-slate-200'}">
              ${isPrimary ? 'Primary' : `#${idx + 1}`}
            </span>
            <button type="button" onclick="AdminProducts.removeModalImage(${idx})" title="Remove image"
              class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow cursor-pointer">
              ✕
            </button>
            ${!isPrimary ? `
              <button type="button" onclick="AdminProducts.setPrimaryImage(${idx})" title="Set as primary image"
                class="absolute bottom-1.5 left-1.5 right-1.5 py-1 rounded-lg bg-black/75 hover:bg-indigo-600 text-white text-[10px] font-bold text-center transition cursor-pointer">
                Set Primary
              </button>
            ` : ''}
          </div>
        `;
      }).join('');
    },

    addImageUrl() {
      const input = document.getElementById('product-modal-image-url-input');
      if (!input) return;
      const raw = input.value.trim();
      if (!raw) return;

      const candidates = raw
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const invalid = [];
      let addedCount = 0;

      for (const url of candidates) {
        if (this.modalImages.length >= 10) {
          AdminApp.toast('Maximum 10 images allowed per product.', 'error');
          break;
        }
        const isValidUrl = /^https?:\/\/.+/i.test(url) || /^\/[^\/].*/.test(url) || /^data:image\/.+/i.test(url);
        if (!isValidUrl) {
          invalid.push(url);
          continue;
        }
        if (!this.modalImages.includes(url)) {
          this.modalImages.push(url);
          addedCount++;
        }
      }

      if (invalid.length > 0) {
        AdminApp.toast('Please enter valid image URL(s) starting with https://, http://, or /', 'error');
      }
      if (addedCount > 0 || invalid.length === 0) {
        input.value = '';
      }
      this.renderModalImages();
    },

    removeModalImage(idx) {
      this.modalImages.splice(idx, 1);
      this.renderModalImages();
    },

    setPrimaryImage(idx) {
      if (idx <= 0 || idx >= this.modalImages.length) return;
      const [picked] = this.modalImages.splice(idx, 1);
      this.modalImages.unshift(picked);
      this.renderModalImages();
    },

    readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      });
    },

    async onImageFilesSelected(e) {
      const files = Array.from((e.target && e.target.files) || []);
      if (files.length === 0) return;

      const remaining = 10 - this.modalImages.length;
      if (remaining <= 0) {
        AdminApp.toast('Maximum 10 images allowed per product.', 'error');
        e.target.value = '';
        return;
      }

      const filesToUpload = files.slice(0, remaining);
      if (files.length > remaining) {
        AdminApp.toast(`Only ${remaining} more image(s) can be added (max 10).`, 'info');
      }

      const statusEl = document.getElementById('product-modal-upload-status');
      const uploadBtn = document.getElementById('product-modal-upload-btn');
      this.isUploadingImages = true;
      if (uploadBtn) uploadBtn.disabled = true;
      if (statusEl) {
        statusEl.classList.remove('hidden');
        statusEl.textContent = `Uploading 0 / ${filesToUpload.length}...`;
      }

      let uploadedCount = 0;
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        try {
          if (statusEl) statusEl.textContent = `Uploading ${i + 1} / ${filesToUpload.length}...`;
          const dataUrl = await this.readFileAsDataUrl(file);
          const res = await AdminApp.api('/api/upload/image', {
            method: 'POST',
            body: JSON.stringify({
              data: dataUrl,
              filename: file.name || `product_${Date.now()}_${i}.jpg`,
              folder: 'products',
            }),
          });
          if (res && res.url && !this.modalImages.includes(res.url)) {
            this.modalImages.push(res.url);
            uploadedCount++;
            this.renderModalImages();
          }
        } catch (err) {
          console.error('Image upload failed:', err);
          AdminApp.toast(`Failed to upload ${file.name}: ${err.message || 'Upload error'}`, 'error');
        }
      }

      this.isUploadingImages = false;
      if (uploadBtn) uploadBtn.disabled = false;
      if (statusEl) statusEl.classList.add('hidden');
      e.target.value = '';

      if (uploadedCount > 0) {
        AdminApp.toast(`Uploaded ${uploadedCount} image(s) to product gallery.`, 'success');
      }
    },

    closeModal() {
      document.getElementById('product-modal').classList.add('hidden');
    },

    setSaveLoading(isLoading, isEdit = false) {
      this.isSavingProduct = isLoading;
      const saveBtn = document.getElementById('product-modal-save-btn');
      const cancelBtn = document.getElementById('product-modal-cancel-btn');
      const spinner = document.getElementById('product-modal-save-spinner');
      const saveText = document.getElementById('product-modal-save-text');
      const progressBox = document.getElementById('product-modal-save-progress');
      const progressText = document.getElementById('product-modal-save-progress-text');

      if (saveBtn) {
        saveBtn.disabled = isLoading;
        saveBtn.classList.toggle('opacity-70', isLoading);
        saveBtn.classList.toggle('cursor-not-allowed', isLoading);
      }
      if (cancelBtn) {
        cancelBtn.disabled = isLoading;
        cancelBtn.classList.toggle('opacity-50', isLoading);
        cancelBtn.classList.toggle('cursor-not-allowed', isLoading);
      }
      if (spinner) spinner.classList.toggle('hidden', !isLoading);
      if (saveText) {
        saveText.textContent = isLoading
          ? (isEdit ? 'Updating Product...' : 'Adding Product...')
          : 'Save Product';
      }
      if (progressBox) progressBox.classList.toggle('hidden', !isLoading);
      if (progressText && isLoading) {
        progressText.textContent = isEdit
          ? 'Updating product details & syncing catalog...'
          : 'Creating product & syncing catalog...';
      }
    },

    applyModalQuickDiscount(pctVal) {
      const pct = Math.min(95, Math.max(0, Number(pctVal || 0)));
      const priceEl = document.getElementById('product-modal-price');
      const origEl = document.getElementById('product-modal-orig-price');
      const offerEl = document.getElementById('product-modal-offer');
      const badgeEl = document.getElementById('product-modal-offer-badge');
      const titleEl = document.getElementById('product-modal-offer-title');
      if (!priceEl || !origEl) return;

      let baseOrig = Number(origEl.value || 0);
      if (!baseOrig || baseOrig <= 0) {
        const cur = Number(priceEl.value || 0);
        if (cur > 0) {
          baseOrig = cur;
          origEl.value = cur;
        }
      }

      if (pct > 0 && baseOrig > 0) {
        priceEl.value = Number((baseOrig * (1 - pct / 100)).toFixed(2));
        if (offerEl) offerEl.checked = true;
        if (badgeEl && (!badgeEl.value.trim() || /^\s*\d+(\.\d+)?%\s*OFF\s*$/i.test(badgeEl.value))) {
          badgeEl.value = `${Math.round(pct)}% OFF`;
        }
        if (titleEl && !titleEl.value.trim()) {
          titleEl.value = 'Flash Deal';
        }
      } else if (pct === 0 && baseOrig > 0) {
        priceEl.value = baseOrig;
      }

      this.syncProductModalOfferPreview();
    },

    syncProductModalOfferPreview() {
      const previewEl = document.getElementById('product-modal-offer-preview');
      if (!previewEl) return;

      const isOfferChecked = Boolean(document.getElementById('product-modal-offer')?.checked);
      const price = Number(document.getElementById('product-modal-price')?.value || 0);
      const orig = Number(document.getElementById('product-modal-orig-price')?.value || 0);
      const badge = (document.getElementById('product-modal-offer-badge')?.value || '').trim();
      const title = (document.getElementById('product-modal-offer-title')?.value || '').trim();

      const hasDrop = orig > price && price >= 0;
      const pct = hasDrop ? Math.round(((orig - price) / orig) * 100) : 0;
      const diff = hasDrop ? Number((orig - price).toFixed(2)) : 0;

      if (hasDrop) {
        previewEl.textContent = `Save ${diff} QAR (-${pct}% OFF)`;
        previewEl.classList.remove('hidden');
      } else if (isOfferChecked || badge || title) {
        previewEl.textContent = badge || title || 'Special Offer Active';
        previewEl.classList.remove('hidden');
      } else {
        previewEl.classList.add('hidden');
      }
    },

    async saveProduct(e) {
      e.preventDefault();
      if (this.isSavingProduct) return;
      if (this.isUploadingImages) {
        AdminApp.toast('Please wait for image uploads to finish.', 'info');
        return;
      }

      const pendingUrlInput = document.getElementById('product-modal-image-url-input');
      if (pendingUrlInput && pendingUrlInput.value.trim()) {
        this.addImageUrl();
      }

      const isEdit = Boolean(this.selectedProdId);
      const name = document.getElementById('product-modal-name').value.trim();
      const name_ar = document.getElementById('product-modal-name-ar')?.value.trim() || '';
      const rawSlugVal = document.getElementById('product-modal-slug')?.value.trim() || document.getElementById('product-modal-slug-seo')?.value.trim() || '';
      const seo_title = document.getElementById('product-modal-seo-title')?.value.trim() || '';
      const slug = this.slugify(rawSlugVal) || this.slugify(seo_title.replace(/\s*[\-\|]\s*(M\.SHOP|MARJAAH|Qatar|Store|Shop).*$/i, '')) || this.slugify(name);
      const sku = document.getElementById('product-modal-sku')?.value.trim() || undefined;
      const categoryId = document.getElementById('product-modal-category').value;
      const subcategoryId = document.getElementById('product-modal-subcategory').value;
      const brand = document.getElementById('product-modal-brand').value.trim();
      const colour = document.getElementById('product-modal-colour')?.value.trim() || '';
      const price = Number(document.getElementById('product-modal-price').value);
      const origRaw = document.getElementById('product-modal-orig-price').value;
      const original_price = origRaw !== '' ? Number(origRaw) : (isEdit ? null : undefined);
      const stock_count = Number(document.getElementById('product-modal-stock').value);
      const status = document.getElementById('product-modal-status').value;
      const is_featured = Boolean(document.getElementById('product-modal-featured')?.checked);
      const is_favorite = Boolean(document.getElementById('product-modal-favorite')?.checked);
      const hasPriceDrop = Boolean(original_price && original_price > price);
      const offerChecked = Boolean(document.getElementById('product-modal-offer')?.checked);
      const is_offer = Boolean(offerChecked || hasPriceDrop);
      const offer_title = is_offer ? (document.getElementById('product-modal-offer-title')?.value.trim() || '') : '';
      const offer_badge = is_offer ? (document.getElementById('product-modal-offer-badge')?.value.trim() || '') : '';
      const offer_description = is_offer ? (document.getElementById('product-modal-offer-description')?.value.trim() || '') : '';
      const discount_percent = hasPriceDrop
        ? Math.round(((Number(original_price) - price) / Number(original_price)) * 100)
        : (isEdit && !is_offer ? null : undefined);
      const images = this.modalImages.slice(0, 10);
      const image = images[0] || '';
      const short_description = document.getElementById('product-modal-short-desc')?.value.trim() || '';
      const short_description_ar = document.getElementById('product-modal-short-desc-ar')?.value.trim() || '';
      const description = document.getElementById('product-modal-desc').value.trim();
      const description_ar = document.getElementById('product-modal-desc-ar')?.value.trim() || '';
      const whats_in_box = document.getElementById('product-modal-box')?.value.trim() || '';
      const whats_in_box_ar = document.getElementById('product-modal-box-ar')?.value.trim() || '';
      const warranty = document.getElementById('product-modal-warranty')?.value.trim() || '';
      const compatibility = document.getElementById('product-modal-compatibility')?.value.trim() || '';
      const meta_description = document.getElementById('product-modal-meta-desc')?.value.trim() || '';

      const specifications = Array.from(document.querySelectorAll('#product-modal-specs-list .spec-row'))
        .map((row) => ({
          key: row.querySelector('.spec-key')?.value.trim() || '',
          value: row.querySelector('.spec-val')?.value.trim() || '',
        }))
        .filter((s) => s.key || s.value);

      const variants = Array.from(document.querySelectorAll('#product-modal-variants-list .variant-row'))
        .map((row) => {
          const vName = row.querySelector('.var-name')?.value.trim() || '';
          const vColor = row.querySelector('.var-color')?.value.trim() || '';
          const vSize = row.querySelector('.var-size')?.value.trim() || '';
          const vPrice = row.querySelector('.var-price')?.value;
          const vStock = row.querySelector('.var-stock')?.value;
          const vSku = row.querySelector('.var-sku')?.value.trim() || '';
          const resolvedName = vName || [vColor, vSize].filter(Boolean).join(' / ');
          if (!resolvedName && !vPrice && !vStock && !vSku) return null;
          return {
            name: resolvedName || 'Variant',
            ...(vColor ? { color: vColor } : {}),
            ...(vSize ? { size: vSize } : {}),
            price: vPrice !== '' && vPrice !== undefined ? Number(vPrice) : undefined,
            stock: vStock !== '' && vStock !== undefined ? Number(vStock) : undefined,
            sku: vSku || undefined,
            ...(row.dataset.variantImage ? { image: row.dataset.variantImage } : {}),
            ...(row.dataset.variantOrigPrice ? { original_price: Number(row.dataset.variantOrigPrice) } : {}),
          };
        })
        .filter(Boolean);

      if (!name) {
        AdminApp.toast('Product title is required', 'error');
        return;
      }
      if (!categoryId) {
        AdminApp.toast('Please select a category', 'error');
        return;
      }
      if (!subcategoryId) {
        AdminApp.toast('Please select a subcategory', 'error');
        return;
      }

      // Resolve full category and subcategory objects
      const selectedCat = this.categories.find((c) => c.id === categoryId || c.slug === categoryId);
      const selectedSub = this.subcategories.find((s) => s.id === subcategoryId || s.slug === subcategoryId);

      const existingProd = isEdit ? this.products.find((x) => x.id === this.selectedProdId) : null;
      let offer_previous_state = existingProd?.offer_previous_state || null;
      if (isEdit && existingProd) {
        const wasOffer = Boolean(existingProd.is_offer || existingProd.is_on_sale || (existingProd.original_price && Number(existingProd.original_price) > Number(existingProd.price)) || existingProd.offer_badge || existingProd.offer_title);
        if (!wasOffer && is_offer && !offer_previous_state) {
          offer_previous_state = {
            price: Number(existingProd.price || 0),
            original_price: existingProd.original_price ? Number(existingProd.original_price) : null,
            is_offer: Boolean(existingProd.is_offer),
            is_on_sale: Boolean(existingProd.is_on_sale),
            offer_type: existingProd.offer_type || '',
            offer_title: existingProd.offer_title || '',
            offer_badge: existingProd.offer_badge || '',
            offer_description: existingProd.offer_description || '',
            discount_percent: existingProd.discount_percent !== undefined && existingProd.discount_percent !== null ? Number(existingProd.discount_percent) : null,
          };
        } else if (!is_offer) {
          offer_previous_state = null;
        }
      }

      const payload = {
        name,
        name_ar,
        slug,
        sku,
        category_id: selectedCat ? selectedCat.id : categoryId,
        category_slug: selectedCat ? selectedCat.slug : categoryId,
        category_name: selectedCat ? selectedCat.name : categoryId,
        category: selectedCat ? selectedCat.name : categoryId,
        subcategory_id: selectedSub ? selectedSub.id : subcategoryId,
        subcategory_slug: selectedSub ? selectedSub.slug : subcategoryId,
        subcategory_name: selectedSub ? selectedSub.name : subcategoryId,
        subcategory: selectedSub ? selectedSub.name : subcategoryId,
        brand,
        colour,
        price,
        original_price,
        stock_count,
        in_stock: stock_count > 0,
        status,
        is_featured,
        is_favorite,
        is_liked: is_favorite,
        is_offer,
        is_on_sale: is_offer,
        offer_title,
        offer_badge,
        offer_description,
        discount_percent,
        offer_previous_state,
        ...(isEdit && !is_offer ? { offer_type: '' } : {}),
        image,
        images,
        short_description,
        short_description_ar,
        description,
        description_ar,
        whats_in_box,
        whats_in_box_ar,
        warranty,
        compatibility,
        specifications,
        variants,
        seo_title,
        meta_description,
      };

      this.setSaveLoading(true, isEdit);

      try {
        if (!isEdit) {
          const res = await AdminApp.api('/api/products', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          const created = res.product || { ...payload, id: res.id || 'prod_' + Date.now() };
          window.SmartCache?.updateProduct(created);

          if (res.status === 'pending_approval') {
            AdminApp.toast('Product saved and queued for Administrator Approval.', 'info');
          } else {
            AdminApp.toast('Product created and published successfully.', 'success');
          }
        } else {
          const res = await AdminApp.api(`/api/products/${this.selectedProdId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          const updated = res.product || { ...payload, id: this.selectedProdId };
          window.SmartCache?.updateProduct(updated);

          if (res.status === 'pending_approval') {
            AdminApp.toast('Modifications queued for Administrator Approval.', 'info');
          } else {
            AdminApp.toast('Product updated successfully.', 'success');
          }
        }
        this.closeModal();
        await this.load();
        AdminApp.updatePendingBadges();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to save product', 'error');
      } finally {
        this.setSaveLoading(false, isEdit);
      }
    },

    offerTargetId: null,
    offerBasePrice: 0,
    offerBadgeCustom: false,
    isSavingOffer: false,

    openOfferModal(prodId) {
      const p = this.products.find((x) => x.id === prodId);
      if (!p) return;

      this.offerTargetId = prodId;
      const curPrice = Number(p.price || 0);
      const origPrice = p.original_price && Number(p.original_price) > curPrice ? Number(p.original_price) : 0;
      const isAlreadyOffer = Boolean(p.is_offer || p.is_on_sale || origPrice > curPrice || p.offer_badge || p.offer_title);

      this.offerBasePrice = origPrice > curPrice ? origPrice : curPrice;

      const imgEl = document.getElementById('offer-modal-prod-img');
      if (imgEl) imgEl.src = p.image || (Array.isArray(p.images) && p.images[0]) || '/assets/images/products/placeholder.svg';
      const nameEl = document.getElementById('offer-modal-prod-name');
      if (nameEl) nameEl.textContent = p.name || 'Product';
      const metaEl = document.getElementById('offer-modal-prod-meta');
      if (metaEl) {
        metaEl.textContent = `SKU: ${p.sku || '—'} • Regular Price: ${this.offerBasePrice} QAR${origPrice > curPrice ? ` (Current Deal: ${curPrice} QAR)` : ''}`;
      }

      const typeEl = document.getElementById('offer-modal-type');
      const percentEl = document.getElementById('offer-modal-percent');
      const amountEl = document.getElementById('offer-modal-amount-off');
      const origEl = document.getElementById('offer-modal-orig-price');
      const priceEl = document.getElementById('offer-modal-price');
      const titleEl = document.getElementById('offer-modal-title');
      const badgeEl = document.getElementById('offer-modal-badge');
      const descEl = document.getElementById('offer-modal-description');
      const removeWrap = document.getElementById('offer-modal-remove-wrap');
      const restoreChk = document.getElementById('offer-modal-restore-price');
      const restoreLabel = document.getElementById('offer-modal-restore-label');

      let detectedType = p.offer_type || '';
      if (!detectedType) {
        if (isAlreadyOffer && origPrice > curPrice) {
          detectedType = 'custom_price';
        } else if (isAlreadyOffer && !origPrice) {
          detectedType = 'promo_badge';
        } else {
          detectedType = 'percent_discount';
        }
      }

      if (typeEl) typeEl.value = detectedType;
      if (origEl) origEl.value = origPrice > 0 ? origPrice : (detectedType === 'promo_badge' ? '' : this.offerBasePrice);

      const currentPct = origPrice > curPrice ? Math.max(1, Math.round(((origPrice - curPrice) / origPrice) * 100)) : 10;
      const currentAmountOff = origPrice > curPrice ? Number((origPrice - curPrice).toFixed(2)) : Math.max(1, Math.round(curPrice * 0.1));
      if (percentEl) percentEl.value = p.discount_percent ? Number(p.discount_percent) : currentPct;
      if (amountEl) amountEl.value = currentAmountOff;

      if (priceEl) {
        priceEl.value = isAlreadyOffer ? curPrice : (detectedType === 'promo_badge' ? curPrice : Number((this.offerBasePrice * (1 - Number(percentEl?.value || 10) / 100)).toFixed(2)));
      }

      if (titleEl) titleEl.value = p.offer_title || 'Flash Deal';
      const existingBadge = (p.offer_badge || '').trim();
      const isAutoStyleBadge = !existingBadge || /^(EXTRA\s+)?\d+(\.\d+)?%\s*OFF$/i.test(existingBadge) || /^SAVE\s+[\d.]+\s+QAR$/i.test(existingBadge);
      this.offerBadgeCustom = !isAutoStyleBadge;
      if (badgeEl) {
        delete badgeEl.dataset.manuallyEdited;
        if (this.offerBadgeCustom) badgeEl.dataset.manuallyEdited = 'true';
        badgeEl.value = existingBadge || (detectedType === 'promo_badge' ? 'SPECIAL OFFER' : `${percentEl?.value || 10}% OFF`);
      }
      if (descEl) descEl.value = p.offer_description || '';

      if (removeWrap) {
        removeWrap.classList.toggle('hidden', !isAlreadyOffer);
      }
      const prevSnap = p.offer_previous_state && typeof p.offer_previous_state === 'object' ? p.offer_previous_state : null;
      const prevWasOffer = Boolean(
        prevSnap && (prevSnap.is_offer || prevSnap.is_on_sale || (prevSnap.original_price && Number(prevSnap.original_price) > Number(prevSnap.price)) || prevSnap.offer_badge || prevSnap.offer_title),
      );
      if (restoreChk) {
        restoreChk.checked = Boolean(prevSnap || origPrice > curPrice);
      }
      if (restoreLabel) {
        if (prevSnap) {
          restoreLabel.textContent = prevWasOffer
            ? `Roll back to previous offer (${Number(prevSnap.price || 0)} QAR${prevSnap.original_price ? `, was ${prevSnap.original_price} QAR` : ''}${prevSnap.offer_badge ? ` • ${prevSnap.offer_badge}` : ''})`
            : `Remove special offer & restore old pricing (${Number(prevSnap.price || 0)} QAR)`;
        } else if (origPrice > curPrice) {
          restoreLabel.textContent = `Restore selling price to ${origPrice} QAR when removing deal`;
        } else {
          restoreLabel.textContent = 'Clear special offer badge & campaign fields';
        }
      }

      this.syncOfferTypeFields(detectedType, !isAlreadyOffer);
      this.updateOfferPreview();

      const modal = document.getElementById('product-offer-modal');
      if (modal) modal.classList.remove('hidden');
    },

    closeOfferModal() {
      this.offerTargetId = null;
      const modal = document.getElementById('product-offer-modal');
      if (modal) modal.classList.add('hidden');
    },

    syncOfferTypeFields(type, shouldRecalc = false) {
      const pctWrap = document.getElementById('offer-modal-percent-wrap');
      const amtWrap = document.getElementById('offer-modal-amount-wrap');
      const origEl = document.getElementById('offer-modal-orig-price');
      const priceEl = document.getElementById('offer-modal-price');

      if (pctWrap) pctWrap.classList.toggle('hidden', type !== 'percent_discount');
      if (amtWrap) amtWrap.classList.toggle('hidden', type !== 'fixed_discount');

      const autoReadOnly = type === 'percent_discount' || type === 'fixed_discount';
      if (priceEl) {
        priceEl.readOnly = autoReadOnly;
        priceEl.classList.toggle('bg-slate-100', autoReadOnly);
      }
      if (type === 'promo_badge' && origEl && !origEl.value) {
        origEl.placeholder = 'Optional regular price';
      } else if (origEl) {
        origEl.placeholder = 'Original price before offer';
      }

      if (shouldRecalc) {
        if (type !== 'promo_badge' && origEl && (!origEl.value || Number(origEl.value) <= 0)) {
          origEl.value = this.offerBasePrice || '';
        }
        this.recalculateOfferModal('type');
      }
    },

    onOfferTypeChange() {
      const type = document.getElementById('offer-modal-type')?.value || 'percent_discount';
      const p = this.products.find((x) => x.id === this.offerTargetId);
      const badgeEl = document.getElementById('offer-modal-badge');
      if (badgeEl && !badgeEl.dataset.manuallyEdited && !this.offerBadgeCustom && type === 'promo_badge') {
        badgeEl.value = p?.offer_badge || 'SPECIAL OFFER';
      }
      this.syncOfferTypeFields(type, true);
    },

    setOfferPercentPreset(pct) {
      const typeEl = document.getElementById('offer-modal-type');
      if (typeEl) typeEl.value = 'percent_discount';
      const pctEl = document.getElementById('offer-modal-percent');
      if (pctEl) pctEl.value = pct;
      const badgeEl = document.getElementById('offer-modal-badge');
      if (badgeEl && !this.offerBadgeCustom) {
        delete badgeEl.dataset.manuallyEdited;
      }
      this.syncOfferTypeFields('percent_discount', true);
    },

    setOfferTitlePreset(title) {
      const el = document.getElementById('offer-modal-title');
      if (el) el.value = title;
      this.updateOfferPreview();
    },

    setOfferBadgePreset(badge) {
      const el = document.getElementById('offer-modal-badge');
      if (el) {
        el.value = badge;
        el.dataset.manuallyEdited = 'true';
        this.offerBadgeCustom = true;
      }
      this.updateOfferPreview();
    },

    recalculateOfferModal(source = '') {
      const type = document.getElementById('offer-modal-type')?.value || 'percent_discount';
      const pctEl = document.getElementById('offer-modal-percent');
      const amtEl = document.getElementById('offer-modal-amount-off');
      const origEl = document.getElementById('offer-modal-orig-price');
      const priceEl = document.getElementById('offer-modal-price');
      const badgeEl = document.getElementById('offer-modal-badge');

      const orig = Number(origEl?.value || this.offerBasePrice || 0);

      if (type === 'percent_discount') {
        const pct = Math.min(95, Math.max(0, Number(pctEl?.value || 0)));
        if (orig > 0 && priceEl) {
          const nextPrice = Number((orig * (1 - pct / 100)).toFixed(2));
          priceEl.value = nextPrice;
        }
        if (badgeEl && !badgeEl.dataset.manuallyEdited && !this.offerBadgeCustom && pct > 0) {
          badgeEl.value = `${Math.round(pct)}% OFF`;
        }
      } else if (type === 'fixed_discount') {
        const off = Math.max(0, Number(amtEl?.value || 0));
        if (orig > 0 && priceEl) {
          const nextPrice = Number(Math.max(1, orig - off).toFixed(2));
          priceEl.value = nextPrice;
        }
        if (badgeEl && !badgeEl.dataset.manuallyEdited && !this.offerBadgeCustom && off > 0) {
          badgeEl.value = `SAVE ${Math.round(off)} QAR`;
        }
      } else if (type === 'custom_price') {
        const sell = Number(priceEl?.value || 0);
        if (orig > sell && orig > 0 && badgeEl && !badgeEl.dataset.manuallyEdited && !this.offerBadgeCustom) {
          const pct = Math.round(((orig - sell) / orig) * 100);
          badgeEl.value = pct > 0 ? `${pct}% OFF` : 'SPECIAL OFFER';
        }
      } else if (type === 'promo_badge' && source === 'type') {
        const p = this.products.find((x) => x.id === this.offerTargetId);
        if (priceEl && p) priceEl.value = Number(p.price || 0);
      }

      this.updateOfferPreview();
    },

    updateOfferPreview() {
      const origVal = Number(document.getElementById('offer-modal-orig-price')?.value || 0);
      const priceVal = Number(document.getElementById('offer-modal-price')?.value || 0);
      const titleVal = (document.getElementById('offer-modal-title')?.value || '').trim();
      const badgeVal = (document.getElementById('offer-modal-badge')?.value || '').trim();
      const descVal = (document.getElementById('offer-modal-description')?.value || '').trim();

      const pBadge = document.getElementById('offer-modal-preview-badge');
      const pTitle = document.getElementById('offer-modal-preview-title');
      const pPrice = document.getElementById('offer-modal-preview-price');
      const pSave = document.getElementById('offer-modal-preview-savings');
      const pDesc = document.getElementById('offer-modal-preview-desc');

      const hasDrop = origVal > priceVal && priceVal >= 0;
      const pct = hasDrop ? Math.round(((origVal - priceVal) / origVal) * 100) : 0;
      const diff = hasDrop ? Number((origVal - priceVal).toFixed(2)) : 0;

      if (pBadge) pBadge.textContent = badgeVal || (pct > 0 ? `${pct}% OFF` : 'SPECIAL OFFER');
      if (pTitle) pTitle.textContent = titleVal || 'Special Deal';
      if (pPrice) {
        pPrice.innerHTML = hasDrop
          ? `${priceVal.toLocaleString()} QAR <del class="text-xs font-normal text-slate-400 ml-1.5">${origVal.toLocaleString()} QAR</del>`
          : `${priceVal.toLocaleString()} QAR`;
      }
      if (pSave) {
        if (hasDrop && diff > 0) {
          pSave.textContent = `Save ${diff.toLocaleString()} QAR (-${pct}%)`;
          pSave.classList.remove('hidden');
        } else {
          pSave.classList.add('hidden');
        }
      }
      if (pDesc) {
        if (descVal) {
          pDesc.textContent = descVal;
          pDesc.classList.remove('hidden');
        } else {
          pDesc.classList.add('hidden');
        }
      }
    },

    async saveOfferModal(e) {
      e.preventDefault();
      if (this.isSavingOffer || !this.offerTargetId) return;
      const prodId = this.offerTargetId;
      const p = this.products.find((x) => x.id === prodId);
      if (!p) return;

      const offer_type = document.getElementById('offer-modal-type')?.value || 'percent_discount';
      const priceVal = Number(document.getElementById('offer-modal-price')?.value);
      const rawOrigVal = document.getElementById('offer-modal-orig-price')?.value;
      const origNum = rawOrigVal !== '' && rawOrigVal !== undefined ? Number(rawOrigVal) : null;
      const offer_title = (document.getElementById('offer-modal-title')?.value || '').trim();
      const offer_badge = (document.getElementById('offer-modal-badge')?.value || '').trim();
      const offer_description = (document.getElementById('offer-modal-description')?.value || '').trim();

      if (isNaN(priceVal) || priceVal <= 0) {
        AdminApp.toast('Special offer selling price must be greater than 0 QAR.', 'error');
        return;
      }
      if (!offer_title || !offer_badge) {
        AdminApp.toast('Please specify both Offer Title and Offer Badge Tag.', 'error');
        return;
      }
      if (offer_type !== 'promo_badge' && (!origNum || origNum <= priceVal)) {
        AdminApp.toast('For price discounts, Original Price must be higher than Offer Selling Price (or switch Offer Type to Campaign / Promo Offer).', 'error');
        return;
      }

      const finalOrig = origNum && origNum > priceVal ? origNum : null;
      const discount_percent = finalOrig ? Math.round(((finalOrig - priceVal) / finalOrig) * 100) : null;

      // Preserve original pre-special-offer state across multiple special offer edits so rollback ALWAYS returns to the old offer or old pricing
      const existingPrev = p.offer_previous_state && typeof p.offer_previous_state === 'object' ? p.offer_previous_state : null;
      const offer_previous_state = existingPrev || {
        price: Number(p.price || 0),
        original_price: p.original_price ? Number(p.original_price) : null,
        is_offer: Boolean(p.is_offer),
        is_on_sale: Boolean(p.is_on_sale),
        offer_type: p.offer_type || '',
        offer_title: p.offer_title || '',
        offer_badge: p.offer_badge || '',
        offer_description: p.offer_description || '',
        discount_percent: p.discount_percent !== undefined && p.discount_percent !== null ? Number(p.discount_percent) : null,
      };

      const payload = {
        is_offer: true,
        is_on_sale: true,
        offer_type,
        offer_title,
        offer_badge,
        offer_description,
        price: priceVal,
        original_price: finalOrig,
        discount_percent,
        offer_previous_state,
      };

      const btn = document.getElementById('offer-modal-save-btn');
      const spin = document.getElementById('offer-modal-save-spinner');
      const btnText = document.getElementById('offer-modal-save-text');
      this.isSavingOffer = true;
      if (btn) btn.disabled = true;
      if (spin) spin.classList.remove('hidden');
      if (btnText) btnText.textContent = 'Saving Deal...';

      try {
        const res = await AdminApp.api(`/api/products/${prodId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const updated = res?.product || { ...p, ...payload };
        Object.assign(p, updated);
        window.SmartCache?.updateProduct(p);
        this.renderTable();
        this.closeOfferModal();
        AdminApp.toast(`Special offer saved: ${offer_badge} (${offer_title}) 🔥`, 'success');
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to save special offer', 'error');
      } finally {
        this.isSavingOffer = false;
        if (btn) btn.disabled = false;
        if (spin) spin.classList.add('hidden');
        if (btnText) btnText.textContent = 'Save Special Offer';
      }
    },

    async removeOffer(prodId, restorePrice = true) {
      const p = this.products.find((x) => x.id === prodId);
      if (!p) return;

      const lockKey = `${prodId}:offer`;
      if (this.pendingFlagKeys.has(lockKey)) return;

      const prevSnapshot = {
        is_offer: p.is_offer,
        is_on_sale: p.is_on_sale,
        offer_type: p.offer_type,
        offer_title: p.offer_title,
        offer_badge: p.offer_badge,
        offer_description: p.offer_description,
        discount_percent: p.discount_percent,
        price: p.price,
        original_price: p.original_price,
        offer_previous_state: p.offer_previous_state || null,
      };

      const curPrice = Number(p.price || 0);
      const origPrice = p.original_price ? Number(p.original_price) : null;
      const savedPrev = p.offer_previous_state && typeof p.offer_previous_state === 'object' ? p.offer_previous_state : null;

      let payload;
      let successMsg;
      if (restorePrice && savedPrev) {
        const restoredPrice = Number(savedPrev.price || 0);
        const restoredOrig = savedPrev.original_price ? Number(savedPrev.original_price) : null;
        const restoredIsOffer = Boolean(
          savedPrev.is_offer || savedPrev.is_on_sale || (restoredOrig && restoredOrig > restoredPrice) || savedPrev.offer_badge || savedPrev.offer_title,
        );
        payload = {
          price: restoredPrice,
          original_price: restoredOrig,
          is_offer: restoredIsOffer,
          is_on_sale: restoredIsOffer,
          offer_type: savedPrev.offer_type || '',
          offer_title: savedPrev.offer_title || '',
          offer_badge: savedPrev.offer_badge || '',
          offer_description: savedPrev.offer_description || '',
          discount_percent: savedPrev.discount_percent !== undefined && savedPrev.discount_percent !== null ? Number(savedPrev.discount_percent) : null,
          offer_previous_state: null,
        };
        successMsg = restoredIsOffer
          ? `Rolled back to previous offer (${restoredPrice} QAR${restoredOrig ? `, regular ${restoredOrig} QAR` : ''}).`
          : `Special offer removed & old pricing restored (${restoredPrice} QAR).`;
      } else {
        const shouldRestoreOrig = Boolean(restorePrice && origPrice && origPrice > curPrice);
        payload = {
          is_offer: false,
          is_on_sale: false,
          offer_type: '',
          offer_title: '',
          offer_badge: '',
          offer_description: '',
          discount_percent: null,
          original_price: null,
          offer_previous_state: null,
          ...(shouldRestoreOrig ? { price: origPrice } : {}),
        };
        successMsg = shouldRestoreOrig
          ? `Special offer removed & price restored to ${origPrice} QAR.`
          : 'Special offer removed.';
      }

      this.pendingFlagKeys.add(lockKey);
      Object.assign(p, payload);
      window.SmartCache?.updateProduct(p);
      this.renderTable();

      try {
        const res = await AdminApp.api(`/api/products/${prodId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const updated = res?.product || { ...p, ...payload };
        Object.assign(p, updated);
        window.SmartCache?.updateProduct(p);
        AdminApp.toast(successMsg, 'success');
      } catch (err) {
        Object.assign(p, prevSnapshot);
        window.SmartCache?.updateProduct(p);
        AdminApp.toast(err.message || 'Failed to remove special offer — reverted', 'error');
      } finally {
        this.pendingFlagKeys.delete(lockKey);
        this.renderTable();
      }
    },

    async removeOfferFromModal() {
      const prodId = this.offerTargetId;
      if (!prodId) return;
      const restore = Boolean(document.getElementById('offer-modal-restore-price')?.checked);
      this.closeOfferModal();
      await this.removeOffer(prodId, restore);
    },

    openActionMenu(event, prodId) {
      event.stopPropagation();
      const menu = document.getElementById('products-action-menu');
      const p = this.products.find((x) => x.id === prodId);
      if (!menu || !p) return;

      const isFeat = Boolean(p.is_featured || p.featured);
      const isFav = Boolean(p.is_favorite || p.is_liked);
      const isOffer = Boolean(p.is_offer || p.is_on_sale || (p.original_price && Number(p.original_price) > Number(p.price)) || p.offer_badge || p.offer_title);
      const hasPrevOfferSnap = Boolean(p.offer_previous_state && typeof p.offer_previous_state === 'object');
      const activeOfferSummary = isOffer ? (p.offer_badge || p.offer_title || 'Active') : '';
      const storeUrl = `/product/${encodeURIComponent(p.slug || p.id)}/`;

      menu.innerHTML = `
        <div class="px-3.5 py-2 border-b border-slate-100">
          <p class="font-bold text-slate-900 truncate">${p.name || 'Product'}</p>
          <p class="text-[10px] font-mono text-slate-400 truncate">${p.id}</p>
        </div>
        <button type="button" onclick="AdminProducts.closeActionMenu();AdminProducts.openModal('${p.id}')" class="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer">
          <span>✏️</span><span>Edit Product</span>
        </button>
        <button type="button" onclick="AdminProducts.closeActionMenu();AdminProducts.duplicateProduct('${p.id}')" class="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer">
          <span>📋</span><span>Duplicate Product</span>
        </button>
        <button type="button" onclick="AdminProducts.closeActionMenu();AdminProducts.toggleFlag('${p.id}', 'featured')" class="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer">
          <span>⭐</span><span>${isFeat ? 'Remove Featured' : 'Feature on Homepage'}</span>
        </button>
        <button type="button" onclick="AdminProducts.closeActionMenu();AdminProducts.toggleFlag('${p.id}', 'favorite')" class="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer">
          <span>❤️</span><span>${isFav ? 'Remove from Liked' : 'Add to Liked / Showcase'}</span>
        </button>
        <button type="button" onclick="AdminProducts.closeActionMenu();AdminProducts.openOfferModal('${p.id}')" class="w-full px-3.5 py-2 text-left flex items-center justify-between gap-2 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer">
          <span class="flex items-center gap-2.5"><span>🔥</span><span>${isOffer ? 'Edit Special Deal' : 'Add Special Deal'}</span></span>
          ${activeOfferSummary ? `<span class="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-bold truncate max-w-[85px]">${activeOfferSummary}</span>` : ''}
        </button>
        ${isOffer ? `
        <button type="button" onclick="AdminProducts.closeActionMenu();AdminProducts.removeOffer('${p.id}', true)" class="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-amber-700 hover:bg-amber-50 font-semibold cursor-pointer">
          <span>↩️</span><span>${hasPrevOfferSnap ? 'Roll Back Special Deal' : 'Remove Special Deal'}</span>
        </button>` : ''}
        <a href="${storeUrl}" target="_blank" onclick="AdminProducts.closeActionMenu()" class="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 font-semibold">
          <span>🔗</span><span>View on Store</span>
        </a>
        <div class="my-1 border-t border-slate-100"></div>
        <button type="button" onclick="AdminProducts.closeActionMenu();AdminProducts.deleteProduct('${p.id}')" class="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 font-bold cursor-pointer">
          <span>🗑️</span><span>Delete Product</span>
        </button>
      `;

      menu.classList.remove('hidden');
      const rect = event.currentTarget.getBoundingClientRect();
      const menuW = 240;
      const menuH = menu.offsetHeight || 290;
      const left = Math.max(8, Math.min(window.innerWidth - menuW - 8, rect.right - menuW));
      const top = rect.bottom + menuH + 8 > window.innerHeight
        ? Math.max(8, rect.top - menuH - 6)
        : rect.bottom + 6;
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    },

    closeActionMenu() {
      const menu = document.getElementById('products-action-menu');
      if (menu) menu.classList.add('hidden');
    },

    deleteTargetId: null,

    deleteProduct(prodId) {
      const p = this.products.find((x) => x.id === prodId);
      this.deleteTargetId = prodId;
      const nameEl = document.getElementById('products-delete-name');
      if (nameEl) nameEl.textContent = p ? p.name : 'this product';
      const modal = document.getElementById('products-delete-modal');
      if (modal) modal.classList.remove('hidden');
    },

    closeDeleteModal() {
      this.deleteTargetId = null;
      const modal = document.getElementById('products-delete-modal');
      if (modal) modal.classList.add('hidden');
    },

    async executeDeleteProduct() {
      const prodId = this.deleteTargetId;
      if (!prodId) return;

      const btn = document.getElementById('products-delete-confirm-btn');
      const btnText = document.getElementById('products-delete-btn-text');
      if (btn) btn.disabled = true;
      if (btnText) btnText.textContent = 'Deleting...';

      try {
        await AdminApp.api(`/api/products/${prodId}`, {
          method: 'DELETE',
        });
        window.SmartCache?.removeProduct(prodId);
        AdminApp.toast('Product deleted successfully.', 'success');
        this.closeDeleteModal();
        await this.load();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to delete product', 'error');
      } finally {
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = 'Delete Product';
      }
    },
  };

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('products-action-menu');
    if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target)) {
      window.AdminProducts.closeActionMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.AdminProducts) {
      window.AdminProducts.closeActionMenu();
      window.AdminProducts.closeDeleteModal();
      window.AdminProducts.closeFilterDrawer();
    }
  });
})();
