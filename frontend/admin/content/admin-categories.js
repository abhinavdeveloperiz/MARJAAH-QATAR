(function () {
  'use strict';

  function esc(val) {
    return String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.AdminCategories = {
    categories: [],
    subcategories: [],
    brands: [],
    activeView: 'subcategories', // 'subcategories' | 'categories' | 'brands'
    selectedSubId: null,
    selectedCatId: null,
    selectedBrandId: null,
    searchDebounceTimer: null,
    currentImageBase64: null,
    catImageBase64: null,
    brandImageBase64: null,

    async load() {
      const subTbody = document.getElementById('subcategories-table-body');
      const catTbody = document.getElementById('categories-table-body');
      const brandTbody = document.getElementById('brands-table-body');

      const cachedCats = window.SmartCache?.getCategories();
      const cachedSubs = window.SmartCache?.getSubcategories();
      const cachedBrands = window.SmartCache?.getBrands();

      if (cachedCats && cachedCats.length > 0) this.categories = cachedCats;
      if (cachedSubs && cachedSubs.length > 0) this.subcategories = cachedSubs;
      if (cachedBrands && cachedBrands.length > 0) this.brands = cachedBrands;

      if ((cachedCats && cachedCats.length > 0) || (cachedSubs && cachedSubs.length > 0)) {
        this.populateDropdowns();
        this.renderSubcategoriesTable();
        this.renderCategoriesTable();
        this.renderBrandsTable();
      } else {
        if (subTbody) {
          subTbody.innerHTML = `<tr><td colspan="9" class="py-12 text-center text-xs text-slate-400"><div class="flex items-center justify-center gap-2"><span class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span><span>Loading subcategories...</span></div></td></tr>`;
        }
        if (catTbody) {
          catTbody.innerHTML = `<tr><td colspan="8" class="py-12 text-center text-xs text-slate-400"><div class="flex items-center justify-center gap-2"><span class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span><span>Loading categories...</span></div></td></tr>`;
        }
        if (brandTbody) {
          brandTbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-xs text-slate-400"><div class="flex items-center justify-center gap-2"><span class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span><span>Loading brands...</span></div></td></tr>`;
        }
      }

      await this.revalidate();
    },

    async revalidate() {
      try {
        const [catData, subData, brandData] = await Promise.all([
          AdminApp.api('/api/categories'),
          AdminApp.api('/api/subcategories?includeInactive=true'),
          AdminApp.api('/api/brands').catch(() => []),
        ]);

        const freshCats = Array.isArray(catData) ? catData : (catData.categories || catData.items || []);
        const freshSubs = Array.isArray(subData) ? subData : (subData.subcategories || subData.items || []);
        const freshBrands = Array.isArray(brandData) ? brandData : (brandData?.brands || brandData?.items || []);

        this.categories = freshCats;
        this.subcategories = freshSubs;
        this.brands = freshBrands;

        window.SmartCache?.setCategories(freshCats);
        window.SmartCache?.setSubcategories(freshSubs);
        window.SmartCache?.setBrands(freshBrands);

        this.populateDropdowns();
        this.renderSubcategoriesTable();
        this.renderCategoriesTable();
        this.renderBrandsTable();
      } catch (err) {
        console.warn('Failed to revalidate categories/subcategories:', err);
      }
    },

    switchView(viewName) {
      this.activeView = viewName;
      const subBtn = document.getElementById('btn-tab-subcategories');
      const catBtn = document.getElementById('btn-tab-categories');
      const brandBtn = document.getElementById('btn-tab-brands');
      const subSec = document.getElementById('sec-admin-subcategories');
      const catSec = document.getElementById('sec-admin-categories');
      const brandSec = document.getElementById('sec-admin-brands');
      const addSubBtn = document.getElementById('btn-add-subcategory');
      const addCatBtn = document.getElementById('btn-add-category');
      const addBrandBtn = document.getElementById('btn-add-brand');

      const activeCls = 'px-3.5 sm:px-4 py-2 rounded-lg bg-primary text-white font-bold text-xs shadow-sm cursor-pointer transition whitespace-nowrap flex-shrink-0';
      const inactiveCls = 'px-3.5 sm:px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer transition whitespace-nowrap flex-shrink-0';

      if (subBtn) subBtn.className = viewName === 'subcategories' ? activeCls : inactiveCls;
      if (catBtn) catBtn.className = viewName === 'categories' ? activeCls : inactiveCls;
      if (brandBtn) brandBtn.className = viewName === 'brands' ? activeCls : inactiveCls;

      if (subSec) subSec.classList.toggle('hidden', viewName !== 'subcategories');
      if (catSec) catSec.classList.toggle('hidden', viewName !== 'categories');
      if (brandSec) brandSec.classList.toggle('hidden', viewName !== 'brands');

      if (addSubBtn) addSubBtn.classList.toggle('hidden', viewName !== 'subcategories');
      if (addCatBtn) addCatBtn.classList.toggle('hidden', viewName !== 'categories');
      if (addBrandBtn) addBrandBtn.classList.toggle('hidden', viewName !== 'brands');

      if (viewName === 'brands') {
        this.renderBrandsTable();
      } else if (viewName === 'categories') {
        this.renderCategoriesTable();
      } else {
        this.renderSubcategoriesTable();
      }
    },

    populateDropdowns() {
      // 1. Filter dropdown in subcategories view
      const filterSelect = document.getElementById('subcategories-category-filter');
      if (filterSelect) {
        const curVal = filterSelect.value;
        filterSelect.innerHTML = `
          <option value="all">All Parent Categories</option>
          ${this.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} (${c.product_count || 0})</option>`).join('')}
        `;
        if (curVal) filterSelect.value = curVal;
      }

      // 2. Parent Category select inside subcategory modal
      const modalCatSelect = document.getElementById('sub-modal-category');
      if (modalCatSelect) {
        modalCatSelect.innerHTML = `
          <option value="">Select Parent Category *</option>
          ${this.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
        `;
      }
    },

    onSearchInput() {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        if (this.activeView === 'subcategories') {
          this.renderSubcategoriesTable();
        } else if (this.activeView === 'brands') {
          this.renderBrandsTable();
        } else {
          this.renderCategoriesTable();
        }
      }, 200);
    },

    renderSubcategoriesTable() {
      const tbody = document.getElementById('subcategories-table-body');
      if (!tbody) return;

      const q = (document.getElementById('subcategories-search-input')?.value || '').toLowerCase().trim();
      const catFilter = document.getElementById('subcategories-category-filter')?.value || 'all';
      const statusFilter = document.getElementById('subcategories-status-filter')?.value || 'all';

      let list = this.subcategories.filter((s) => {
        if (catFilter !== 'all') {
          const matchCat = s.category_id === catFilter || s.category_slug === catFilter;
          if (!matchCat) return false;
        }
        if (statusFilter !== 'all') {
          const isActive = s.is_active !== false;
          if (statusFilter === 'active' && !isActive) return false;
          if (statusFilter === 'inactive' && isActive) return false;
        }
        if (q) {
          const target = [s.name || '', s.name_ar || '', s.slug || '', s.category_name || ''].join(' ').toLowerCase();
          return target.includes(q);
        }
        return true;
      });

      // Update counters
      const countEl = document.getElementById('subcategories-total-count');
      if (countEl) countEl.textContent = `${list.length} subcategories`;

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="py-12 text-center text-xs text-slate-500">No subcategories match your filters.</td></tr>`;
        return;
      }

      tbody.innerHTML = list
        .map((s) => {
          const isActive = s.is_active !== false;
          const color = s.color || '#4063B2';
          const icon = s.icon || 'tag';
          const prodCount = Number(s.product_count || 0);
          const img = s.image || '/assets/images/products/placeholder.svg';

          return `
            <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors">
              <td class="py-3 px-4">
                <div class="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                  <img src="${esc(img)}" class="w-full h-full object-cover" onerror="this.src='/assets/images/products/placeholder.svg'" />
                </div>
              </td>
              <td class="py-3 px-4">
                <div class="font-bold text-xs text-slate-900">${esc(s.name || '—')}</div>
                <div class="text-[10px] text-slate-500 font-mono">${esc(s.slug || '—')}</div>
                ${s.name_ar ? `<div class="text-[10px] text-slate-500">${esc(s.name_ar)}</div>` : ''}
              </td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 whitespace-nowrap">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${esc(color)}"></span>
                  <span class="truncate">${esc(s.category_name || '—')}</span>
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold whitespace-nowrap" style="background:${esc(color)}15;color:${esc(color)};border:1px solid ${esc(color)}40">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${esc(color)}"></span>
                  <span>${esc(color)}</span>
                </div>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-700 whitespace-nowrap">
                  ${esc(icon)}
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="font-mono text-xs text-slate-700 font-bold">${Number(s.order) || 0}</span>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono whitespace-nowrap ${prodCount > 0 ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                  ${prodCount} products
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <button type="button" onclick="AdminCategories.toggleSubStatus('${esc(s.id)}', ${!isActive})" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer whitespace-nowrap ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-700'}">
                  <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></span>
                  <span>${isActive ? 'Active' : 'Inactive'}</span>
                </button>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5 whitespace-nowrap flex-shrink-0">
                  <button type="button" onclick="AdminCategories.openSubModal('${esc(s.id)}')" title="Edit Subcategory" class="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                  <button type="button" onclick="AdminCategories.deleteSubcategory('${esc(s.id)}')" title="Delete Subcategory" class="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 transition cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    },

    renderCategoriesTable() {
      const tbody = document.getElementById('categories-table-body');
      if (!tbody) return;

      const q = (document.getElementById('categories-search-input')?.value || '').toLowerCase().trim();

      let list = this.categories.filter((c) => {
        if (q) {
          const target = [c.name || '', c.name_ar || '', c.slug || ''].join(' ').toLowerCase();
          return target.includes(q);
        }
        return true;
      });

      const countEl = document.getElementById('categories-total-count');
      if (countEl) countEl.textContent = `${list.length} categories`;

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-12 text-center text-xs text-slate-500">No categories match your search.</td></tr>`;
        return;
      }

      tbody.innerHTML = list
        .map((c) => {
          const subsCount = this.subcategories.filter((s) => s.category_id === c.id || s.category_slug === c.slug).length;
          const prodCount = Number(c.product_count || 0);
          const img = c.image || '/assets/images/products/placeholder.svg';

          return `
            <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors">
              <td class="py-3 px-4">
                <div class="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                  <img src="${esc(img)}" class="w-full h-full object-cover" onerror="this.src='/assets/images/products/placeholder.svg'" />
                </div>
              </td>
              <td class="py-3 px-4">
                <div class="font-bold text-xs text-slate-900">${esc(c.name || '—')}</div>
                <div class="text-[10px] text-slate-500 font-mono">${esc(c.slug || '—')}</div>
                ${c.name_ar ? `<div class="text-[10px] text-slate-500">${esc(c.name_ar)}</div>` : ''}
              </td>
              <td class="py-3 px-4 text-center">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                  ${subsCount} subcategories
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono whitespace-nowrap ${prodCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                  ${prodCount} products
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="font-mono text-xs text-slate-700 font-bold">${Number(c.order) || 0}</span>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${c.is_featured ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                  ${c.is_featured ? 'Featured' : 'Standard'}
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5 whitespace-nowrap flex-shrink-0">
                  <button type="button" onclick="AdminCategories.openCatModal('${esc(c.id)}')" title="Edit Category" class="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                  <button type="button" onclick="AdminCategories.deleteCategory('${esc(c.id)}')" title="Delete Category" class="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 transition cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    },

    openSubModal(subId = null) {
      this.selectedSubId = subId;
      this.currentImageBase64 = null;
      this.populateDropdowns();

      const form = document.getElementById('subcategory-modal-form');
      if (form) form.reset();

      const previewEl = document.getElementById('sub-modal-image-preview');
      const emptyEl = document.getElementById('sub-modal-image-empty');
      if (previewEl) {
        previewEl.src = '/assets/images/products/placeholder.svg';
        previewEl.classList.add('hidden');
      }
      if (emptyEl) emptyEl.classList.remove('hidden');

      if (subId) {
        const s = this.subcategories.find((x) => x.id === subId);
        if (!s) return;

        document.getElementById('subcategory-modal-title').textContent = `Edit Subcategory: ${s.name}`;
        document.getElementById('sub-modal-name').value = s.name || '';
        document.getElementById('sub-modal-name-ar').value = s.name_ar || '';
        document.getElementById('sub-modal-slug').value = s.slug || '';
        document.getElementById('sub-modal-category').value = s.category_id || '';
        document.getElementById('sub-modal-color').value = s.color || '#4063B2';
        document.getElementById('sub-modal-color-text').value = s.color || '#4063B2';
        const iconSelect = document.getElementById('sub-modal-icon');
        const iconVal = s.icon || 'tag';
        if (iconSelect && !Array.from(iconSelect.options).some((opt) => opt.value === iconVal)) {
          const extraOpt = document.createElement('option');
          extraOpt.value = iconVal;
          extraOpt.textContent = `${iconVal} (Custom)`;
          iconSelect.appendChild(extraOpt);
        }
        if (iconSelect) iconSelect.value = iconVal;
        document.getElementById('sub-modal-order').value = Number(s.order) || 0;
        document.getElementById('sub-modal-active').checked = s.is_active !== false;
        document.getElementById('sub-modal-image-url').value = s.image || '';

        if (s.image && previewEl) {
          previewEl.src = s.image;
          previewEl.classList.remove('hidden');
          if (emptyEl) emptyEl.classList.add('hidden');
        }
      } else {
        document.getElementById('subcategory-modal-title').textContent = 'Add New Subcategory';
        document.getElementById('sub-modal-color').value = '#4063B2';
        document.getElementById('sub-modal-color-text').value = '#4063B2';
        document.getElementById('sub-modal-icon').value = 'tag';
        document.getElementById('sub-modal-order').value = this.subcategories.length;
        document.getElementById('sub-modal-active').checked = true;
      }

      document.getElementById('subcategory-modal').classList.remove('hidden');
    },

    closeSubModal() {
      document.getElementById('subcategory-modal').classList.add('hidden');
      this.selectedSubId = null;
      this.currentImageBase64 = null;
    },

    onColorPickerChange(val) {
      const textInput = document.getElementById('sub-modal-color-text');
      if (textInput) textInput.value = val;
    },

    onColorTextChange(val) {
      const picker = document.getElementById('sub-modal-color');
      if (picker && val.startsWith('#') && (val.length === 4 || val.length === 7)) {
        picker.value = val;
      }
    },

    setColorPreset(color) {
      const picker = document.getElementById('sub-modal-color');
      const textInput = document.getElementById('sub-modal-color-text');
      if (picker) picker.value = color;
      if (textInput) textInput.value = color;
    },

    onImageFileSelected(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        this.currentImageBase64 = loadEvt.target.result;
        const previewEl = document.getElementById('sub-modal-image-preview');
        if (previewEl) {
          previewEl.src = this.currentImageBase64;
          previewEl.classList.remove('hidden');
        }
      };
      reader.readAsDataURL(file);
    },

    async saveSubcategory(e) {
      e.preventDefault();
      const name = document.getElementById('sub-modal-name').value.trim();
      const name_ar = document.getElementById('sub-modal-name-ar').value.trim();
      const slug = document.getElementById('sub-modal-slug').value.trim();
      const category_id = document.getElementById('sub-modal-category').value;
      const color = document.getElementById('sub-modal-color-text').value.trim() || '#4063B2';
      const icon = document.getElementById('sub-modal-icon').value.trim() || 'tag';
      const order = Number(document.getElementById('sub-modal-order').value) || 0;
      const is_active = document.getElementById('sub-modal-active').checked;
      const imageUrl = document.getElementById('sub-modal-image-url').value.trim();

      if (!name) {
        AdminApp.toast('Subcategory name is required.', 'error');
        return;
      }
      if (!category_id) {
        AdminApp.toast('Parent category is required.', 'error');
        return;
      }

      const payload = {
        name,
        name_ar,
        slug: slug || undefined,
        category_id,
        color,
        icon,
        order,
        is_active,
        image: this.currentImageBase64 || imageUrl || null,
      };

      try {
        if (!this.selectedSubId) {
          const res = await AdminApp.api('/api/subcategories', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          AdminApp.toast(`Subcategory "${res.name}" created successfully.`, 'success');
        } else {
          const res = await AdminApp.api(`/api/subcategories/${this.selectedSubId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          AdminApp.toast(`Subcategory "${res.name}" updated successfully.`, 'success');
        }
        this.closeSubModal();
        await this.revalidate();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to save subcategory', 'error');
      }
    },

    async toggleSubStatus(id, newStatus) {
      try {
        await AdminApp.api(`/api/subcategories/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: newStatus }),
        });
        const sub = this.subcategories.find((x) => x.id === id);
        if (sub) {
          sub.is_active = newStatus;
          window.SmartCache?.updateSubcategory(sub);
        }
        AdminApp.toast(`Subcategory set to ${newStatus ? 'ACTIVE' : 'INACTIVE'}`, 'info');
        this.renderSubcategoriesTable();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to update status', 'error');
      }
    },

    async deleteSubcategory(id) {
      const sub = this.subcategories.find((x) => x.id === id);
      const name = sub?.name || 'this subcategory';
      const count = Number(sub?.product_count || 0);

      if (count > 0) {
        alert(
          `Cannot delete "${name}" because ${count} product(s) are currently assigned to it.\n\nPlease reassign or remove the products before deleting this subcategory.`
        );
        return;
      }

      if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;

      try {
        await AdminApp.api(`/api/subcategories/${id}`, { method: 'DELETE' });
        window.SmartCache?.removeSubcategory(id);
        AdminApp.toast(`Subcategory "${name}" deleted successfully.`, 'success');
        await this.revalidate();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to delete subcategory', 'error');
      }
    },

    // ─── CATEGORY CRUD ──────────────────────────────────────────
    onCatImageFileSelected(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        this.catImageBase64 = loadEvt.target.result;
        const previewEl = document.getElementById('cat-modal-image-preview');
        if (previewEl) {
          previewEl.src = this.catImageBase64;
          previewEl.classList.remove('hidden');
        }
      };
      reader.readAsDataURL(file);
    },

    openCatModal(catId = null) {
      this.selectedCatId = catId;
      this.catImageBase64 = null;
      const form = document.getElementById('category-modal-form');
      if (form) form.reset();

      const previewEl = document.getElementById('cat-modal-image-preview');
      const emptyEl = document.getElementById('cat-modal-image-empty');
      if (previewEl) {
        previewEl.src = '/assets/images/products/placeholder.svg';
        previewEl.classList.add('hidden');
      }
      if (emptyEl) emptyEl.classList.remove('hidden');

      if (catId) {
        const c = this.categories.find((x) => x.id === catId);
        if (!c) return;
        document.getElementById('category-modal-title').textContent = `Edit Category: ${c.name}`;
        document.getElementById('cat-modal-name').value = c.name || '';
        document.getElementById('cat-modal-name-ar').value = c.name_ar || '';
        document.getElementById('cat-modal-slug').value = c.slug || '';
        document.getElementById('cat-modal-order').value = Number(c.order) || 0;
        document.getElementById('cat-modal-featured').checked = Boolean(c.is_featured);
        document.getElementById('cat-modal-image-url').value = c.image || '';
        if (c.image && previewEl) {
          previewEl.src = c.image;
          previewEl.classList.remove('hidden');
          if (emptyEl) emptyEl.classList.add('hidden');
        }
      } else {
        document.getElementById('category-modal-title').textContent = 'Add New Category';
        document.getElementById('cat-modal-order').value = this.categories.length;
        document.getElementById('cat-modal-featured').checked = false;
      }

      document.getElementById('category-modal').classList.remove('hidden');
    },

    closeCatModal() {
      document.getElementById('category-modal').classList.add('hidden');
      this.selectedCatId = null;
      this.catImageBase64 = null;
    },

    async saveCategory(e) {
      e.preventDefault();
      const name = document.getElementById('cat-modal-name').value.trim();
      const name_ar = document.getElementById('cat-modal-name-ar').value.trim();
      const slug = document.getElementById('cat-modal-slug').value.trim();
      const order = Number(document.getElementById('cat-modal-order').value) || 0;
      const is_featured = document.getElementById('cat-modal-featured').checked;
      const imageUrl = document.getElementById('cat-modal-image-url').value.trim();

      if (!name) {
        AdminApp.toast('Category name is required.', 'error');
        return;
      }

      const payload = {
        name,
        name_ar,
        slug: slug || undefined,
        order,
        is_featured,
        image: this.catImageBase64 || imageUrl || null,
      };

      try {
        if (!this.selectedCatId) {
          const res = await AdminApp.api('/api/categories', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          AdminApp.toast(`Category "${res.name}" created successfully.`, 'success');
        } else {
          const res = await AdminApp.api(`/api/categories/${this.selectedCatId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          AdminApp.toast(`Category "${res.name}" updated successfully.`, 'success');
        }
        this.closeCatModal();
        await this.revalidate();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to save category', 'error');
      }
    },

    async deleteCategory(catId) {
      const c = this.categories.find((x) => x.id === catId);
      const name = c?.name || 'this category';
      const subsCount = this.subcategories.filter((s) => s.category_id === catId || s.category_slug === c?.slug).length;

      if (subsCount > 0) {
        alert(
          `Cannot delete category "${name}" because it contains ${subsCount} subcategories.\n\nPlease delete or reassign its subcategories first.`
        );
        return;
      }

      if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;

      try {
        await AdminApp.api(`/api/categories/${catId}`, { method: 'DELETE' });
        AdminApp.toast(`Category "${name}" deleted successfully.`, 'success');
        await this.revalidate();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to delete category', 'error');
      }
    },

    // ─── BRANDS CRUD ────────────────────────────────────────────
    renderBrandsTable() {
      const tbody = document.getElementById('brands-table-body');
      if (!tbody) return;

      const q = (document.getElementById('brands-search-input')?.value || '').toLowerCase().trim();
      const list = (this.brands || []).filter((b) => {
        if (!q) return true;
        return [b.name || '', b.slug || '', b.series || ''].join(' ').toLowerCase().includes(q);
      });

      const countEl = document.getElementById('brands-total-count');
      if (countEl) countEl.textContent = `${list.length} brands`;

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-xs text-slate-500">No brands found.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map((b) => {
        const img = b.logo || b.image || '/assets/images/products/placeholder.svg';
        const prodCount = Number(b.product_count || 0);
        const safeId = esc(b.id || b.slug || '');
        const hasDoc = Boolean(b.created_at || b.updated_at || (b.id && b.id !== b.slug));

        return `
          <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors">
            <td class="py-3 px-4">
              <div class="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center p-1 flex-shrink-0">
                <img src="${esc(img)}" class="w-full h-full object-contain" onerror="this.src='/assets/images/products/placeholder.svg'" />
              </div>
            </td>
            <td class="py-3 px-4">
              <div class="font-bold text-xs text-slate-900">${esc(b.name || '—')}</div>
              <div class="text-[10px] text-slate-500 font-mono">${esc(b.slug || b.id || '—')}</div>
            </td>
            <td class="py-3 px-4 text-center text-xs text-slate-600">${esc(b.series || 'Partner Brand')}</td>
            <td class="py-3 px-4 text-center">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono whitespace-nowrap ${prodCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                ${prodCount} products
              </span>
            </td>
            <td class="py-3 px-4 text-center">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${b.is_featured ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                ${b.is_featured ? 'Featured' : 'Standard'}
              </span>
            </td>
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
                <button type="button" onclick="AdminCategories.openBrandModal('${safeId}')" title="Configure Brand" class="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
                ${hasDoc ? `
                  <button type="button" onclick="AdminCategories.deleteBrand('${safeId}')" title="Delete Brand" class="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-600 transition cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    onBrandImageFileSelected(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        this.brandImageBase64 = loadEvt.target.result;
        const previewEl = document.getElementById('brand-modal-image-preview');
        if (previewEl) {
          previewEl.src = this.brandImageBase64;
          previewEl.classList.remove('hidden');
        }
      };
      reader.readAsDataURL(file);
    },

    openBrandModal(brandId = null) {
      const existing = brandId ? this.brands.find((x) => x.id === brandId || x.slug === brandId) : null;
      const isPersisted = Boolean(existing && (existing.created_at || existing.updated_at || (existing.id && existing.id !== existing.slug)));
      this.selectedBrandId = isPersisted ? existing.id : null;
      this.brandImageBase64 = null;

      const form = document.getElementById('brand-modal-form');
      if (form) form.reset();

      const previewEl = document.getElementById('brand-modal-image-preview');
      if (previewEl) {
        previewEl.src = '/assets/images/products/placeholder.svg';
        previewEl.classList.add('hidden');
      }

      if (existing) {
        document.getElementById('brand-modal-title').textContent = `${isPersisted ? 'Edit Brand' : 'Register Brand'}: ${existing.name}`;
        document.getElementById('brand-modal-name').value = existing.name || '';
        document.getElementById('brand-modal-slug').value = existing.slug || '';
        document.getElementById('brand-modal-series').value = existing.series || '';
        document.getElementById('brand-modal-featured').checked = Boolean(existing.is_featured);
        const logoUrl = existing.logo || existing.image || '';
        document.getElementById('brand-modal-logo-url').value = logoUrl;
        if (logoUrl && previewEl) {
          previewEl.src = logoUrl;
          previewEl.classList.remove('hidden');
        }
      } else {
        document.getElementById('brand-modal-title').textContent = 'Add New Brand';
        document.getElementById('brand-modal-featured').checked = false;
      }

      document.getElementById('brand-modal').classList.remove('hidden');
    },

    closeBrandModal() {
      document.getElementById('brand-modal').classList.add('hidden');
      this.selectedBrandId = null;
      this.brandImageBase64 = null;
    },

    async saveBrand(e) {
      e.preventDefault();
      const name = document.getElementById('brand-modal-name').value.trim();
      const slug = document.getElementById('brand-modal-slug').value.trim();
      const series = document.getElementById('brand-modal-series').value.trim();
      const is_featured = document.getElementById('brand-modal-featured').checked;
      const logoUrl = document.getElementById('brand-modal-logo-url').value.trim();

      if (!name) {
        AdminApp.toast('Brand name is required.', 'error');
        return;
      }

      const finalImg = this.brandImageBase64 || logoUrl || '';
      const payload = {
        name,
        slug: slug || undefined,
        series,
        is_featured,
        logo: finalImg,
        image: finalImg,
      };

      try {
        if (!this.selectedBrandId) {
          const res = await AdminApp.api('/api/brands', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          AdminApp.toast(`Brand "${res.name}" saved successfully.`, 'success');
        } else {
          const res = await AdminApp.api(`/api/brands/${this.selectedBrandId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          AdminApp.toast(`Brand "${res.name}" updated successfully.`, 'success');
        }
        this.closeBrandModal();
        await this.revalidate();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to save brand', 'error');
      }
    },

    async deleteBrand(brandId) {
      const b = this.brands.find((x) => x.id === brandId || x.slug === brandId);
      const name = b?.name || 'this brand';
      const count = Number(b?.product_count || 0);
      if (count > 0) {
        alert(`Cannot delete brand "${name}" because ${count} product(s) are assigned to it.`);
        return;
      }
      if (!confirm(`Are you sure you want to delete brand "${name}"?`)) return;

      try {
        await AdminApp.api(`/api/brands/${brandId}`, { method: 'DELETE' });
        AdminApp.toast(`Brand "${name}" deleted successfully.`, 'success');
        await this.revalidate();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to delete brand', 'error');
      }
    },
  };
})();
