import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { STEPS } from '../data/requestTypes';

const EMPTY = { company: '', department: '', type: '', matter: '', status: '', requester: '', handler: '', from: '', to: '' };

export default function AllRequest() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [flt, setFlt] = useState(EMPTY);
  const setF = (k, v) => setFlt((f) => ({ ...f, [k]: v }));
  const opts = useMemo(() => {
    const uniq = (fn) => [...new Set((rows || []).map(fn))].filter(Boolean).sort();
    return { company: uniq((r) => r.company), department: uniq((r) => r.department), handler: uniq((r) => r.handler_name), type: uniq((r) => r.type), matter: uniq((r) => r.matter), requester: uniq((r) => r.requester) };
  }, [rows]);
  const shown = useMemo(() => (rows || []).filter((r) =>
    (!flt.company || r.company === flt.company) && (!flt.department || r.department === flt.department) &&
    (!flt.handler || r.handler_name === flt.handler) && (!flt.type || r.type === flt.type) && (!flt.matter || r.matter === flt.matter) &&
    (!flt.requester || r.requester === flt.requester) && (!flt.status || String(r.step) === flt.status) &&
    (!flt.from || r.created_at.slice(0, 10) >= flt.from) && (!flt.to || r.created_at.slice(0, 10) <= flt.to)), [rows, flt]);
  const active = Object.values(flt).some(Boolean);
  useEffect(() => {
    const t = setTimeout(() => api.list(q).then(setRows).catch((e) => setError(e.message)), 200);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="page">
      <div className="atr-header-row">
        <div className="atr-dht-div-title">
          <span className="atr-head-icon"><i className="mdi mdi-view-column-outline" /></span>
          <div>
            <p className="atr-dht-title">All Request</p>
            <p className="atr-dht-subtitle">Track the status of your legal requests</p>
          </div>
        </div>
        <button className="btn btn-primary atr-title-btn-create" onClick={() => nav('/create-requests')}>
          <i className="mdi mdi-plus" /> Create Request
        </button>
      </div>
      <hr className="atr-hr" />
      <input className="form-control search" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="filters">
        <label>Company
          <select value={flt.company} onChange={(e) => setF('company', e.target.value)}>
            <option value="">ทั้งหมด</option>{opts.company.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>Department
          <select value={flt.department} onChange={(e) => setF('department', e.target.value)}>
            <option value="">ทั้งหมด</option>{opts.department.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>Type
          <select value={flt.type} onChange={(e) => setF('type', e.target.value)}>
            <option value="">ทั้งหมด</option>{opts.type.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>Matter
          <select value={flt.matter} onChange={(e) => setF('matter', e.target.value)}>
            <option value="">ทั้งหมด</option>{opts.matter.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>Status
          <select value={flt.status} onChange={(e) => setF('status', e.target.value)}>
            <option value="">ทั้งหมด</option>{STEPS.map((o, i) => <option key={o} value={i + 1}>{o}</option>)}
          </select>
        </label>
        <label>Requester
          <select value={flt.requester} onChange={(e) => setF('requester', e.target.value)}>
            <option value="">ทั้งหมด</option>{opts.requester.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>Handler (ผู้รับเรื่อง)
          <select value={flt.handler} onChange={(e) => setF('handler', e.target.value)}>
            <option value="">ทั้งหมด</option>{opts.handler.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>Created from
          <input type="date" value={flt.from} onChange={(e) => setF('from', e.target.value)} />
        </label>
        <label>to
          <input type="date" value={flt.to} onChange={(e) => setF('to', e.target.value)} />
        </label>
        {active && <button className="btn btn-outline" onClick={() => setFlt(EMPTY)}>ล้างตัวกรอง</button>}
        {rows && <span className="muted count">{shown.length} / {rows.length} รายการ</span>}
      </div>
      {error && <div className="err big">{error}</div>}
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Request No.</th><th>Company</th><th>Department</th><th>Type</th><th>Matter</th><th>Title</th><th>Requester</th><th>Handler</th><th>Created</th><th>Status</th></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => nav('/requests/' + r.id)}>
                <td>{r.no}</td><td>{r.company}</td><td>{r.department || '-'}</td><td>{r.type}</td><td>{r.matter}</td><td>{r.title}</td>
                <td>{r.requester}</td><td>{r.handler_name || '-'}</td><td>{r.created_at.slice(0, 10)}</td>
                <td><span className={'badge-status' + (r.step === 10 ? ' done' : '')}>{r.status_label || STEPS[r.step - 1]}</span></td>
              </tr>
            ))}
            {rows && shown.length === 0 && <tr><td colSpan="10" className="empty">No requests found</td></tr>}
            {!rows && !error && <tr><td colSpan="10" className="empty">Loading...</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
