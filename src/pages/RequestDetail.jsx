import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Stepper from '../components/Stepper.jsx';
import { api, fmtDate, fmtSize } from '../api';
import { STEPS, fieldLabel } from '../data/requestTypes';

export default function RequestDetail() {
  const { id } = useParams();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const reload = useCallback(() => api.get(id).then(setR).catch((e) => setError(e.message)), [id]);
  useEffect(() => { reload(); }, [reload]);

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); await reload(); } catch (e) { setError(e.message); }
    setBusy(false);
  };

  if (error && !r) return <div className="page"><div className="err big">{error}</div></div>;
  if (!r) return <div className="page">Loading...</div>;

  return (
    <div className="page detail">
      <div className="crumb"><Link to="/">← All Request</Link></div>
      <div className="detail-head">
        <div>
          <p className="atr-dht-title">{r.title}</p>
          <p className="atr-dht-subtitle">{r.no} · {r.type} · {r.matter}</p>
        </div>
        <span className={'badge-status' + (r.step === 10 ? ' done' : '')}>{STEPS[r.step - 1]}</span>
      </div>
      <Stepper current={r.step} />
      {error && <div className="err big">{error}</div>}

      <div className="detail-grid">
        <section className="card-box">
          <h3>รายละเอียดคำขอ (Request details)</h3>
          <dl className="kv">
            <dt>Requester</dt><dd>{r.requester}</dd>
            <dt>Created</dt><dd>{fmtDate(r.created_at)}</dd>
            {Object.entries(r.fields).map(([k, v]) => (
              <div className="kvrow" key={k}><dt>{fieldLabel(r.matter, k)}</dt><dd>{String(v) || '-'}</dd></div>
            ))}
          </dl>
        </section>

        <section className="card-box">
          <h3>เอกสารแนบ (Attachments)</h3>
          {r.attachments.length === 0 && <p className="muted">No attachments</p>}
          <ul className="file-list">
            {r.attachments.map((a) => (
              <li key={a.id}>
                <i className="mdi mdi-paperclip" />
                <a className="fn" href={api.downloadUrl(a.id)}>{a.filename}</a>
                <span className="fs">{fmtSize(a.size)}</span>
                <button className="x" title="Remove" disabled={busy}
                  onClick={() => window.confirm('Remove this file?') && run(() => api.removeAttachment(a.id))}>
                  <i className="mdi mdi-delete-outline" />
                </button>
              </li>
            ))}
          </ul>
          <input ref={fileRef} type="file" multiple hidden
            onChange={(e) => { const f = e.target.files; e.target.value = ''; if (f.length) run(() => api.upload(id, f)); }} />
          <button className="btn btn-outline" disabled={busy} onClick={() => fileRef.current.click()}>
            <i className="mdi mdi-upload" /> Upload file
          </button>
        </section>

        <section className="card-box wide">
          <h3>ความคืบหน้า (Timeline)</h3>
          <ol className="timeline">
            {[...r.history].reverse().map((h, i) => (
              <li key={i}>
                <b>{h.step_name}</b>
                <span>{h.note}</span>
                <small>{h.actor} · {fmtDate(h.at)}</small>
              </li>
            ))}
          </ol>
          {r.step < STEPS.length && !r.can_advance && (
            <p className="muted">รอผู้มีสิทธิ์อนุมัติดำเนินการขั้นถัดไป: {STEPS[r.step]}</p>
          )}
          {r.step < STEPS.length && r.can_advance && (
            <button className="btn btn-primary" disabled={busy}
              onClick={() => run(() => api.advance(id))}>
              Move to next step: {STEPS[r.step]}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
