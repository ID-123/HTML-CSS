/* ══════════════════════════════════════════════
   api.js — Capa de comunicación con Django
   Centraliza todos los fetch al backend
══════════════════════════════════════════════ */

const API = (() => {
  const BASE = 'http://localhost:8000/api';  // Cambiar en producción

  // ── Helpers de cookies CSRF (requerido por Django) ──
  function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      const [k, v] = c.trim().split('=');
      if (k === name) return decodeURIComponent(v);
    }
    return null;
  }

  function getCSRF() {
    return getCookie('csrftoken') || localStorage.getItem('csrftoken') || '';
  }

  // ── Request base ──
  async function request(method, endpoint, data = null, useFormData = false) {
    const token = localStorage.getItem('authToken');
    const headers = {
      'X-CSRFToken': getCSRF(),
    };
    if (token) headers['Authorization'] = `Token ${token}`;

    const options = { method, headers, credentials: 'include' };

    if (data) {
      if (useFormData) {
        options.body = data;  // FormData
      } else {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
      }
    }

    const res = await fetch(`${BASE}${endpoint}`, options);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(json.detail || json.message || JSON.stringify(json) || 'Error del servidor');
      err.status = res.status;
      err.data = json;
      throw err;
    }
    return json;
  }

  // ── Métodos públicos ──
  return {
    // AUTH
    login:    (email, password)  => request('POST', '/auth/login/',    { email, password }),
    logout:   ()                  => request('POST', '/auth/logout/'),
    register: (data)              => request('POST', '/auth/register/', data),
    profile:  ()                  => request('GET',  '/auth/profile/'),
    updateProfile: (data)         => request('PATCH','/auth/profile/', data),

    // PRODUCTS
    getProducts:    (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/products/?${qs}`);
    },
    getProduct:     (id)          => request('GET',  `/products/${id}/`),
    getFeatured:    ()             => request('GET',  '/products/?featured=true&limit=8'),
    getPromos:      ()             => request('GET',  '/products/?on_sale=true'),
    searchProducts: (q)            => request('GET',  `/products/?search=${encodeURIComponent(q)}`),

    // CATEGORIES
    getCategories:  ()             => request('GET',  '/categories/'),

    // ORDERS / HISTORIAL
    getOrders:      ()             => request('GET',  '/orders/'),
    getOrder:       (id)           => request('GET',  `/orders/${id}/`),
    createOrder:    (data)         => request('POST', '/orders/', data),

    // POINTS
    getPoints:      ()             => request('GET',  '/points/'),
    redeemPoints:   (points, orderId) => request('POST', '/points/redeem/', { points, order_id: orderId }),

    // ADMIN — CLIENTES
    adminGetClients:  (params={}) => {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/admin/clients/?${qs}`);
    },
    adminGetClient:   (id)        => request('GET',  `/admin/clients/${id}/`),
    adminBlockClient: (id)        => request('POST', `/admin/clients/${id}/block/`),
    adminDeleteClient:(id)        => request('DELETE',`/admin/clients/${id}/`),

    // ADMIN — PRODUCTOS
    adminGetProducts:  (params={}) => {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/admin/products/?${qs}`);
    },
    adminCreateProduct: (data)    => request('POST', '/admin/products/', data),
    adminUpdateProduct: (id, data)=> request('PATCH',`/admin/products/${id}/`, data),
    adminDeleteProduct: (id)      => request('DELETE',`/admin/products/${id}/`),
    adminToggleVisible: (id, visible) => request('PATCH', `/admin/products/${id}/`, { visible }),
    adminAddStock:      (id, qty) => request('POST', `/admin/products/${id}/add_stock/`, { quantity: qty }),

    // CONTACT
    sendContact: (data)           => request('POST', '/contact/', data),
  };
})();
