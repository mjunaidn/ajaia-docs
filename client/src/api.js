const BASE = '/api';

export function getCurrentUserId() {
  const raw = localStorage.getItem('marginalia.userId');
  return raw ? Number(raw) : null;
}

export function setCurrentUserId(id) {
  if (id === null) localStorage.removeItem('marginalia.userId');
  else localStorage.setItem('marginalia.userId', String(id));
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const userId = getCurrentUserId();
  if (userId) headers['x-user-id'] = String(userId);
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  listUsers: () => request('/users'),

  listDocuments: () => request('/documents'),
  createDocument: (title) => request('/documents', { method: 'POST', body: { title } }),
  getDocument: (id) => request(`/documents/${id}`),
  updateDocument: (id, patch) => request(`/documents/${id}`, { method: 'PATCH', body: patch }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  shareDocument: (id, email, permission) =>
    request(`/documents/${id}/share`, { method: 'POST', body: { email, permission } }),
  revokeShare: (id, userId) => request(`/documents/${id}/share/${userId}`, { method: 'DELETE' }),
  uploadDocument: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/documents/upload', { method: 'POST', body: form, isForm: true });
  },
};
