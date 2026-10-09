import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Select from '../components/Select.jsx';
import Stepper from '../components/Stepper.jsx';
import FileDrop from '../components/FileDrop.jsx';
import { REQUEST_TYPES, REMARKS, deriveTitle, missingRequired } from '../data/requestTypes';
import FormFields from '../components/FormFields.jsx';
import OrgFields from '../components/OrgFields.jsx';
import { api } from '../api';


export default function CreateRequest() {
  const { state } = useLocation();
  const nav = useNavigate();
  const [stage, setStage] = useState(1);
  const [type, setType] = useState(state?.type || '');
  const [matter, setMatter] = useState(state?.matter || '');
  const [values, setValues] = useState({});
  const [fileMap, setFileMap] = useState({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cfg, setCfg] = useState(null);
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  useEffect(() => { api.config().then((c) => { setCfg(c); setCompany(c.companies[0] || ''); }).catch(() => {}); }, []);

  const matters = REQUEST_TYPES.find((t) => t.name === type)?.matters.map((m) => m.name) || [];
  const setVal = (k, v) => setValues((p) => ({ ...p, [k]: v }));

  const go = async (draft) => {
    setTried(true);
    if (!draft && missingRequired(matter, values).length) return;
    setBusy(true); setError('');
    try {
      const form = new FormData();
      form.append('type', type); form.append('matter', matter); form.append('title', deriveTitle(matter, values));
      form.append('company', company); form.append('department', department);
      form.append('draft', draft ? '1' : '');
      form.append('fields', JSON.stringify(values));
      Object.values(fileMap).flat().forEach((f) => form.append('files', f));
      const r = await api.create(form);
      nav('/requests/' + r.id);
    } catch (e) { setError(e.message); setBusy(false); }
  };
  const next = () => {
    setTried(true);
    if (type && matter) { setStage(2); setTried(false); }
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
          <p className="muted small">โปรดกรอกข้อมูลในข้อที่มีดอกจันกำกับให้ครบถ้วน (Please fill out the information in the sections marked with *)</p>
          <h3 className="form-heading">ข้อมูลของผู้ทำคำขอ (User Information)</h3>
          <div className="field"><label>คำขอเลขที่ (Request No.)</label><input className="form-control" value="Draft" disabled /></div>
          <div className="field"><label>วันที่สร้างคำขอ (Date of Request)</label><input className="form-control" value={new Date().toLocaleDateString('en-GB')} disabled /></div>
          {cfg && <OrgFields cfg={cfg} company={company} department={department} onCompany={setCompany} onDepartment={setDepartment} />}
          <h3 className="form-heading">ข้อมูลทั่วไป (Request General Information)</h3>
          <div className="field"><label>ประเภทคำขอ (Type of Request)</label><input className="form-control" value={type} disabled /></div>
          <div className="field"><label>เรื่อง (Matters)</label><input className="form-control" value={matter} disabled /></div>
          {cfg && <FormFields matter={matter} values={values} set={setVal} cfg={cfg} tried={tried} fileMap={fileMap} setFileMap={setFileMap} />}
          <div className="remark"><b>หมายเหตุ (Remark)</b><br />{REMARKS[matter]}</div>
          {error && <div className="err big">{error}</div>}
        </div>
      )}
      <div className="form-footer">
        <button className="btn-back" onClick={back}>Back</button>
        {stage === 1 ? (
          <button className="btn btn-primary" onClick={next}>Continue</button>
        ) : (
          <span className="foot-actions">
            <button className="btn btn-outline" onClick={() => go(true)} disabled={busy}>Save</button>
            <button className="btn btn-primary" onClick={() => go(false)} disabled={busy}>{busy ? 'Submitting...' : 'Submit'}</button>
          </span>
        )}
      </div>
    </div>
  );
}
