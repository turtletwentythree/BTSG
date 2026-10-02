import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Field from '../components/Field.jsx';
import { MATTER_FIELDS } from '../data/requestTypes';
import { api } from '../api';

export default function EditRequest() {
  const { id } = useParams();
  const nav = useNavigate();
  const [r, setR] = useState(null);
  const [title, setTitle] = useState('');
  const [values, setValues] = useState({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(id).then((d) => { setR(d); setTitle(d.title); setValues(d.fields || {}); }).catch((e) => setError(e.message));
  }, [id]);

  if (error && !r) return <div className="page"><div className="err big">{error}</div></div>;
  if (!r) return <div className="page">Loading...</div>;
  if (!r.can_edit) return <div className="page"><div className="err big">คุณไม่มีสิทธิ์แก้ไขคำขอนี้</div><Link to={`/requests/${id}`}>← กลับ</Link></div>;

  const fields = MATTER_FIELDS[r.matter] || [];
  const known = new Set(fields.map((f) => f.key));
  const extra = Object.keys(values).filter((k) => !known.has(k));
  const setVal = (k, v) => setValues({ ...values, [k]: v });

  const save = async () => {
    setTried(true);
    const missing = !title.trim() || fields.some((f) => f.required && !String(values[f.key] ?? '').trim());
    if (missing) return;
    setBusy(true); setError('');
    try { await api.update(id, { title: title.trim(), fields: values }); nav('/requests/' + id); }
    catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <div className="page create">
      <div className="crumb"><Link to={`/requests/${id}`}>← {r.no}</Link></div>
      <div className="form-body">
        <h2>แก้ไขข้อมูลคำขอ <small>{r.no} · {r.type} · {r.matter} · ผู้ยื่น: {r.requester}</small></h2>
        <div className="field">
          <label>หัวข้อคำขอ (Title)<span className="req">*</span></label>
          <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
          {tried && !title.trim() && <div className="err">กรุณากรอกข้อมูลนี้ (Required)</div>}
        </div>
        {fields.map((f) => (
          <Field key={f.key} f={f} value={values[f.key] ?? ''} onChange={(v) => setVal(f.key, v)}
            error={tried && f.required && !String(values[f.key] ?? '').trim()} />
        ))}
        {extra.map((k) => (
          <Field key={k} f={{ key: k, label: k, type: 'text' }} value={values[k] ?? ''} onChange={(v) => setVal(k, v)} />
        ))}
        {error && <div className="err big">{error}</div>}
      </div>
      <div className="form-footer">
        <Link className="btn-back" to={`/requests/${id}`}>ยกเลิก</Link>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
      </div>
    </div>
  );
}
