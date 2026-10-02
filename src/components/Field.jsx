import Select from './Select.jsx';

export default function Field({ f, value, onChange, error }) {
  return (
    <div className="field">
      <label>{f.label}{f.required && <span className="req">*</span>}</label>
      {f.type === 'select' ? (
        <Select value={value} options={f.options} onChange={onChange} />
      ) : f.type === 'textarea' ? (
        <textarea className="form-control" rows="4" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="form-control" type={f.type} min={f.type === 'number' ? 0 : undefined}
          value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {error && <div className="err">กรุณากรอกข้อมูลนี้ (Required)</div>}
    </div>
  );
}
