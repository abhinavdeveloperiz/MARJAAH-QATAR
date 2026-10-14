// ─── MARJAAH Qatar Centralized API Client ─────────────────────────────────
(function (global) {
  // Live Cloud Run 2nd Gen API URL deployed on Google Cloud
  const CLOUD_RUN_API_URL = 'https://api-44oukcn4rq-uc.a.run.app';
  const CLOUD_FUNCTIONS_API_URL = CLOUD_RUN_API_URL;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // If on production, clear any stale localhost or invalid URL accidentally stored in localStorage
  if (!isLocal) {
    try {
      const stored = localStorage.getItem('marjaah_api_url');
      if (stored && (stored.includes('localhost') || stored.includes('127.0.0.1'))) {
        localStorage.removeItem('marjaah_api_url');
      }
    } catch (e) {}
  }


  const defaultBaseUrl = isLocal ? 'http://localhost:3001' : (window.API_BASE_URL || '');

  const API_CONFIG = {
    baseUrl: window.API_BASE_URL || localStorage.getItem('marjaah_api_url') || defaultBaseUrl,
    tokenKey: 'marjaah_auth_token',
    userKey: 'marjaah_auth_user',
    cloudFunctionsUrl: CLOUD_RUN_API_URL,
    cloudRunUrl: CLOUD_RUN_API_URL,
  };

  class ApiClient {
    constructor(config) {
      this.config = config;
    }

    getToken() {
      return localStorage.getItem(this.config.tokenKey) || '';
    }

    setToken(token) {
      if (token) {
        localStorage.setItem(this.config.tokenKey, token);
      } else {
        localStorage.removeItem(this.config.tokenKey);
      }
    }

    getUser() {
      try {
        const u = localStorage.getItem(this.config.userKey);
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    }

    setUser(user) {
      if (user) {
        localStorage.setItem(this.config.userKey, JSON.stringify(user));
      } else {
        localStorage.removeItem(this.config.userKey);
      }
    }

    clearAuth() {
      this.setToken(null);
      this.setUser(null);
    }

    isTokenValid() {
      const token = this.getToken();
      if (!token) return false;
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && (payload.exp * 1000) <= Date.now()) {
          console.warn('Authentication token has expired. Clearing session.');
          this.clearAuth();
          return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    }

    async verifyToken(token) {
      const t = token || this.getToken();
      if (!t) return { valid: false, error: 'No token found' };
      try {
        const res = await this.post('/api/auth/verify-token', { token: t });
        return res;
      } catch (err) {
        return { valid: false, error: err.message };
      }
    }

    async request(endpoint, options = {}) {
      let base = (this.config.baseUrl || '').replace(/\/+$/, '');
      let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

      // Prevent /api/api/... duplication if base already ends in /api
      if (base.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
        cleanEndpoint = cleanEndpoint.substring(4);
      }

      const url = endpoint.startsWith('http') ? endpoint : `${base}${cleanEndpoint}`;
      const headers = { ...(options.headers || {}) };

      const token = this.getToken();
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (response.status === 401) {
          if (token) {
            console.warn('Session expired. Clearing credentials.');
            this.clearAuth();
          }
        }

        const contentType = response.headers.get('content-type') || '';
        let data;
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          const errorMessage = (data && (data.message || data.error)) || `HTTP ${response.status} Error`;
          const error = new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
          error.status = response.status;
          error.data = data;
          throw error;
        }

        return data;
      } catch (error) {
        if (!options._isRetry) {
          // If calling via one method fails (e.g. cross-origin/CORS or relative rewrite), retry with alternate
          const isDirectUrl = url.includes('run.app') || url.includes('cloudfunctions.net');
          const altUrl = isDirectUrl
            ? cleanEndpoint
            : `${CLOUD_RUN_API_URL}${cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`}`;
          console.warn(`API Request failed on [${url}], automatically retrying with fallback [${altUrl}]...`);
          try {
            return await this.request(altUrl, { ...options, _isRetry: true });
          } catch (retryErr) {
            console.error(`Fallback API Request also failed [${altUrl}]:`, retryErr);
          }
        }
        console.error(`API Request Failed [${options.method || 'GET'} ${url}]:`, error);
        throw error;
      }
    }

    get(endpoint, params = {}) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.append(k, String(v));
        }
      });
      const qStr = query.toString();
      const path = qStr ? `${endpoint}?${qStr}` : endpoint;
      return this.request(path, { method: 'GET' });
    }

    post(endpoint, body = {}) {
      const isForm = body instanceof FormData;
      return this.request(endpoint, {
        method: 'POST',
        body: isForm ? body : JSON.stringify(body),
      });
    }

    put(endpoint, body = {}) {
      const isForm = body instanceof FormData;
      return this.request(endpoint, {
        method: 'PUT',
        body: isForm ? body : JSON.stringify(body),
      });
    }

    patch(endpoint, body = {}) {
      const isForm = body instanceof FormData;
      return this.request(endpoint, {
        method: 'PATCH',
        body: isForm ? body : JSON.stringify(body),
      });
    }

    delete(endpoint) {
      return this.request(endpoint, { method: 'DELETE' });
    }

    // ── Pre-wired helper methods ────────────────────────
    getCategories() { return this.get('/api/categories'); }
    getCategory(slug) { return this.get(`/api/categories/${slug}`); }
    getSubcategories(catSlug) { return this.get('/api/subcategories', { categorySlug: catSlug }); }
    getBrands() { return this.get('/api/brands'); }
    getBanners(type) { return this.get('/api/banners', { type }); }
    getProducts(params) { return this.get('/api/products', params); }
    getProduct(slug) { return this.get(`/api/products/${slug}`); }
    validateCart(items) { return this.post('/api/cart/validate', { items }); }
    createOrder(orderData) { return this.post('/api/orders', orderData); }
    getOrder(idOrNumber) { return this.get(`/api/orders/${idOrNumber}`); }
    getOrders(params) { return this.get('/api/orders', params); }
    updateOrderStatus(id, status) { return this.patch(`/api/orders/${id}/status`, { status }); }
    cancelOrder(id) { return this.post(`/api/orders/${id}/cancel`, {}); }
    getProfile() { return this.get('/api/auth/me'); }
    login(credentials) { return this.post('/api/auth/login', credentials); }
    adminLogin(credentials) { return this.post('/api/auth/admin-login', credentials); }
    register(userData) { return this.post('/api/auth/register', userData); }
    firebaseLogin(idToken) { return this.post('/api/auth/firebase-login', { idToken }); }
    submitContact(message) { return this.post('/api/contact', message); }
    getContactMessages(params) { return this.get('/api/contact', params); }
    getContactMessage(id) { return this.get(`/api/contact/${id}`); }
    updateContactStatus(id, status) { return this.patch(`/api/contact/${id}/status`, { status }); }
    replyContactMessage(id, reply) { return this.post(`/api/contact/${id}/reply`, { reply }); }
    deleteContactMessage(id) { return this.delete(`/api/contact/${id}`); }
    getContactStats() { return this.get('/api/contact/stats'); }
    getDashboard() { return this.get('/api/admin/dashboard'); }

    // ── Admin & Storage upload methods ──────────────────
    async uploadImage(file, folder = 'products') {
      if (!file) return { url: '' };

      const getBase64 = (f) => new Promise((resolve, reject) => {
        // If image is larger than 1.5MB and is JPEG/PNG/WebP, compress via canvas
        if (f.type && f.type.startsWith('image/') && !f.type.includes('svg') && !f.type.includes('gif') && f.size > 1.5 * 1024 * 1024) {
          const img = new Image();
          const objUrl = URL.createObjectURL(f);
          img.onload = () => {
            URL.revokeObjectURL(objUrl);
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1600;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const quality = 0.88;
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objUrl);
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(f);
          };
          img.src = objUrl;
        } else {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(f);
        }
      });

      try {
        const base64Data = await getBase64(file);
        // Primary: JSON Base64 upload (works 100% on Cloud Functions & avoids Busboy stream consumption issues)
        const res = await this.post('/api/upload/base64', {
          data: base64Data,
          filename: file.name || 'image.jpg',
          folder: folder || 'products',
        });
        return res;
      } catch (err) {
        console.warn('Base64 upload attempt failed, attempting fallback to multipart upload:', err);
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('folder', folder || 'products');
          return await this.post(`/api/upload/image?folder=${encodeURIComponent(folder || 'products')}`, formData);
        } catch (fbErr) {
          console.error('All upload methods failed:', fbErr);
          throw fbErr;
        }
      }
    }
    createProduct(data) { return this.post('/api/products', data); }
    updateProduct(id, data) { return this.put(`/api/products/${id}`, data); }
    deleteProduct(id) { return this.delete(`/api/products/${id}`); }
    createCategory(data) { return this.post('/api/categories', data); }
    updateCategory(id, data) { return this.put(`/api/categories/${id}`, data); }
    deleteCategory(id) { return this.delete(`/api/categories/${id}`); }
    createSubcategory(data) { return this.post('/api/subcategories', data); }
    updateSubcategory(id, data) { return this.put(`/api/subcategories/${id}`, data); }
    deleteSubcategory(id) { return this.delete(`/api/subcategories/${id}`); }
    createBrand(data) { return this.post('/api/brands', data); }
    updateBrand(id, data) { return this.put(`/api/brands/${id}`, data); }
    deleteBrand(id) { return this.delete(`/api/brands/${id}`); }
  }

  global.api = new ApiClient(API_CONFIG);
  global.ApiClient = ApiClient;
})(window);
