import Select from './Select.jsx';

// Company + Department inputs shared by the create and edit forms.
export default function OrgFields({ cfg, company, department, onCompany, onDepartment }) {
  return (
    <>
      <div className="field">
        <label>บริษัท (Company)<span className="req">*</span></label>
        <Select value={company} options={cfg.companies} onChange={onCompany} />
      </div>
      <div className="field">
        <label>แผนก (Department)</label>
        {cfg.departmentsFixed ? (
          <Select value={department} options={cfg.departments} onChange={onDepartment} />
        ) : (
          <>
            <input className="form-control" list="dept-list" value={department} onChange={(e) => onDepartment(e.target.value)} placeholder="เช่น Finance, HR, Sales" />
            <datalist id="dept-list">{cfg.departments.map((d) => <option key={d} value={d} />)}</datalist>
          </>
        )}
      </div>
    </>
  );
}
