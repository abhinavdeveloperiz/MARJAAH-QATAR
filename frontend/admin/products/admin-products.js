(function () {
  'use strict';

  window.AdminProducts = {
    products: [],
    categories: [],
    subcategories: [],
    brands: [],
    selectedProdId: null,
    selectedIds: new Set(),
    searchDebounceTimer: null,

    onSearchInput() {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.renderTable();
      }, 250);
    },

    async load() {
      const container = document.getElementById('products-table-body');

      const cachedProds = window.SmartCache?.getProducts();
      const cachedCats = window.SmartCache?.getCategories();
      const cachedSubs = window.SmartCache?.getSubcategories();
      const cachedBrands = window.SmartCache?.getBrands();

      if (cachedProds && cachedProds.length > 0) {
        this.products = cachedProds;
        if (cachedCats && cachedCats.length > 0) this.categories = cachedCats;
        if (cachedSubs && cachedSubs.length > 0) this.subcategories = cachedSubs;
        if (cachedBrands && cachedBrands.length > 0) this.brands = cachedBrands;
        this.populateFilterDropdowns();
        this.renderTable();
      } else if (container) {
        container.innerHTML = `
          <tr>
            <td colspan="7" class="py-12 text-center text-xs text-slate-400">
              <div class="flex flex-col items-center justify-center gap-2">
                <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading catalog products from cache &amp; cloud...</span>
              </div>
            </td>
          </tr>`;
      }

      this.revalidateCatalog();
    },

    async revalidateCatalog() {
      try {
        const [prodData, catData, subData, brandData] = await Promise.all([
          AdminApp.api('/api/products?limit=1500&includeHidden=true&status=all'),
          AdminApp.api('/api/categories').catch(() => ({ categories: [] })),
          AdminApp.api('/api/subcategories?includeInactive=true').catch(() => ({ subcategories: [] })),
          AdminApp.api('/api/brands').catch(() => ({ brands: [] })),
        ]);

        const freshProds = prodData.products || prodData.items || prodData.data || prodData || [];
        const freshCats = Array.isArray(catData) ? catData : (catData.categories || catData.items || []);
        const freshSubs = Array.isArray(subData) ? subData : (subData.subcategories || subData.items || []);
        const freshBrands = Array.isArray(brandData) ? brandData : (brandData.brands || brandData.items || []);

        this.products = freshProds;
        this.categories = freshCats;
        this.subcategories = freshSubs;
        this.brands = freshBrands;

        window.SmartCache?.setProducts(freshProds);
        window.SmartCache?.setCategories(freshCats);
        window.SmartCache?.setSubcategories(freshSubs);
        window.SmartCache?.setBrands(freshBrands);

        this.populateFilterDropdowns();
        this.renderTable();
      } catch (err) {
        console.warn('Failed to background revalidate products:', err);
        const container = document.getElementById('products-table-body');
        if (container && (!this.products || this.products.length === 0)) {
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
    },

    updateTableSubcategoryFilter() {
      const catSelect = document.getElementById('products-category-filter');
      const subSelect = document.getElementById('products-subcategory-filter');
      if (!subSelect) return;

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
    },

    onCategoryFilterChange() {
      this.updateTableSubcategoryFilter();
      this.renderTable();
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

      const q = (document.getElementById('products-search-input')?.value || '').toLowerCase().trim();
      const catFilter = document.getElementById('products-category-filter')?.value || 'all';
      const subFilter = document.getElementById('products-subcategory-filter')?.value || 'all';
      const statusFilter = document.getElementById('products-status-filter')?.value || 'all';

      let filtered = this.products.filter((p) => {
        if (catFilter !== 'all') {
          const matchCat =
            (p.category_slug || '').toLowerCase() === catFilter.toLowerCase() ||
            (p.category || '').toLowerCase() === catFilter.toLowerCase() ||
            p.category_id === catFilter;
          if (!matchCat) return false;
        }

        if (subFilter !== 'all') {
          const matchSub =
            (p.subcategory_slug || '').toLowerCase() === subFilter.toLowerCase() ||
            (p.subcategory || '').toLowerCase() === subFilter.toLowerCase() ||
            p.subcategory_id === subFilter;
          if (!matchSub) return false;
        }

        if (statusFilter !== 'all') {
          const pStatus = p.status || 'active';
          if (pStatus !== statusFilter) return false;
        }

        if (q) {
          const target = [
            p.name || '',
            p.name_ar || '',
            p.brand || '',
            p.sku || '',
            p.category || '',
            p.subcategory || '',
          ].join(' ').toLowerCase();
          return target.includes(q);
        }
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-xs text-slate-400">No products matching your search criteria.</td></tr>`;
        this.updateBulkBar();
        return;
      }

      const displayList = filtered.slice(0, 100);
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    </div>
                  </button>
                  <div class="min-w-0">
                    <p class="font-bold text-xs text-slate-900 truncate max-w-xs" title="${p.name}">${p.name}</p>
                    <p class="text-[10px] text-slate-400 font-mono">${p.sku || p.slug || '—'}</p>
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
                <div class="flex items-center justify-end gap-1.5">
                  <button type="button" onclick="AdminProducts.openModal('${p.id}')" title="Edit Product" class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                  <button type="button" onclick="AdminProducts.duplicateProduct('${p.id}')" title="Duplicate Product" class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-primary hover:text-primary-hover transition cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                  <button type="button" onclick="AdminProducts.deleteProduct('${p.id}')" title="Delete Product" class="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-500 transition cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');

      const noteHtml =
        filtered.length > 100
          ? `<tr><td colspan="7" class="py-3 px-4 text-center text-xs text-primary bg-primary/5 border-t border-slate-200">Showing top 100 of ${filtered.length} matching products. Use filters or search to refine.</td></tr>`
          : '';

      container.innerHTML = rowsHtml + noteHtml;
      this.updateBulkBar();
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

    openModal(prodId = null) {
      this.selectedProdId = prodId;
      const form = document.getElementById('product-modal-form');
      if (form) form.reset();

      this.populateFilterDropdowns();

      if (prodId) {
        const p = this.products.find((x) => x.id === prodId);
        if (!p) return;

        document.getElementById('product-modal-title').textContent = `Edit Product: ${p.name}`;
        document.getElementById('product-modal-name').value = p.name || '';

        // Select Category & trigger Subcategories load
        const catTarget = p.category_id || p.category_slug || '';
        document.getElementById('product-modal-category').value = catTarget;
        this.onModalCategoryChange(catTarget, p.subcategory_id || p.subcategory_slug || p.subcategory);

        document.getElementById('product-modal-brand').value = p.brand || '';
        document.getElementById('product-modal-price').value = p.price || '';
        document.getElementById('product-modal-orig-price').value = p.original_price || '';
        document.getElementById('product-modal-stock').value = p.stock_count !== undefined ? p.stock_count : (p.stock || 0);
        document.getElementById('product-modal-status').value = p.status || 'active';
        document.getElementById('product-modal-image').value = p.image || '';
        document.getElementById('product-modal-desc').value = p.description || '';
      } else {
        document.getElementById('product-modal-title').textContent = 'Add New Product';
        this.onModalCategoryChange(null);
      }

      document.getElementById('product-modal').classList.remove('hidden');
    },

    closeModal() {
      document.getElementById('product-modal').classList.add('hidden');
    },

    async saveProduct(e) {
      e.preventDefault();
      const name = document.getElementById('product-modal-name').value.trim();
      const categoryId = document.getElementById('product-modal-category').value;
      const subcategoryId = document.getElementById('product-modal-subcategory').value;
      const brand = document.getElementById('product-modal-brand').value.trim();
      const price = Number(document.getElementById('product-modal-price').value);
      const original_price = document.getElementById('product-modal-orig-price').value ? Number(document.getElementById('product-modal-orig-price').value) : undefined;
      const stock_count = Number(document.getElementById('product-modal-stock').value);
      const status = document.getElementById('product-modal-status').value;
      const image = document.getElementById('product-modal-image').value.trim();
      const description = document.getElementById('product-modal-desc').value.trim();

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

      const payload = {
        name,
        category_id: selectedCat ? selectedCat.id : categoryId,
        category_slug: selectedCat ? selectedCat.slug : categoryId,
        category_name: selectedCat ? selectedCat.name : categoryId,
        category: selectedCat ? selectedCat.name : categoryId,
        subcategory_id: selectedSub ? selectedSub.id : subcategoryId,
        subcategory_slug: selectedSub ? selectedSub.slug : subcategoryId,
        subcategory_name: selectedSub ? selectedSub.name : subcategoryId,
        subcategory: selectedSub ? selectedSub.name : subcategoryId,
        brand,
        price,
        original_price,
        stock_count,
        in_stock: stock_count > 0,
        status,
        image,
        description,
      };

      try {
        if (!this.selectedProdId) {
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
            method: 'PATCH',
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
      }
    },

    async deleteProduct(prodId) {
      if (!confirm('Are you sure you want to delete this product?')) return;
      try {
        await AdminApp.api(`/api/products/${prodId}`, {
          method: 'DELETE',
        });
        window.SmartCache?.removeProduct(prodId);
        AdminApp.toast('Product deleted successfully.', 'success');
        await this.load();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to delete product', 'error');
      }
    },
  };
})();
