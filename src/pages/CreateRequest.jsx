import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Select from '../components/Select.jsx';
import Stepper from '../components/Stepper.jsx';
import FileDrop from '../components/FileDrop.jsx';
import { MATTER_FIELDS, REQUEST_TYPES } from '../data/requestTypes';
import Field from '../components/Field.jsx';
import OrgFields from '../components/OrgFields.jsx';
import { api } from '../api';


export default function CreateRequest() {
  const { state } = useLocation();
  const nav = useNavigate();
  const [stage, setStage] = useState(1);
  const [type, setType] = useState(state?.type || '');
  const [matter, setMatter] = useState(state?.matter || '');
  const [title, setTitle] = useState('');
  const [values, setValues] = useState({});
  const [files, setFiles] = useState([]);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cfg, setCfg] = useState(null);
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  useEffect(() => { api.config().then((c) => { setCfg(c); setCompany(c.companies[0] || ''); }).catch(() => {}); }, []);

  const matters = REQUEST_TYPES.find((t) => t.name === type)?.matters.map((m) => m.name) || [];
  const fields = MATTER_FIELDS[matter] || [];
  const setVal = (k, v) => setValues({ ...values, [k]: v });

  const next = async () => {
    setTried(true);
    if (stage === 1) {
      if (type && matter) { setStage(2); setTried(false); }
      return;
    }
    const missing = !title.trim() || fields.some((f) => f.required && !String(values[f.key] ?? '').trim());
    if (missing) return;
    setBusy(true); setError('');
    try {
      const form = new FormData();
      form.append('type', type); form.append('matter', matter); form.append('title', title.trim());
      form.append('company', company); form.append('department', department);
      form.append('fields', JSON.stringify(values));
      files.forEach((f) => form.append('files', f));
      const r = await api.create(form);
      nav('/requests/' + r.id);
    } catch (e) { setError(e.message); setBusy(false); }
  };
  const back = () => (stage === 2 ? setStage(1) : nav(-1));

  return (
    <div className="page create">
      <Stepper current={1} />
      {stage === 1 ? (
        <div className="form-body">
          <h2>เลือกประเภทของคำขอ (Select Type of Request)</h2>
          <label>ประเภทคำขอ (Type of Request)<span className="req">*</span></label>
          <Select value={type} options={REQUEST_TYPES.map((t) => t.name)} onChange={(v) => { setType(v); setMatter(''); }} />
          {tried && !type && <div className="err">กรุณาเลือกประเภทคำขอ</div>}
          <label>เรื่อง (Matters)<span className="req">*</span></label>
          <Select value={matter} options={matters} onChange={setMatter} disabled={!type} />
          {tried && !matter && <div className="err">กรุณาเลือกเรื่อง</div>}
        </div>
      ) : (
        <div className="form-body">
          <h2>{matter} <small>({type})</small></h2>
          <div className="field">
            <label>หัวข้อคำขอ (Title)<span className="req">*</span></label>
            <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
            {tried && !title.trim() && <div className="err">กรุณากรอกข้อมูลนี้ (Required)</div>}
          </div>
          {cfg && <OrgFields cfg={cfg} company={company} department={department} onCompany={setCompany} onDepartment={setDepartment} />}
          {fields.map((f) => (
            <Field key={f.key} f={f} value={values[f.key] ?? ''} onChange={(v) => setVal(f.key, v)}
              error={tried && f.required && !String(values[f.key] ?? '').trim()} />
          ))}
          <FileDrop files={files} onChange={setFiles} />
          {error && <div className="err big">{error}</div>}
        </div>
      )}
      <div className="form-footer">
        <button className="btn-back" onClick={back}>Back</button>
        <button className="btn btn-primary" onClick={next} disabled={busy}>
          {stage === 1 ? 'Continue' : busy ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
