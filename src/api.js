const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export const api = {
  lookup: (word) => request(`/api/words/${encodeURIComponent(word)}`),
  list: (q) => request(`/api/words${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  register: (username, password) => request('/api/register', { method: 'POST', body: { username, password } }),
  login: (username, password) => request('/api/login', { method: 'POST', body: { username, password } }),
  unlock: (secret, token) => request('/api/unlock', { method: 'POST', body: { secret }, token }),
  addWord: (word, meaning, type, token) =>
    request('/api/words', { method: 'POST', body: { word, meaning, type }, token }),
};
