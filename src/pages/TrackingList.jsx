import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { REQUEST_TYPES, STEPS } from '../data/requestTypes';

export const matterCode = (m) => btoa(unescape(encodeURIComponent(m)));
const decode = (c) => { try { return decodeURIComponent(escape(atob(c))); } catch { return ''; } };

// Columns shown beside the common ones, per matter: [header, field key]
const COLS = {
  NDA: ['Counter Party', 'counterparty', 'purpose'],
  'Service Agreement': ['Counter Party', 'counterparty', 'purpose'],
  'DBD Registration': ['Company', 'company_name', 'regs'],
  'Legal Documents': ["Company's Work", 'company_name', 'purpose'],
};

export default function TrackingList() {
  const { code } = useParams();
  const nav = useNavigate();
  const matter = decode(code);
  const known = REQUEST_TYPES.some((t) => t.matters.some((m) => m.name === matter));
  const type = REQUEST_TYPES.find((t) => t.matters.some((m) => m.name === matter))?.name;
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [company, setCompany] = useState('');
  const [handler, setHandler] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState({ key: 'created_at', dir: -1 });
  const [head, k1, k2] = COLS[matter] || ['Counter Party', null, null];
  useEffect(() => { api.list().then(setRows).catch((e) => setError(e.message)); }, []);

  const val = (r, k) => String((k ? (r.fields || {})[k] : r.company) ?? '').split(';').join(', ');
  const mine = useMemo(() => (rows || []).filter((r) => r.matter === matter), [rows, matter]);
  const opts = (fn) => [...new Set(mine.map(fn))].filter(Boolean).sort();
  const get = { no: (r) => r.no, created_at: (r) => r.created_at, company: (r) => r.company, party: (r) => String(val(r, k1)), purpose: (r) => String(val(r, k2)), handler: (r) => r.handler_name || '', step: (r) => r.step };
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = mine.filter((r) =>
      (!company || r.company === company) && (!handler || r.handler_name === handler) && (!status || String(r.step) === status) &&
      (!s || [r.no, r.title, r.company, val(r, k1), val(r, k2), r.handler_name].join(' ').toLowerCase().includes(s)));
    const g = get[sort.key];
    return list.sort((a, b) => (g(a) > g(b) ? 1 : g(a) < g(b) ? -1 : 0) * sort.dir);
  }, [mine, q, company, handler, status, sort]);

  const th = (key, label) => (
    <th className="sortable" onClick={() => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))}>
      {label} <i className="mdi mdi-sort" />
    </th>
  );
  if (!known) return <div className="page"><div className="err big">ไม่พบประเภทคำขอนี้</div><button className="btn btn-outline" onClick={() => nav('/all-type-request')}>Back</button></div>;

  return (
    <div className="page">
      <h2 className="tl-title">All {matter.toLowerCase()} request</h2>
      <div className="atr-header-row">
        <div className="atr-dht-div-title">
          <span className="atr-head-icon"><i className="mdi mdi-file-document-outline" /></span>
          <div><p className="atr-dht-title">Tracking Contract</p><p className="atr-dht-subtitle">{type} · {matter}</p></div>
        </div>
        <button className="btn btn-primary atr-title-btn-create" onClick={() => nav('/create-requests', { state: { type, matter } })}>
          <i className="mdi mdi-plus" /> Create Form
        </button>
      </div>
      <hr className="atr-hr" />
      <input className="form-control search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="filters">
        <label>BU
          <select value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">ทั้งหมด</option>{opts((r) => r.company).map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>Legal Team
          <select value={handler} onChange={(e) => setHandler(e.target.value)}>
            <option value="">ทั้งหมด</option>{opts((r) => r.handler_name).map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">ทั้งหมด</option>{STEPS.map((o, i) => <option key={o} value={i + 1}>{o}</option>)}
          </select>
        </label>
      </div>
      {error && <div className="err big">{error}</div>}
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr>
            {th('no', 'Request No.')}{th('created_at', 'Date Created')}{th('company', 'BU')}
            {th('party', head)}{th('purpose', 'purpose')}{th('handler', 'Legal Team')}{th('step', 'Status')}
          </tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => nav('/requests/' + r.id)}>
                <td>{r.no}</td><td>{r.created_at.slice(0, 10)}</td><td>{r.company}</td>
                <td>{String(val(r, k1)) || '-'}</td><td>{String(val(r, k2)) || '-'}</td><td>{r.handler_name || '-'}</td>
                <td><span className={'badge-status' + (r.step === 10 ? ' done' : '')}>{STEPS[r.step - 1]}</span></td>
              </tr>
            ))}
            {rows && shown.length === 0 && <tr><td colSpan="7" className="empty">No result found!</td></tr>}
            {!rows && !error && <tr><td colSpan="7" className="empty">Loading...</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="tl-foot"><span className="muted">Showing {shown.length ? 1 : 0} to {shown.length} of {shown.length} Results</span></div>
      <button className="btn btn-outline" onClick={() => nav('/all-type-request')}>Back</button>
    </div>
  );
}
