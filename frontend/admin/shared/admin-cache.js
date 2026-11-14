(function () {
  'use strict';

  const CACHE_PREFIX = 'marjaah_cache_v2_';
  const FORBIDDEN_KEYS = new Set(['orders', 'order', 'live_orders', 'transactions', 'payment_status', 'admin_dashboard_cache', 'customer_presence', 'customers_analytics', 'presence']);

  window.SmartCache = {
    memory: new Map(),
    imageCache: new Set(),
    listeners: new Map(),

    get(key) {
      if (FORBIDDEN_KEYS.has(key)) return null;

      if (this.memory.has(key)) {
        const item = this.memory.get(key);
        if (Date.now() < item.expiresAt) {
          return item.data;
        }
        this.memory.delete(key);
      }

      try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;

        const record = JSON.parse(raw);
        if (Date.now() > record.expiresAt) {
          localStorage.removeItem(CACHE_PREFIX + key);
          return null;
        }

        this.memory.set(key, record);
        return record.data;
      } catch (err) {
        return null;
      }
    },

    set(key, data, ttlMs = 10 * 60 * 1000) {
      if (FORBIDDEN_KEYS.has(key)) {
        return;
      }

      const expiresAt = Date.now() + ttlMs;
      const record = { data, expiresAt, savedAt: Date.now() };

      this.memory.set(key, record);

      try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(record));
      } catch (err) {
        this.pruneExpired();
        try {
          localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(record));
        } catch (_) {}
      }
    },

    remove(key) {
      this.memory.delete(key);
      try {
        localStorage.removeItem(CACHE_PREFIX + key);
      } catch (_) {}
      this.emit(key, null);
    },

    async swr(key, fetcherFn, onUpdate, ttlMs = 10 * 60 * 1000) {
      const cached = this.get(key);

      if (cached !== null && cached !== undefined) {
        if (typeof onUpdate === 'function') {
          try {
            onUpdate(cached, false);
          } catch (e) {}
        }
      }

      this.revalidateInBackground(key, fetcherFn, onUpdate, ttlMs, cached);
      return cached;
    },

    async revalidateInBackground(key, fetcherFn, onUpdate, ttlMs, previousData) {
      try {
        const fresh = await fetcherFn();
        if (fresh === null || fresh === undefined) return;

        const prevJson = previousData ? JSON.stringify(previousData) : '';
        const freshJson = JSON.stringify(fresh);

        this.set(key, fresh, ttlMs);

        if (prevJson !== freshJson && typeof onUpdate === 'function') {
          onUpdate(fresh, true);
        }
      } catch (err) {}
    },

    preloadImages(imageUrls) {
      if (!Array.isArray(imageUrls)) return;
      imageUrls.slice(0, 40).forEach((url) => {
        if (!url || typeof url !== 'string' || this.imageCache.has(url)) return;
        this.imageCache.add(url);
        const img = new Image();
        img.src = url;
      });
    },

    getProducts() {
      return this.get('catalog_products') || [];
    },

    setProducts(products, ttlMs = 20 * 60 * 1000) {
      this.set('catalog_products', products, ttlMs);
      const images = (products || []).slice(0, 30).map((p) => p.image).filter(Boolean);
      this.preloadImages(images);
      this.emit('products:changed', products);
    },

    findProduct(idOrSlugOrName) {
      if (!idOrSlugOrName) return null;
      const target = String(idOrSlugOrName).toLowerCase().trim();
      const list = this.getProducts();
      return (
        list.find(
          (p) =>
            String(p.id).toLowerCase() === target ||
            String(p.slug || '').toLowerCase() === target ||
            String(p.name || '').toLowerCase() === target ||
            String(p.sku || '').toLowerCase() === target
        ) || null
      );
    },

    updateProduct(product) {
      if (!product || !product.id) return;
      const list = this.getProducts();
      const idx = list.findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...product };
      } else {
        list.unshift(product);
      }
      this.setProducts(list);
    },

    removeProduct(productId) {
      if (!productId) return;
      const list = this.getProducts().filter((p) => p.id !== productId);
      this.setProducts(list);
    },

    getCategories() {
      return this.get('catalog_categories') || [];
    },

    setCategories(categories) {
      this.set('catalog_categories', categories, 60 * 60 * 1000);
    },

    getBrands() {
      return this.get('catalog_brands') || [];
    },

    setBrands(brands) {
      this.set('catalog_brands', brands, 60 * 60 * 1000);
    },

    on(event, handler) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(handler);
    },

    off(event, handler) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(handler);
      }
    },

    emit(event, payload) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).forEach((cb) => {
          try {
            cb(payload);
          } catch (e) {}
        });
      }
    },

    pruneExpired() {
      try {
        const now = Date.now();
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(CACHE_PREFIX)) {
            try {
              const rec = JSON.parse(localStorage.getItem(k) || '{}');
              if (rec.expiresAt && now > rec.expiresAt) {
                localStorage.removeItem(k);
              }
            } catch (_) {
              localStorage.removeItem(k);
            }
          }
        }
      } catch (_) {}
    },
  };

  try {
    window.SmartCache.pruneExpired();
  } catch (_) {}
})();

