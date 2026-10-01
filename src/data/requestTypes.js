export const REQUEST_TYPES = [
  { name: 'Contract / Agreement', matters: [
    { name: 'NDA', color: '#6844ff' },
    { name: 'Service Agreement', color: '#6844ff' },
  ] },
  { name: 'Corporate Works', matters: [{ name: 'DBD Registration', color: '#ff974a' }] },
  { name: 'Legal Documents', matters: [{ name: 'Legal Documents', color: '#f8b9ff' }] },
];

export const STEPS = [
  'Fill out request form', 'Submitting request', 'Waiting for acceptance', 'Reviewing',
  'Waiting for user comment', 'User approved', 'Finalizing', 'Waiting for final approval',
  'Signing', 'Complete',
];

/* Fields specific to each matter. type: text | textarea | select | number | date */
export const MATTER_FIELDS = {
  NDA: [
    { key: 'counterparty', label: 'ชื่อคู่สัญญา (Counterparty)', type: 'text', required: true },
    { key: 'counterparty_type', label: 'ประเภทคู่สัญญา (Counterparty type)', type: 'select', options: ['Company', 'Individual'] },
    { key: 'nda_type', label: 'ประเภท NDA', type: 'select', options: ['One-way', 'Mutual'], required: true },
    { key: 'purpose', label: 'วัตถุประสงค์ (Purpose)', type: 'textarea', required: true },
    { key: 'term_years', label: 'ระยะเวลา (ปี) (Term, years)', type: 'number' },
    { key: 'governing_law', label: 'กฎหมายที่ใช้บังคับ (Governing law)', type: 'select', options: ['Thailand', 'Other'] },
    { key: 'effective_date', label: 'วันที่มีผลบังคับ (Effective date)', type: 'date' },
  ],
  'Service Agreement': [
    { key: 'party', label: 'ชื่อคู่สัญญา (Counterparty)', type: 'text', required: true },
    { key: 'role', label: 'สถานะของเรา (Our role)', type: 'select', options: ['Service provider', 'Customer'], required: true },
    { key: 'service', label: 'รายละเอียดบริการ (Scope of service)', type: 'textarea', required: true },
    { key: 'value', label: 'มูลค่าสัญญา (Contract value)', type: 'number' },
    { key: 'currency', label: 'สกุลเงิน (Currency)', type: 'select', options: ['THB', 'USD', 'EUR'] },
    { key: 'start_date', label: 'วันเริ่มต้น (Start date)', type: 'date' },
    { key: 'end_date', label: 'วันสิ้นสุด (End date)', type: 'date' },
    { key: 'payment_terms', label: 'เงื่อนไขการชำระเงิน (Payment terms)', type: 'text' },
  ],
  'DBD Registration': [
    { key: 'reg_type', label: 'ประเภทการจดทะเบียน (Registration type)', type: 'select', required: true,
      options: ['Company registration', 'Change of directors', 'Change of address', 'Change of objectives', 'Capital increase', 'Dissolution'] },
    { key: 'company', label: 'ชื่อบริษัท (Company name)', type: 'text', required: true },
    { key: 'reg_no', label: 'เลขทะเบียนนิติบุคคล (Registration no.)', type: 'text' },
    { key: 'details', label: 'รายละเอียด (Details)', type: 'textarea' },
    { key: 'target_date', label: 'วันที่ต้องการให้เสร็จ (Target date)', type: 'date' },
  ],
  'Legal Documents': [
    { key: 'doc_type', label: 'ประเภทเอกสาร (Document type)', type: 'select', required: true,
      options: ['Power of attorney', 'Certificate', 'Letter', 'Other'] },
    { key: 'purpose', label: 'วัตถุประสงค์ (Purpose)', type: 'textarea', required: true },
    { key: 'language', label: 'ภาษา (Language)', type: 'select', options: ['Thai', 'English', 'Thai + English'] },
    { key: 'needed_by', label: 'ต้องการภายในวันที่ (Needed by)', type: 'date' },
  ],
};

export const fieldLabel = (matter, key) =>
  (MATTER_FIELDS[matter] || []).find((f) => f.key === key)?.label || key;
