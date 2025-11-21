export const API_BASE = import.meta.env.VITE_BACKEND_URL || window.location.origin.replace(/:\d+$/, ':8000');

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let errText = await res.text().catch(() => '');
    try { errText = JSON.parse(errText).detail || errText } catch {}
    throw new Error(errText || `Request failed: ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body: JSON.stringify(body) }),
};
