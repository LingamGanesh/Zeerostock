const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

async function request(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && retry && !path.startsWith("/api/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) return request(path, options, false);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = Array.isArray(payload?.errors) ? payload.errors.map((entry) => entry.message || entry).join(", ") : "";
    const error = new Error(detail || payload?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = payload?.errors || [];
    throw error;
  }
  return payload;
}

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "X-CSRF-Protection": "1" },
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.data?.accessToken) {
          setAccessToken(null);
          return null;
        }
        setAccessToken(payload.data.accessToken);
        return payload.data.user;
      } catch {
        setAccessToken(null);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function login(email, password) {
  const payload = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, false);
  setAccessToken(payload.data.accessToken);
  return payload.data.user;
}

export async function logout() {
  try {
    await request("/api/auth/logout", {
      method: "POST",
      headers: { "X-CSRF-Protection": "1" },
    }, false);
  } finally {
    setAccessToken(null);
  }
}

export async function getInventory({ q = "", page = 1, limit = 12, lowStock = false } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q.trim()) params.set("q", q.trim());
  if (lowStock) params.set("lowStock", "true");
  return request(`/api/v2/inventory?${params.toString()}`);
}

export async function getSuppliers() {
  return request("/api/suppliers");
}

export async function createInventory(data) {
  return request("/api/v2/inventory", { method: "POST", body: JSON.stringify(data) });
}

export async function updateInventory(id, data) {
  return request(`/api/v2/inventory/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function archiveInventory(id) {
  return request(`/api/v2/inventory/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function adjustInventory(id, data) {
  return request(`/api/v2/inventory/${encodeURIComponent(id)}/adjustments`, { method: "POST", body: JSON.stringify(data) });
}

export async function getInventoryMovements(id, { page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return request(`/api/v2/inventory/${encodeURIComponent(id)}/movements?${params.toString()}`);
}

export async function getDashboardSummary() {
  return request("/api/v2/dashboard/summary");
}

export async function createSupplier(data) {
  return request("/api/suppliers", { method: "POST", body: JSON.stringify(data) });
}

export async function updateSupplier(id, data) {
  return request(`/api/suppliers/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function archiveSupplier(id) {
  return request(`/api/suppliers/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getPurchaseOrders({ page = 1, limit = 20, status = "" } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  return request(`/api/v2/purchase-orders?${params.toString()}`);
}

export async function createPurchaseOrder(data) {
  return request("/api/v2/purchase-orders", { method: "POST", body: JSON.stringify(data) });
}

export async function approvePurchaseOrder(id) {
  return request(`/api/v2/purchase-orders/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

export async function receivePurchaseOrder(id, items) {
  return request(`/api/v2/purchase-orders/${encodeURIComponent(id)}/receive`, { method: "POST", body: JSON.stringify({ items }) });
}

export async function getStockReport({ type = "all", limit = 5000 } = {}) {
  const params = new URLSearchParams({ type, limit: String(limit) });
  return request(`/api/v2/reports/stock?${params.toString()}`);
}

export async function getMovementReport({ from = "", to = "", movementType = "", page = 1, limit = 25 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (movementType) params.set("movementType", movementType);
  return request(`/api/v2/reports/movements?${params.toString()}`);
}
