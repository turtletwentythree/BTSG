async function call(path, opts = {}) {
  const res = await fetch('/api' + path, opts);
  if (res.status === 401 && location.pathname !== '/login') { location.assign('/login'); throw new Error('Please sign in'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
  return data;
}
export const api = {
  list: (q = '') => call('/requests' + (q ? '?q=' + encodeURIComponent(q) : '')),
  stats: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return call('/stats' + (qs ? '?' + qs : ''));
  },
  config: () => call('/config'),
  get: (id) => call('/requests/' + id),
  create: (form) => call('/requests', { method: 'POST', body: form }),
  update: (id, body) => call('/requests/' + id, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }),
  advance: (id, note) => call(`/requests/${id}/advance`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note }),
  }),
  upload: (id, files) => {
    const f = new FormData();
    [...files].forEach((x) => f.append('files', x));
    return call(`/requests/${id}/attachments`, { method: 'POST', body: f });
  },
  removeAttachment: (id) => call('/attachments/' + id, { method: 'DELETE' }),
  downloadUrl: (id) => '/api/attachments/' + id,
};
export const fmtSize = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
export const fmtDate = (s) => (s ? s.slice(0, 16).replace('T', ' ') : '');
