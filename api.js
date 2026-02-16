// API wrapper with JWT auth and offline fallback
const API_BASE = '/api';

const api = {
  getToken() {
    return localStorage.getItem('authToken');
  },

  setToken(token) {
    localStorage.setItem('authToken', token);
  },

  clearToken() {
    localStorage.removeItem('authToken');
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  async request(path, options = {}) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    try {
      const res = await fetch(API_BASE + path, { ...options, headers });

      if (res.status === 401) {
        this.clearToken();
        if (typeof showAuthOverlay === 'function') showAuthOverlay();
        throw new Error('Unauthorized');
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Request failed');
      }

      return await res.json();
    } catch (err) {
      if (err.message === 'Unauthorized') throw err;
      // Network error — offline
      console.warn('API offline, using localStorage fallback:', err.message);
      throw err;
    }
  },

  get(path) {
    return this.request(path);
  },

  post(path, body) {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) });
  },

  put(path, body) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(body) });
  },

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  },

  // Auth endpoints (public)
  signup(data) {
    return this.post('/auth/signup', data);
  },

  login(data) {
    return this.post('/auth/login', data);
  }
};
