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
    const error = new Error(payload?.message || `Request failed (${response.status})`);
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

export async function getInventory({ q = "", page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q.trim()) params.set("q", q.trim());
  return request(`/api/v2/inventory?${params.toString()}`);
}
