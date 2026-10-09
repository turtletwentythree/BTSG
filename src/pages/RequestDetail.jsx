import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Stepper from '../components/Stepper.jsx';
import { api, fmtDate, fmtSize } from '../api';
import { STEPS, fieldLabel } from '../data/requestTypes';

export default function RequestDetail() {
  const params = useParams();
  let id = params.id;
  if (!id && params.code) { try { id = atob(params.code); } catch { id = ''; } }
  const [tab, setTab] = useState('summary');
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

  const byDay = [...r.history].reverse().reduce((m, h) => {
    const d = new Date(h.at);
    const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    (m[day] = m[day] || []).push({ ...h, time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) });
    return m;
  }, {});
  const Row = ({ l, v }) => <div className="rf-row"><span className="rf-l">{l}</span><b className="rf-v">{v || '-'}</b></div>;

  return (
    <div className="page detail">
      <div className="crumb"><Link to="/">← All Request</Link></div>
      <h2 className="rd-title">Request Detail &gt; {r.no}</h2>
      <Stepper current={r.step} />
      {error && <div className="err big">{error}</div>}

      <div className="rd-tabs">
        {[['summary', 'Summary Request'], ['form', 'Request Form'], ['history', 'History']].map(([k, l]) => (
          <button key={k} className={'rd-tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>
        ))}
        <span className="rd-spacer" />
        {r.can_edit && <Link className="btn btn-outline" to={`/requests/${r.id}/edit`}><i className="mdi mdi-pencil-outline" /> แก้ไขข้อมูล</Link>}
      </div>

      {tab === 'summary' && (
        <section className="rd-card">
          <h3 className="rd-h">ร่างเอกสารสุดท้าย (Finalize Document)</h3>
          <Row l="เลขที่คำขอ (Request No.)" v={r.no} />
          <Row l="สถานะ (Status)" v={STEPS[r.step - 1]} />
          <p className="rf-l">ร่างเอกสารสุดท้ายและเอกสารแนบ (Finalized Document and Attachment)</p>
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
          <p className="rf-l rd-gap">ผู้รับเรื่อง / ผู้อนุมัติขั้นตอนสุดท้าย (Legal handler / Final approver)</p>
          <b>{r.handler_name || <span className="muted">ยังไม่มีผู้รับเรื่อง</span>}</b>
          {r.legal_note !== undefined && <><p className="rf-l rd-gap">บันทึกภายใน (เห็นเฉพาะฝ่ายกฎหมาย)</p><b>{r.legal_note || '-'}</b></>}
          <div className="rd-gap">
            {r.step < STEPS.length && !r.can_advance && <p className="muted">รอผู้มีสิทธิ์อนุมัติดำเนินการขั้นถัดไป: {STEPS[r.step]}</p>}
            {r.step < STEPS.length && r.can_advance && (
              <button className="btn btn-primary" disabled={busy} onClick={() => run(() => api.advance(id))}>
                Move to next step: {STEPS[r.step]}
              </button>
            )}
          </div>
        </section>
      )}

      {tab === 'form' && (
        <section className="rd-card">
          <button className="btn btn-primary rd-export" onClick={() => window.print()}><i className="mdi mdi-export-variant" /> Export</button>
          <h3 className="rd-h">ข้อมูลของผู้ทำคำขอ (User Information)</h3>
          <div className="rf-grid">
            <Row l="คำขอเลขที่ (Request No.)" v={r.no} />
            <Row l="วันที่สร้างคำขอ (Date of Request)" v={new Date(r.created_at).toLocaleDateString('en-GB')} />
            <Row l="ผู้ทำคำขอ (User’s Request)" v={r.requester} />
            <Row l="อีเมลผู้ทำคำขอ (User’s email)" v={r.requester_email} />
            <Row l="บริษัทที่สังกัด (User's BU)" v={r.company} />
            <Row l="แผนกที่สังกัด (User's Department)" v={r.department} />
          </div>
          <h3 className="rd-h">ข้อมูลทั่วไป (Request General Information)</h3>
          <div className="rf-grid">
            <Row l="ประเภทคำขอ (Type of Request)" v={r.matter} />
            <Row l="หมวด (Category)" v={r.type} />
            <Row l="หัวข้อ (Title)" v={r.title} />
            {Object.entries(r.fields).map(([k, v]) => <Row key={k} l={fieldLabel(r.matter, k)} v={String(v)} />)}
          </div>
          <h3 className="rd-h">เอกสารแนบ (Attachment)</h3>
          {r.attachments.length === 0 ? <p className="muted">No attachments</p> : (
            <ul className="file-list">{r.attachments.map((a) => <li key={a.id}><i className="mdi mdi-paperclip" /><a className="fn" href={api.downloadUrl(a.id)}>{a.filename}</a><span className="fs">{fmtSize(a.size)}</span></li>)}</ul>
          )}
          <h3 className="rd-h">ฝ่ายกฎหมาย (Legal)</h3>
          <div className="rf-grid"><Row l="ผู้รับเรื่อง" v={r.handler_name} /></div>
        </section>
      )}

      {tab === 'history' && (
        <section className="rd-card">
          <h3 className="rd-h">History</h3>
          {Object.entries(byDay).map(([day, items]) => (
            <div key={day} className="hs-day">
              <div className="hs-date">{day}</div>
              {items.map((h, i) => (
                <div key={i} className="hs-item">
                  <div className="hs-top"><b>{h.note || h.step_name}</b><span>{h.time}</span></div>
                  <small>{h.step_name} · By {h.actor}</small>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}
      <div className="rd-back"><Link to="/" className="btn btn-outline">Back</Link></div>
    </div>
  );
}
