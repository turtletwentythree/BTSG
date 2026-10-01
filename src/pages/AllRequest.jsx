import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { STEPS } from '../data/requestTypes';

export default function AllRequest() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
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
      {error && <div className="err big">{error}</div>}
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Request No.</th><th>Type</th><th>Matter</th><th>Title</th><th>Requester</th><th>Created</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(rows || []).map((r) => (
              <tr key={r.id} className="clickable" onClick={() => nav('/requests/' + r.id)}>
                <td>{r.no}</td><td>{r.type}</td><td>{r.matter}</td><td>{r.title}</td>
                <td>{r.requester}</td><td>{r.created_at.slice(0, 10)}</td>
                <td><span className={'badge-status' + (r.step === 10 ? ' done' : '')}>{STEPS[r.step - 1]}</span></td>
              </tr>
            ))}
            {rows && rows.length === 0 && <tr><td colSpan="7" className="empty">No requests found</td></tr>}
            {!rows && !error && <tr><td colSpan="7" className="empty">Loading...</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
