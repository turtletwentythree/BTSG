import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FormFields from '../components/FormFields.jsx';
import Field from '../components/Field.jsx';
import OrgFields from '../components/OrgFields.jsx';
import Select from '../components/Select.jsx';
import { FORMS, missingRequired } from '../data/requestTypes';
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
  const [cfg, setCfg] = useState(null);
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [handler, setHandler] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    Promise.all([api.get(id), api.config()]).then(([d, c]) => {
      setR(d); setCfg(c); setTitle(d.title); setValues(d.fields || {});
      setCompany(d.company || c.companies[0]); setDepartment(d.department || '');
      setHandler(d.handler_email || ''); setNote(d.legal_note || '');
    }).catch((e) => setError(e.message));
  }, [id]);

  if (error && !r) return <div className="page"><div className="err big">{error}</div></div>;
  if (!r || !cfg) return <div className="page">Loading...</div>;
  if (!r.can_edit) return <div className="page"><div className="err big">คุณไม่มีสิทธิ์แก้ไขคำขอนี้</div><Link to={`/requests/${id}`}>← กลับ</Link></div>;

  const known = new Set((FORMS[r.matter] || []).map((f) => f.key));
  const extra = Object.keys(values).filter((k) => !known.has(k) && !k.endsWith('_other'));
  const setVal = (k, v) => setValues((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setTried(true);
    const missing = !title.trim() || missingRequired(r.matter, values).length > 0;
    if (missing) return;
    setBusy(true); setError('');
    try {
      const body = { title: title.trim(), fields: values, company, department };
      if (cfg.approver) {
        const m = cfg.legalTeam.find((t) => t.email === handler);
        Object.assign(body, { handler_email: handler, handler_name: m ? m.name : handler, legal_note: note });
      }
      await api.update(id, body); nav('/requests/' + id);
    }
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
        <OrgFields cfg={cfg} company={company} department={department} onCompany={setCompany} onDepartment={setDepartment} />
        <FormFields matter={r.matter} values={values} set={setVal} cfg={cfg} tried={tried} />
        {extra.map((k) => (
          <Field key={k} f={{ key: k, label: k, type: 'text' }} value={values[k] ?? ''} onChange={(v) => setVal(k, v)} />
        ))}
        {cfg.approver && (
          <div className="legal-box">
            <h3>ข้อมูลฝ่ายกฎหมาย (Legal use only)</h3>
            <div className="field">
              <label>ผู้รับเรื่อง (Handler)</label>
              <Select value={handler} options={cfg.legalTeam.map((t) => t.email)} onChange={setHandler}
                labelOf={(e) => (cfg.legalTeam.find((t) => t.email === e)?.name || e)} />
            </div>
            <div className="field">
              <label>บันทึกภายใน (Internal note)</label>
              <textarea className="form-control" rows="4" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="muted small">ผู้ยื่นคำขอและผู้ใช้ทั่วไปมองไม่เห็นข้อความนี้</div>
            </div>
          </div>
        )}
        {error && <div className="err big">{error}</div>}
      </div>
      <div className="form-footer">
        <Link className="btn-back" to={`/requests/${id}`}>ยกเลิก</Link>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
      </div>
    </div>
  );
}
