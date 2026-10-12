// ─── MARJAAH Qatar Centralized API Client ─────────────────────────────────
(function (global) {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  // Use current origin if behind reverse proxy/hosting rewrite, or fallback to port 3001 in dev
  const defaultBaseUrl = isLocal ? 'http://localhost:3001' : window.location.origin;

  const API_CONFIG = {
    baseUrl: window.API_BASE_URL || localStorage.getItem('marjaah_api_url') || defaultBaseUrl,
    tokenKey: 'marjaah_auth_token',
    userKey: 'marjaah_auth_user',
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

    async request(endpoint, options = {}) {
      const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`;
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
          // Token expired or invalid
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
    cancelOrder(id) { return this.post(`/api/orders/${id}/cancel`, {}); }
    getProfile() { return this.get('/api/auth/me'); }
    login(credentials) { return this.post('/api/auth/login', credentials); }
    register(userData) { return this.post('/api/auth/register', userData); }
    firebaseLogin(idToken) { return this.post('/api/auth/firebase-login', { idToken }); }
    submitContact(message) { return this.post('/api/contact', message); }
    getDashboard() { return this.get('/api/admin/dashboard'); }
  }

  global.api = new ApiClient(API_CONFIG);
  global.ApiClient = ApiClient;
})(window);
