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
      this.listeners.forEach(fn => fn(this.items, summary));
    }

    getItems() {
      return [...this.items];
    }

    addItem(product, quantity = 1) {
      if (!product || !product.slug) return;
      const qty = Math.max(1, Number(quantity) || 1);
      const existing = this.items.find(i => i.slug === product.slug);

      if (existing) {
        existing.quantity += qty;
      } else {
        const firstImg = Array.isArray(product.images) && product.images.length > 0
          ? product.images[0]
          : (product.primary_image || product.image || '/static/images/placeholder.svg');

        this.items.push({
          id: product.id || '',
          slug: product.slug,
          name: product.name,
          name_ar: product.name_ar || '',
          price: Number(product.price) || 0,
          original_price: product.original_price ? Number(product.original_price) : null,
          image: firstImg,
          brand: product.brand || '',
          quantity: qty,
        });
      }

      this.save();
      if (global.Toast) {
        const isAr = document.documentElement.lang === 'ar' || window.location.pathname.startsWith('/ar');
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
        if (global.Toast) {
          const isAr = document.documentElement.lang === 'ar' || window.location.pathname.startsWith('/ar');
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
      // Free shipping over 200 QAR
      const shipping = subtotal >= 200 || subtotal === 0 ? 0 : 20;
      const total = subtotal + shipping;
      return { subtotal, shipping, total, count };
    }

    updateNavbarBadge(count) {
      const badges = document.querySelectorAll('.cart-badge, [data-cart-count], #cart-count');
      badges.forEach(b => {
        b.textContent = count;
        if (count > 0) {
          b.classList.remove('hidden', 'opacity-0');
        } else {
          b.classList.add('hidden');
        }
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

      const isAr = document.documentElement.lang === 'ar' || window.location.pathname.startsWith('/ar');
      const summary = this.getSummary();

      if (this.items.length === 0) {
        content.innerHTML = `
          <div class="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-slate-400" style="background:var(--bg-surface-2)">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </div>
            <p class="font-semibold text-lg mb-1">${isAr ? 'سلة التسوق فارغة' : 'Your cart is empty'}</p>
            <p class="text-sm text-slate-400 mb-6">${isAr ? 'لم تقم بإضافة أي منتجات بعد' : 'Explore hardware and add your favorite items'}</p>
            <a href="/shop/" class="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition">
              ${isAr ? 'تصفح المتجر' : 'Start Shopping'}
            </a>
          </div>
        `;
        return;
      }

      const itemsHtml = this.items.map(item => `
        <div class="flex items-center gap-3 p-3 rounded-xl border mb-2" style="background:var(--bg-surface-2);border-color:var(--border-color)">
          <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-contain rounded-lg bg-white/5 p-1" />
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-medium truncate">${isAr && item.name_ar ? item.name_ar : item.name}</h4>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs font-semibold text-indigo-400">${item.price} QAR</span>
              ${item.original_price ? `<span class="text-xs line-through text-slate-500">${item.original_price} QAR</span>` : ''}
            </div>
            <div class="flex items-center gap-2 mt-2">
              <button onclick="cart.updateQuantity('${item.slug}', ${item.quantity - 1})" class="w-6 h-6 rounded flex items-center justify-center bg-slate-800 text-slate-200 hover:bg-slate-700">-</button>
              <span class="text-xs font-semibold px-2">${item.quantity}</span>
              <button onclick="cart.updateQuantity('${item.slug}', ${item.quantity + 1})" class="w-6 h-6 rounded flex items-center justify-center bg-slate-800 text-slate-200 hover:bg-slate-700">+</button>
              <button onclick="cart.removeItem('${item.slug}')" class="text-xs text-rose-400 hover:text-rose-300 ml-auto">${isAr ? 'حذف' : 'Remove'}</button>
            </div>
          </div>
        </div>
      `).join('');

      content.innerHTML = `
        <div class="flex-1 overflow-y-auto p-4 space-y-2">
          ${itemsHtml}
        </div>
        <div class="p-4 border-t" style="border-color:var(--border-color);background:var(--bg-surface)">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-slate-400">${isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
            <span class="font-semibold">${summary.subtotal.toFixed(2)} QAR</span>
          </div>
          <div class="flex justify-between text-sm mb-3">
            <span class="text-slate-400">${isAr ? 'الشحن:' : 'Shipping:'}</span>
            <span class="font-semibold text-emerald-400">${summary.shipping === 0 ? (isAr ? 'مجاني' : 'FREE') : summary.shipping + ' QAR'}</span>
          </div>
          <div class="flex justify-between text-base font-bold mb-4 pt-2 border-t" style="border-color:var(--border-color)">
            <span>${isAr ? 'الإجمالي الكلي:' : 'Total:'}</span>
            <span class="text-indigo-400">${summary.total.toFixed(2)} QAR</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <a href="/cart/" class="py-2.5 rounded-xl text-center text-sm font-semibold border hover:bg-white/5 transition" style="border-color:var(--border-color)">
              ${isAr ? 'عرض السلة' : 'View Cart'}
            </a>
            <a href="/checkout/" class="py-2.5 rounded-xl text-center text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition">
              ${isAr ? 'إتمام الطلب' : 'Checkout'}
            </a>
          </div>
        </div>
      `;
    }

    initEvents() {
      document.addEventListener('DOMContentLoaded', () => {
        this.notify();
      });

      document.addEventListener('click', (e) => {
        if (e.target.closest('[data-open-cart]')) {
          e.preventDefault();
          this.openDrawer();
        } else if (e.target.closest('[data-close-cart]')) {
          e.preventDefault();
          this.closeDrawer();
        }
      });
    }
  }

  global.cart = new LocalCart();
  global.CartSystem = global.cart;
})(window);
