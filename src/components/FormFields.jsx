import { useState } from 'react';
import Select from './Select.jsx';
import { OTHERS, visibleFields } from '../data/requestTypes';
import { fmtSize } from '../api';

const split = (v) => String(v || '').split(';').filter(Boolean);

// Modal with a multi-select list (DBD "Registration Request").
function RegsField({ f, value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState([]);
  const sel = split(value);
  const toggle = (o) => setDraft((d) => (d.includes(o) ? d.filter((x) => x !== o) : [...d, o]));
  return (
    <>
      <button type="button" className="btn btn-outline" onClick={() => { setDraft(sel); setOpen(true); }}>
        <i className="mdi mdi-playlist-edit" /> {f.label}{sel.length ? ` (${sel.length})` : ''}
      </button>
      {f.hint && <div className="muted small">{f.hint}</div>}
      {sel.length > 0 && <ul className="chosen">{sel.map((s) => <li key={s}>{s}</li>)}</ul>}
      {error && <div className="err">กรุณากรอกข้อมูลนี้ (Required)</div>}
      {open && (
        <div className="modal-back" onClick={() => setOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>เรื่องที่จะขอจดทะเบียน (Registration Request)</h3>
            <p className="muted small">สามารถเลือกได้มากกว่า 1 เอกสาร (You can select more than 1 document)</p>
            <div className="modal-list">
              {f.options.map((o) => (
                <label key={o} className="chk"><input type="checkbox" checked={draft.includes(o)} onChange={() => toggle(o)} /> {o}</label>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => { onChange(draft.join(';')); setOpen(false); }}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FileField({ f, files = [], onChange }) {
  const add = (list) => onChange([...files, ...Array.from(list)]);
  return (
    <div>
      <label className="btn btn-outline attach-btn">
        <i className="mdi mdi-paperclip" /> Attachment File
        <input type="file" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </label>
      {files.length > 0 && (
        <ul className="file-list">{files.map((x, i) => (
          <li key={i}><i className="mdi mdi-paperclip" /> <span className="fn">{x.name}</span><span className="fs">{fmtSize(x.size)}</span>
            <button type="button" className="x" onClick={() => onChange(files.filter((_, j) => j !== i))}><i className="mdi mdi-close" /></button></li>
        ))}</ul>
      )}
    </div>
  );
}

// Renders every visible field of a matter's form definition.
export default function FormFields({ matter, values, set, cfg, tried, fileMap, setFileMap }) {
  const fields = visibleFields(matter, values);
  const req = (f) => tried && f.required && !String(values[f.key] ?? '').trim();
  return fields.map((f, i) => {
    if (f.type === 'heading') return <h3 key={'h' + i} className="form-heading">{f.label}</h3>;
    if (f.type === 'file' && !setFileMap) return null;
    const options = f.options === '@companies' ? cfg.companies : typeof f.options === 'function' ? f.options(values) : f.options;
    const v = values[f.key] ?? '';
    return (
      <div className="field" key={f.key}>
        <label>{f.label}{f.required && <span className="req">*</span>}</label>
        {f.type === 'select' && (
          <>
            <Select value={v} options={f.others ? [...options, OTHERS] : options} onChange={(x) => { set(f.key, x); (f.resets || []).forEach((k) => set(k, '')); }} placeholder={f.placeholder || 'โปรดเลือก...'} />
            {f.others && v === OTHERS && (
              <input className="form-control gap" placeholder="ระบุ (Others)" value={values[f.key + '_other'] ?? ''} onChange={(e) => set(f.key + '_other', e.target.value)} />
            )}
          </>
        )}
        {f.type === 'text' && <input className="form-control" value={v} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />}
        {f.type === 'number' && <input className="form-control" type="number" min="0" value={v} onChange={(e) => set(f.key, e.target.value)} />}
        {f.type === 'date' && <input className="form-control" type="date" value={v} onChange={(e) => set(f.key, e.target.value)} />}
        {f.type === 'textarea' && (
          <>
            {f.hint && <div className="muted small">{f.hint}</div>}
            <textarea className="form-control" rows="4" value={v} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
          </>
        )}
        {f.type === 'radio' && (
          <div className="radios">{options.map((o) => (
            <label key={o} className="chk"><input type="radio" name={f.key} checked={v === o} onChange={() => set(f.key, o)} /> {f.labels?.[o] || o}</label>
          ))}</div>
        )}
        {f.type === 'checks' && (
          <div className="radios">{options.map((o) => {
            const cur = split(v);
            return (
              <label key={o} className="chk"><input type="checkbox" checked={cur.includes(o)}
                onChange={() => set(f.key, (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]).join(';'))} /> {o}</label>
            );
          })}</div>
        )}
        {f.type === 'regs' && <RegsField f={f} value={v} error={req(f)} onChange={(x) => set(f.key, x)} />}
        {f.type === 'file' && <FileField f={f} files={fileMap[f.key]} onChange={(l) => setFileMap({ ...fileMap, [f.key]: l })} />}
        {f.type !== 'regs' && req(f) && <div className="err">กรุณากรอกข้อมูลนี้ (Required)</div>}
      </div>
    );
  });
}
