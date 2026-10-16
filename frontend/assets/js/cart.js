// ─── MARJAAH Qatar Client-side LocalStorage Cart System ──────────────────────
(function (global) {
  const STORAGE_KEY = 'marjaah_cart_items_v2';

  class LocalCart {
    constructor() {
      this.items = this.load();
      this.listeners = [];
      this.initEvents();
    }

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.warn('Failed to parse cart from localStorage:', e);
        return [];
      }
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
      } catch (e) {
        console.warn('Failed to save cart to localStorage:', e);
      }
      this.notify();
    }

    onChange(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
      }
    }

    notify() {
      const summary = this.getSummary();
      this.updateNavbarBadge(summary.count);
      this.renderDrawer();
      this.renderCartPage();
      this.listeners.forEach(fn => fn(this.items, summary));
    }

    getItems() {
      return [...this.items];
    }

    async addItem(productOrSlug, quantity = 1) {
      let product = productOrSlug;
      if (typeof productOrSlug === 'string') {
        const slug = productOrSlug;
        // Check window.productsMap
        if (global.productsMap && global.productsMap[slug]) {
          product = global.productsMap[slug];
        } else if (global.api) {
          try {
            product = await global.api.getProduct(slug);
          } catch (e) {
            console.error('Failed to fetch product for cart:', e);
            product = { slug: slug, name: slug, price: 0 };
          }
        } else {
          product = { slug: slug, name: slug, price: 0 };
        }
      }

      if (!product || !product.slug) return;
      const qty = Math.max(1, Number(quantity) || 1);
      const existing = this.items.find(i => i.slug === product.slug);

      if (existing) {
        existing.quantity += qty;
      } else {
        const firstImg = Array.isArray(product.images) && product.images.length > 0
          ? product.images[0]
          : (product.primary_image || product.image || 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg');

        this.items.push({
          id: product.id || '',
          slug: product.slug,
          name: product.name || 'Product',
          name_ar: product.name_ar || '',
          price: Number(product.price) || 0,
          original_price: product.original_price ? Number(product.original_price) : null,
          image: firstImg,
          brand: product.brand || '',
          quantity: qty,
        });
      }

      this.save();
      const isAr = document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar' || window.location.pathname.startsWith('/ar');
      if (global.Toast) {
        global.Toast.success(isAr ? 'تمت إضافة المنتج إلى السلة' : 'Added to cart successfully');
      }
      this.openDrawer();
    }

    updateQuantity(slug, quantity) {
      const idx = this.items.findIndex(i => i.slug === slug);
      if (idx !== -1) {
        const qty = Number(quantity);
        if (qty <= 0) {
          this.items.splice(idx, 1);
        } else {
          this.items[idx].quantity = qty;
        }
        this.save();
      }
    }

    removeItem(slug) {
      const idx = this.items.findIndex(i => i.slug === slug);
      if (idx !== -1) {
        this.items.splice(idx, 1);
        this.save();
        const isAr = document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';
        if (global.Toast) {
          global.Toast.info(isAr ? 'تم حذف المنتج من السلة' : 'Item removed from cart');
        }
      }
    }

    clear() {
      this.items = [];
      this.save();
    }

    getSummary() {
      let subtotal = 0;
      let count = 0;
      this.items.forEach(item => {
        subtotal += (item.price * item.quantity);
        count += item.quantity;
      });
      // Free delivery across Qatar
      const shipping = 0;
      const total = subtotal + shipping;
      return { subtotal, shipping, total, count };
    }

    updateNavbarBadge(count) {
      const badges = document.querySelectorAll('.cart-badge, [data-cart-count], #cart-count');
      badges.forEach(b => {
        b.textContent = count;
        if (count > 0) {
          b.classList.remove('hidden', 'opacity-0');
          b.style.display = 'flex';
        } else {
          b.classList.add('hidden');
          b.style.display = 'none';
        }
      });

      const drawerCounts = document.querySelectorAll('[data-drawer-count]');
      drawerCounts.forEach(el => {
        el.textContent = count;
      });
    }

    openDrawer() {
      const overlay = document.getElementById('cart-overlay');
      const drawer = document.getElementById('cart-drawer');
      if (drawer) {
        drawer.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      }
      if (overlay) {
        overlay.classList.add('is-active');
        overlay.classList.remove('pointer-events-none', 'opacity-0');
      }
    }

    closeDrawer() {
      const overlay = document.getElementById('cart-overlay');
      const drawer = document.getElementById('cart-drawer');
      if (drawer) {
        drawer.classList.remove('is-open');
        document.body.style.overflow = '';
      }
      if (overlay) {
        overlay.classList.remove('is-active');
        overlay.classList.add('pointer-events-none', 'opacity-0');
      }
    }

    renderDrawer() {
      const content = document.getElementById('cart-drawer-content');
      if (!content) return;

      const isAr = document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';
      const summary = this.getSummary();

      if (this.items.length === 0) {
        content.innerHTML = `
          <div class="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center bg-primary-500/10 text-primary-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <div>
              <h4 class="font-bold text-base mb-1" style="color:var(--text-primary)">
                ${isAr ? 'سلة التسوق فارغة' : 'Your cart is empty'}
              </h4>
              <p class="text-xs sm:text-sm max-w-[240px] mx-auto leading-relaxed" style="color:var(--text-secondary)">
                ${isAr ? 'اكتشف العتاد عالي الأداء وأجهزة الألعاب للبدء.' : 'Discover high-performance hardware and gaming rigs to get started.'}
              </p>
            </div>
            <a href="/shop/" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer">
              <span>${isAr ? 'تصفح المتجر' : 'Explore Shop'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
          </div>
        `;
        return;
      }

      const itemsHtml = this.items.map(item => `
        <div class="flex items-center gap-3 p-3 rounded-2xl border" style="background:var(--bg-surface-2);border-color:var(--border-color)">
          <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style="background:var(--bg-surface)">
            <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover" onerror="this.src='https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg'" />
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-xs sm:text-sm font-semibold truncate leading-tight mb-1" style="color:var(--text-primary)">${isAr && item.name_ar ? item.name_ar : item.name}</h4>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-bold" style="color:var(--color-accent)">${item.price} QAR</span>
              ${item.original_price ? `<span class="text-[10px] line-through" style="color:var(--text-tertiary)">${item.original_price} QAR</span>` : ''}
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1 bg-black/20 rounded-lg p-0.5 border" style="border-color:var(--border-color)">
                <button onclick="cart.updateQuantity('${item.slug}', ${item.quantity - 1})" class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold hover:bg-white/10 transition" style="color:var(--text-secondary)">-</button>
                <span class="text-xs font-bold px-2" style="color:var(--text-primary)">${item.quantity}</span>
                <button onclick="cart.updateQuantity('${item.slug}', ${item.quantity + 1})" class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold hover:bg-white/10 transition" style="color:var(--text-secondary)">+</button>
              </div>
              <button onclick="cart.removeItem('${item.slug}')" class="text-xs text-rose-400 hover:text-rose-300 transition font-medium">${isAr ? 'حذف' : 'Remove'}</button>
            </div>
          </div>
        </div>
      `).join('');

      content.innerHTML = `
        <div class="flex-1 overflow-y-auto p-4 space-y-2.5">
          ${itemsHtml}
        </div>
        <div class="p-4 border-t flex-shrink-0" style="border-color:var(--border-color);background:var(--bg-surface)">
          <div class="space-y-1.5 mb-3 text-xs">
            <div class="flex justify-between" style="color:var(--text-secondary)">
              <span>${isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
              <span class="font-bold" style="color:var(--text-primary)">${summary.subtotal.toFixed(0)} QAR</span>
            </div>
            <div class="flex justify-between" style="color:var(--text-secondary)">
              <span>${isAr ? 'التوصيل في قطر' : 'Delivery in Qatar'}</span>
              <span class="font-bold ${summary.shipping === 0 ? 'text-emerald-400' : ''}" style="${summary.shipping !== 0 ? 'color:var(--text-primary)' : ''}">
                ${summary.shipping === 0 ? (isAr ? 'مجاني 🎉' : 'Free 🎉') : summary.shipping + ' QAR'}
              </span>
            </div>
            <div class="flex justify-between text-sm pt-2 border-t font-black" style="border-color:var(--border-color);color:var(--text-primary)">
              <span>${isAr ? 'الإجمالي الكلي' : 'Total'}</span>
              <span style="color:var(--color-accent)">${summary.total.toFixed(0)} QAR</span>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <a href="/cart/" class="py-2.5 rounded-xl text-center text-xs font-bold border transition hover:bg-white/5" style="border-color:var(--border-color);color:var(--text-primary)">
              ${isAr ? 'عرض السلة' : 'View Cart'}
            </a>
            <a href="/checkout/" class="btn-primary py-2.5 text-center text-xs font-bold justify-center">
              ${isAr ? 'إتمام الطلب' : 'Checkout'}
            </a>
          </div>
        </div>
      `;
    }

    renderCartPage() {
      const pageContainer = document.getElementById('cart-page-container');
      if (!pageContainer) return;

      const isAr = document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';
      const summary = this.getSummary();

      if (this.items.length === 0) {
        pageContainer.innerHTML = `
          <div class="flex flex-col items-center justify-center py-28 gap-6 text-center">
            <div class="w-24 h-24 rounded-2xl flex items-center justify-center" style="background:var(--bg-surface-2)">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-secondary)"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <div>
              <h3 class="font-display font-bold text-2xl mb-2" style="color:var(--text-primary)">${isAr ? 'سلة التسوق فارغة' : 'Your cart is empty'}</h3>
              <p class="text-sm" style="color:var(--text-secondary)">${isAr ? 'أضف بعض المنتجات للبدء' : 'Add some products to get started'}</p>
            </div>
            <a href="/shop/" class="btn-primary">${isAr ? 'تصفح المتجر' : 'Shop Now'}</a>
          </div>
        `;
        return;
      }

      const rows = this.items.map(item => `
        <div class="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 rounded-3xl border gap-4" style="background:var(--bg-surface);border-color:var(--border-color)">
          <div class="flex items-center gap-4 w-full sm:w-auto">
            <div class="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0" style="background:var(--bg-surface-2)">
              <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover" onerror="this.src='https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg'" />
            </div>
            <div>
              <h3 class="font-bold text-sm sm:text-base leading-tight mb-1" style="color:var(--text-primary)">
                <a href="/product/${encodeURIComponent(item.slug)}/" class="hover:text-primary-400 transition">${isAr && item.name_ar ? item.name_ar : item.name}</a>
              </h3>
              <p class="text-xs font-semibold" style="color:var(--color-accent)">${item.price} QAR</p>
            </div>
          </div>
          <div class="flex items-center justify-between w-full sm:w-auto gap-6">
            <div class="flex items-center gap-2 bg-black/20 rounded-xl p-1 border" style="border-color:var(--border-color)">
              <button onclick="cart.updateQuantity('${item.slug}', ${item.quantity - 1})" class="w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-white/10" style="color:var(--text-secondary)">-</button>
              <span class="text-sm font-bold px-3" style="color:var(--text-primary)">${item.quantity}</span>
              <button onclick="cart.updateQuantity('${item.slug}', ${item.quantity + 1})" class="w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-white/10" style="color:var(--text-secondary)">+</button>
            </div>
            <span class="font-display font-black text-base sm:text-lg min-w-[90px] text-right" style="color:var(--text-primary)">
              ${(item.price * item.quantity).toFixed(0)} QAR
            </span>
            <button onclick="cart.removeItem('${item.slug}')" class="text-rose-400 hover:text-rose-300 p-2 transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `).join('');

      pageContainer.innerHTML = `
        <div class="grid lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-4">
            ${rows}
          </div>
          <div class="rounded-3xl p-6 border h-fit space-y-4" style="background:var(--bg-surface);border-color:var(--border-color)">
            <h3 class="font-display font-bold text-lg" style="color:var(--text-primary)">${isAr ? 'ملخص الطلب' : 'Order Summary'}</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between" style="color:var(--text-secondary)">
                <span>${isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
                <span class="font-bold" style="color:var(--text-primary)">${summary.subtotal.toFixed(0)} QAR</span>
              </div>
              <div class="flex justify-between" style="color:var(--text-secondary)">
                <span>${isAr ? 'التوصيل في قطر' : 'Delivery'}</span>
                <span class="font-bold ${summary.shipping === 0 ? 'text-emerald-400' : ''}" style="${summary.shipping !== 0 ? 'color:var(--text-primary)' : ''}">
                  ${summary.shipping === 0 ? (isAr ? 'مجاني 🎉' : 'Free 🎉') : summary.shipping + ' QAR'}
                </span>
              </div>
              <div class="flex justify-between text-base pt-3 border-t font-black" style="border-color:var(--border-color);color:var(--text-primary)">
                <span>${isAr ? 'الإجمالي الكلي' : 'Total'}</span>
                <span class="text-xl" style="color:var(--color-accent)">${summary.total.toFixed(0)} QAR</span>
              </div>
            </div>
            <a href="/checkout/" class="btn-primary w-full py-3.5 justify-center font-bold text-sm shadow-lg">
              ${isAr ? 'متابعة الدفع' : 'Proceed to Checkout'}
            </a>
            <a href="/shop/" class="block text-center text-xs font-semibold py-2 transition" style="color:var(--text-secondary)">
              ${isAr ? 'الاستمرار في التسوق' : 'Continue Shopping'}
            </a>
          </div>
        </div>
      `;
    }

    initEvents() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.notify());
      } else {
        this.notify();
      }

      document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('[data-add-to-cart]');
        if (addBtn) {
          e.preventDefault();
          const slug = addBtn.dataset.addToCart;
          const name = addBtn.dataset.name;
          const price = addBtn.dataset.price;
          const image = addBtn.dataset.image;
          if (name && price) {
            this.addItem({ slug, name, price, image }, 1);
          } else {
            this.addItem(slug, 1);
          }
          return;
        }

        if (e.target.closest('[data-open-cart]')) {
          e.preventDefault();
          this.openDrawer();
          return;
        }

        if (e.target.closest('[data-close-cart]')) {
          e.preventDefault();
          this.closeDrawer();
          return;
        }
      });
    }
  }

  global.cart = new LocalCart();
  global.CartSystem = global.cart;
  global.openCart = () => global.cart.openDrawer();
  global.closeCart = () => global.cart.closeDrawer();
})(window);
