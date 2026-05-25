// Cienki klient HTTP do API panelu. Token JWT trzymany w localStorage.
const KEY = 'fp_admin_token';

let token = localStorage.getItem(KEY) || null;

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem(KEY, t);
  else localStorage.removeItem(KEY);
}

export function getToken() {
  return token;
}

export async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {}),
    },
  });
  let data = {};
  try { data = await res.json(); } catch { /* pusta odpowiedź */ }
  if (!res.ok) {
    const err = new Error(data.error || 'Błąd serwera (' + res.status + ')');
    err.status = res.status;
    throw err;
  }
  return data;
}
