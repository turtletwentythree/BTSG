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


/* ---------- Form definitions (mirrors the original Legal Request Form) ----------
   Field types: text | textarea | select | date | number | radio | checks | regs | file | heading | note
   `options: '@companies'` is replaced with the configured company list at render time.
   Multi-value answers (checks / regs) are stored as a ";"-joined string. */
export const OTHERS = 'อื่นๆ (Others)';
const LANGS = ['ภาษาไทย', 'ภาษาอังกฤษ (English)', 'ไทย-อังกฤษ (Thai-English)'];
const CONF = ['ทั่วไป', 'ภายในองค์กร (Internal)', 'ลับ (Confidential)', 'ลับมาก (Strictly Confidential)'];
const ACT_AS = ['ผู้ว่าจ้าง (Service Receiver)', 'ผู้รับจ้าง (Service Provider)'];
const company = (label = 'ทำสัญญาในนามของ (Company Name)') => [
  { key: 'company_name', label, type: 'select', options: '@companies', required: true, others: true, placeholder: 'ระบุชื่อในการทำสัญญา' },
];
const legalAction = [
  { key: 'legal_action', label: 'ต้องการให้ฝ่ายกฎหมายดำเนินการ (Request Legal Team to)', type: 'select', required: true,
    options: ['ตรวจสอบสัญญา/บันทึกข้อตกลงตามแนบ (Review draft agreement as attached)', 'ให้ฝ่ายกฎหมายจัดทำสัญญา/บันทึกข้อตกลง (Draft agreement)'] },
];
const DAY = 'Day-to-day Work / งานดำเนินงานทั่วไป', CONFI = 'Confidential / สัญญาลับ';
const CONTRACT_TREE = {
  [DAY]: {
    'Lease & Rental Agreement / สัญญาเช่าและให้เช่า': ['Lease Agreement / สัญญาเช่า', 'Sub Lease Agreement / สัญญาเช่าช่วง', 'Lease Asset Agreement / สัญญาเช่าทรัพย์สิน', 'Rental Agreement / สัญญาเช่าทั่วไป'],
    'Service Agreement / สัญญาให้บริการ': [],
    'Amendment Agreement / สัญญาแก้ไขเพิ่มเติม': [],
    'Sale and Purchase Agreement / สัญญาซื้อขาย': [],
    'Service Provider Agreement / สัญญาจ้าง': [],
    'Commercial Agreement / สัญญาทางธุรกิจ': ['Consultancy Agreement / สัญญาให้คำปรึกษา', 'Confidentiality Agreement / สัญญารักษาความลับ'],
    'Others / อื่น ๆ': [],
  },
  [CONFI]: {
    'Preliminary Agreement / ข้อตกลงเบื้องต้น': ['Memorandum of Understanding / บันทึกความเข้าใจ', 'Term Sheet / เอกสารสรุปเงื่อนไขเบื้องต้น'],
    'Commercial Agreement / สัญญาทางธุรกิจ': ['Consultancy Agreement / สัญญาให้คำปรึกษา', 'Confidentiality Agreement / สัญญารักษาความลับ', 'Management Agreement / สัญญาบริหารจัดการ', 'Loan Agreement / สัญญาเงินกู้', 'Mergers and Acquisitions Agreement / สัญญาการควบรวมและซื้อกิจการ', 'Shareholders’ Agreement / สัญญาระหว่างผู้ถือหุ้น'],
    'Others / อื่น ๆ': ['Others / อื่น ๆ'],
  },
};
const subTypes = (v) => CONTRACT_TREE[v.contract_class]?.[v.contract_type] || [];
const contractClass = [
  { key: 'contract_class', label: 'ประเภทสัญญา (Contract Classification)', type: 'select', required: true, options: Object.keys(CONTRACT_TREE), resets: ['contract_type', 'contract_sub'] },
  { key: 'contract_type', label: 'ชนิดของสัญญา (Type of Contract)', type: 'select', required: true, show: (v) => !!v.contract_class,
    options: (v) => Object.keys(CONTRACT_TREE[v.contract_class] || {}), resets: ['contract_sub'] },
  { key: 'contract_sub', label: 'ชนิดย่อยของสัญญา (Sub Type of Contract)', type: 'select', required: true, show: (v) => subTypes(v).length > 0, options: subTypes },
];

// Extra questions per contract type / sub type (my own design: the reference's contents are not readable).
const en = (x) => String(x || '').split(' / ')[0];
const T = (key, label, ph, extra = {}) => ({ key, label, type: 'text', placeholder: ph, ...extra });
const A = (key, label, ph, extra = {}) => ({ key, label, type: 'textarea', placeholder: ph, ...extra });
const TYPE_GROUPS = [
  { title: 'รายละเอียดสัญญาเช่า (Lease Details)', test: (t) => t === 'Lease & Rental Agreement', fields: [
    A('x_property', 'ทรัพย์สินที่เช่า / สถานที่ตั้ง (Leased Property & Location)', 'ระบุรายละเอียดทรัพย์สินและที่ตั้ง', { required: true }),
    T('x_area', 'พื้นที่เช่า (Area, sq.m.)', 'เช่น 120 ตร.ม.'),
    T('x_rent', 'ค่าเช่า (Rent per month/year)', 'ระบุจำนวนเงินและรอบการชำระ', { required: true }),
    T('x_deposit', 'เงินประกัน (Security Deposit)', 'ระบุจำนวนเงินประกัน'),
    T('x_other_charges', 'ค่าใช้จ่ายอื่น เช่น ค่าน้ำ ไฟ ส่วนกลาง (Other Charges)', 'ระบุ'),
  ] },
  { title: 'รายละเอียดสัญญาเช่าช่วง (Sub-lease)', test: (t, s) => s === 'Sub Lease Agreement', fields: [
    T('x_head_lessor', 'ผู้ให้เช่าตามสัญญาเช่าหลัก (Head Lessor)', 'ระบุชื่อ'),
    T('x_head_lease_ref', 'สัญญาเช่าหลักเลขที่/ลงวันที่ (Head Lease Ref.)', 'ระบุเลขที่/วันที่'),
  ] },
  { title: 'รายละเอียดทรัพย์สินที่เช่า (Leased Asset)', test: (t, s) => s === 'Lease Asset Agreement', fields: [
    T('x_asset_serial', 'หมายเลขเครื่อง/ทะเบียนทรัพย์สิน (Serial / Registration No.)', 'ระบุ'),
    T('x_asset_qty', 'จำนวน (Quantity)', 'ระบุจำนวน'),
  ] },
  { title: 'รายละเอียดสัญญาแก้ไขเพิ่มเติม (Amendment Details)', test: (t) => t === 'Amendment Agreement', fields: [
    T('x_orig_title', 'ชื่อสัญญาเดิม (Original Agreement)', 'ระบุชื่อสัญญาเดิม', { required: true }),
    { key: 'x_orig_date', label: 'วันที่ทำสัญญาเดิม (Original Agreement Date)', type: 'date' },
    A('x_amend_clauses', 'ข้อที่ต้องการแก้ไข (Clauses to Amend)', 'ระบุข้อและสิ่งที่ต้องการแก้ไข', { required: true }),
    A('x_amend_reason', 'เหตุผลในการแก้ไข (Reason)', 'ระบุเหตุผล'),
  ] },
  { title: 'รายละเอียดการซื้อขาย (Sale & Purchase Details)', test: (t) => t === 'Sale and Purchase Agreement', fields: [
    A('x_goods', 'สินค้า/ทรัพย์สินที่ซื้อขาย (Goods / Assets)', 'ระบุรายการ', { required: true }),
    T('x_qty', 'จำนวน (Quantity)', 'ระบุจำนวน'),
    T('x_price', 'ราคา (Price)', 'ระบุราคาและสกุลเงิน', { required: true }),
    T('x_delivery', 'กำหนด/สถานที่ส่งมอบ (Delivery Date & Place)', 'ระบุ'),
    T('x_warranty', 'การรับประกัน (Warranty)', 'ระบุระยะเวลาและเงื่อนไข'),
  ] },
  { title: 'รายละเอียดสัญญาจ้าง (Service Provider Details)', test: (t) => t === 'Service Provider Agreement', fields: [
    A('x_work', 'งานที่จ้าง (Work to be Performed)', 'ระบุรายละเอียดงาน', { required: true }),
    T('x_headcount', 'จำนวนบุคลากร (Number of Personnel)', 'ระบุจำนวน'),
    T('x_qualification', 'คุณสมบัติของผู้รับจ้าง (Qualifications)', 'ระบุ'),
  ] },
  { title: 'รายละเอียดสัญญาให้คำปรึกษา (Consultancy Details)', test: (t, s) => s === 'Consultancy Agreement', fields: [
    A('x_topics', 'หัวข้อ/ขอบเขตที่ปรึกษา (Consulting Topics)', 'ระบุ', { required: true }),
    T('x_deliverables', 'สิ่งที่ต้องส่งมอบ (Deliverables)', 'เช่น รายงาน คำแนะนำ'),
    T('x_consult_fee', 'ค่าที่ปรึกษา (Consulting Fee)', 'ระบุจำนวนเงินและเงื่อนไข'),
  ] },
  { title: 'รายละเอียดสัญญารักษาความลับ (Confidentiality Details)', test: (t, s) => s === 'Confidentiality Agreement', fields: [
    { key: 'x_nda_dir', label: 'รูปแบบการเปิดเผย (Disclosure)', type: 'radio', options: ['ฝ่ายเดียว (One-way)', 'ทั้งสองฝ่าย (Mutual)'], required: true },
    A('x_nda_info', 'ข้อมูลที่เป็นความลับ (Confidential Information)', 'ระบุประเภทข้อมูล', { required: true }),
    T('x_nda_purpose', 'วัตถุประสงค์ในการเปิดเผย (Purpose)', 'ระบุ'),
    T('x_nda_period', 'ระยะเวลาผูกพันการรักษาความลับ (Confidentiality Period)', 'เช่น 3 ปี'),
  ] },
  { title: 'รายละเอียดบันทึกความเข้าใจ (MOU Details)', test: (t, s) => s === 'Memorandum of Understanding', fields: [
    A('x_mou_obj', 'วัตถุประสงค์ความร่วมมือ (Objectives)', 'ระบุ', { required: true }),
    { key: 'x_mou_binding', label: 'ผลผูกพัน (Binding Effect)', type: 'radio', options: ['ไม่มีผลผูกพัน (Non-binding)', 'ผูกพันบางส่วน (Partly binding)', 'ผูกพัน (Binding)'] },
    T('x_mou_duration', 'ระยะเวลา (Duration)', 'ระบุ'),
  ] },
  { title: 'รายละเอียด Term Sheet', test: (t, s) => s === 'Term Sheet', fields: [
    A('x_ts_summary', 'สรุปธุรกรรม (Transaction Summary)', 'ระบุ', { required: true }),
    A('x_ts_terms', 'เงื่อนไขทางการค้าที่สำคัญ (Key Commercial Terms)', 'ระบุ'),
    T('x_ts_excl', 'ระยะเวลา Exclusivity (ถ้ามี)', 'ระบุ'),
  ] },
  { title: 'รายละเอียดสัญญาบริหารจัดการ (Management Details)', test: (t, s) => s === 'Management Agreement', fields: [
    A('x_mg_subject', 'กิจการ/ทรัพย์สินที่บริหาร (Managed Business / Asset)', 'ระบุ', { required: true }),
    T('x_mg_fee', 'ค่าบริหารจัดการ (Management Fee)', 'ระบุ'),
    A('x_mg_authority', 'ขอบเขตอำนาจของผู้บริหาร (Scope of Authority)', 'ระบุ'),
  ] },
  { title: 'รายละเอียดสัญญาเงินกู้ (Loan Details)', test: (t, s) => s === 'Loan Agreement', fields: [
    T('x_ln_lender', 'ผู้ให้กู้ (Lender)', 'ระบุ', { required: true }),
    T('x_ln_borrower', 'ผู้กู้ (Borrower)', 'ระบุ', { required: true }),
    T('x_ln_amount', 'วงเงินกู้ (Principal Amount)', 'ระบุจำนวนและสกุลเงิน', { required: true }),
    T('x_ln_rate', 'อัตราดอกเบี้ย (Interest Rate)', 'ระบุ'),
    T('x_ln_repay', 'กำหนดชำระคืน (Repayment Schedule)', 'ระบุ'),
    T('x_ln_collateral', 'หลักประกัน (Collateral)', 'ระบุ'),
  ] },
  { title: 'รายละเอียดการควบรวม/ซื้อกิจการ (M&A Details)', test: (t, s) => s === 'Mergers and Acquisitions Agreement', fields: [
    T('x_ma_target', 'บริษัทเป้าหมาย (Target Company)', 'ระบุ', { required: true }),
    { key: 'x_ma_structure', label: 'รูปแบบธุรกรรม (Structure)', type: 'radio', options: ['ซื้อหุ้น (Share purchase)', 'ซื้อสินทรัพย์ (Asset purchase)', 'ควบรวม (Merger)'] },
    T('x_ma_value', 'มูลค่าธุรกรรม (Transaction Value)', 'ระบุ'),
    { key: 'x_ma_dd', label: 'วันที่ตรวจสอบสถานะกิจการ (Due Diligence Date)', type: 'date' },
  ] },
  { title: 'รายละเอียดสัญญาผู้ถือหุ้น (Shareholders Details)', test: (t, s) => s === 'Shareholders’ Agreement', fields: [
    T('x_sh_company', 'บริษัท (Company)', 'ระบุ', { required: true }),
    A('x_sh_holders', 'ผู้ถือหุ้นและสัดส่วน (Shareholders & Shareholding %)', 'ระบุรายชื่อและสัดส่วน', { required: true }),
    A('x_sh_reserved', 'เรื่องที่ต้องได้รับความเห็นชอบเป็นพิเศษ (Reserved Matters)', 'ระบุ'),
  ] },
  { title: 'รายละเอียดสัญญา (Contract Details)', test: (t, s) => en(t) === 'Others' || t === 'Others', fields: [
    A('x_other_desc', 'อธิบายประเภทและสาระสำคัญของสัญญา (Description)', 'ระบุ', { required: true }),
  ] },
];
const typeFields = TYPE_GROUPS.flatMap((g, gi) => {
  const on = (v) => !!v.contract_type && g.test(en(v.contract_type), en(v.contract_sub));
  return [{ type: 'heading', label: g.title, show: on }, ...g.fields.map((f) => ({ ...f, show: on }))];
});
const common = [
  { key: 'language', label: 'ภาษา (Language)', type: 'select', options: LANGS, required: true },
  { key: 'confidentiality', label: 'ระดับชั้นความลับ (Confidentiality Level)', type: 'select', options: CONF, required: true },
  { key: 'pdpa', label: 'มีการเปิดเผย/ใช้/ประมวลผลข้อมูลส่วนบุคคลภายใต้เอกสารนี้หรือไม่ (Personal data will be disclosed/used/processed under this document)',
    type: 'radio', options: ['Yes (This request will be shared with PDPA team)', 'No'], required: true },
  { key: 'user_comment', label: 'ความเห็นของ User (User\'s Comment)', type: 'textarea', placeholder: 'ระบุว่ามีความเห็นเพิ่มเติมในเอกสาร/สัญญาดังกล่าวอย่างไร' },
];
const prevLegal = (label = 'นักกฎหมายที่เคยตรวจเอกสารนี้ (Legal team who has handled this work)') =>
  ({ key: 'prev_legal', label, type: 'text', placeholder: 'กรุณาระบุอีเมลของนักกฎหมายที่เคยรับผิดชอบเอกสารนี้' });
const approval = [
  { type: 'heading', label: 'User Approval Process' },
  { key: 'user_approver', label: 'ผู้อนุมัติแบบคำขอ (User Approver)', type: 'text', required: true, placeholder: 'กรุณากรอกอีเมล' },
  { key: 'user_coordinator', label: 'ชื่อผู้ประสานงาน (Name of User Coordinator)', type: 'text', required: true, placeholder: 'กรอกอีเมลผู้ประสานงาน' },
];
const BTS_REMARK = 'User รับทราบว่าแบบฟอร์มนี้เป็นความลับและมีวัตถุประสงค์เพื่อใช้ภายในบริษัทในเครือ BTS Group เท่านั้น / Users are fully aware that this request form is strictly private and confidential for internal use within BTS Group only.';
const termDates = (v) => v.term_type === 'dates';

export const REG_LIST = [
  'เพิ่มทุน (Increase Registered Capital)', 'ลดทุน (Decrease Registered Capital)', "แก้ไขชื่อ (Amendment of the Company's Name)",
  'แก้ไขตราประทับบริษัท (Amendment of the Company seal)', 'แก้ไขที่ตั้งสำนักงานใหญ่ (Amendment of the Head Office Address)',
  'แก้ไขที่ตั้งสำนักสาขา (Amendment of the Branch Office Address)', "แก้ไขวัตถุประสงค์ (Amendment of the Company's Objectives)",
  'แก้ไขข้อบังคับ (Amendment of the Article of Association)',
  'เปลี่ยนแปลงรายชื่อกรรมการ และ/หรือเปลี่ยนแปลงกรรมการผู้มีอำนาจลงนามผูกพันบริษัท (Amendment of the Directors and/or the Authorized Directors)',
  'เรียกชำระค่าหุ้นเพิ่ม (Calling of the Additional Share Payment)', 'โอนหุ้น (Share Transfer)', 'เลิกบริษัท (Company Liquidation)',
  'เสร็จการชำระบัญชี (The Completeness of Liquidation)', OTHERS,
];
export const LEGAL_DOCS = [
  '1.สำเนาหนังสือรับรอง ของบริษัท (Copy of company affidavit)', '2.สำเนาบัตรประชาชนและ/หรือทะเบียนบ้าน (Copy of ID Card and/or house registration)',
  '3.สำเนาหนังสือเดินทาง (Copy of passport)', '4.สำเนาบัญชีรายชื่อผู้ถือหุ้น (แบบ บอจ.5) (Copy of the list of shareholders)',
  '5.ใบทะเบียนภาษีมูลค่าเพิ่ม (ภพ.20) (Copy of VAT registration certificate)', '6. อื่นๆ ไม่รวมรายงานการประชุม (Other documents)',
];
const hasDoc = (v, n) => (v.required_docs || '').split(';').some((x) => x.startsWith(n + '.') || x.startsWith(n + ' '));
const copies = (k) => ({ key: k, label: 'จำนวน (Copies)', type: 'text', placeholder: 'จำนวนเอกสาร' });

export const FORMS = {
  NDA: [
    { key: 'project_name', label: 'ชื่อโครงการ (Project Name (if any))', type: 'text', placeholder: 'ระบุชื่อโครงการ(ถ้ามี)' },
    ...legalAction,
    { key: 'f_main', label: 'Attachment File', type: 'file' },
    ...company(),
    { key: 'nda_type', label: 'ประเภท NDA (Type of NDA)', type: 'select', required: true,
      options: ['BU เป็นฝ่ายเปิดเผยข้อมูล (BU as the Disclosing Party)', 'BU เป็นฝ่ายรับข้อมูล (BU as the Receiving Party)', 'ต่างฝ่ายต่างเปิดเผยและรับข้อมูล (Both Parties mutually disclose and receive information)'] },
    { key: 'counterparty', label: "ชื่อคู่สัญญาอีกฝ่าย (Counterparty's Name)", type: 'text', required: true, placeholder: 'ระบุชื่อคู่สัญญาอีกฝ่าย' },
    { key: 'purpose', label: 'วัตถุประสงค์ของการเปิดเผยข้อมูล (Purpose)', type: 'textarea', required: true,
      hint: 'ขอให้ระบุรายละเอียดอย่างย่อของสัญญาว่าเป็นเรื่องเกี่ยวกับอะไร เช่น สัญญาจ้างบริหารจัดการด้านบัญชี/ การตลาด, สัญญาเช่ารถยนต์ ทะเบียนเลขที่ x-xxx, สัญญาจ้างเหมาทำความสะอาด อาคาร xx ฯลฯ',
      placeholder: 'ระบุรายละเอียดอย่างย่อของสัญญาว่าเป็นเรื่องเกี่ยวกับอะไรให้ชัดเจน' },
    { key: 'start_date', label: 'เริ่มเปิดเผย/รับข้อมูลวันที่ (Beginning Date of Information Disclosure)', type: 'date', required: true },
    ...common,
    { key: 'f_attach', label: 'เอกสารแนบเพื่อพิจารณา (Attachment)', type: 'file' },
    prevLegal(),
    ...approval,
  ],
  'Service Agreement': [
    ...contractClass,
    ...typeFields,
    { key: 'project_name', label: 'ชื่อโครงการ (Project Name)', type: 'text', placeholder: 'ระบุชื่อโครงการ(ถ้ามี)' },
    ...legalAction,
    { key: 'f_main', label: 'Attachment File', type: 'file' },
    { type: 'heading', label: 'ชื่อคู่สัญญา (The Parties)' },
    ...company(),
    { key: 'act_as', label: 'โดยเป็นฝ่าย (Act as)', type: 'select', options: ACT_AS, required: true },
    { key: 'counterparty', label: "ชื่อคู่สัญญาอีกฝ่าย (Counterparty's Name)", type: 'text', required: true, placeholder: 'ระบุชื่อคู่สัญญาอีกฝ่าย' },
    { key: 'f_cp', label: 'กรุณาแนบไฟล์ Counterparty', type: 'file' },
    { key: 'counterparty_act_as', label: 'โดยเป็นฝ่าย (Act as)', type: 'select', options: ACT_AS },
    { type: 'heading', label: 'รายละเอียดการว่าจ้าง (Service Details)' },
    { key: 'purpose', label: 'วัตถุประสงค์ของการจ้าง/บริการ (Purpose)', type: 'textarea', required: true, placeholder: 'ระบุรายละเอียดอย่างย่อของสัญญาว่าเป็นเรื่องเกี่ยวกับอะไรให้ชัดเจน' },
    { key: 'place', label: 'สถานที่ที่ปฏิบัติงาน (Place of Performance)', type: 'text', placeholder: 'โปรดระบุรายละเอียดที่อยู่โดยละเอียด Please specify the address of place of performance.' },
    { key: 'scope', label: 'ขอบเขต และรายละเอียดการปฏิบัติงานตามสัญญา (Scope of Work)', type: 'textarea', placeholder: 'โปรดระบุรายละเอียดของขอบเขตงานตามสัญญานี้ Please specify the details of scope of work.' },
    { key: 'f_scope', label: 'โปรดแนบไฟล์ Scope of Work หรือเอกสารอื่นซึ่งแสดงขอบเขตและรายละเอียดของงาน', type: 'file' },
    { key: 'sla', label: 'มาตรฐาน/ระดับการให้บริการ (Service Standards/SLA)', type: 'radio',
      options: ['มี (โปรดระบุรายละเอียดหรือแนบไฟล์) (Details of SLA are as follows / attached)', 'ไม่มี (None)'] },
    { key: 'f_sla', label: 'แนบไฟล์ SLA', type: 'file', show: (v) => (v.sla || '').startsWith('มี') },
    { key: 'f_other', label: 'เอกสารอื่นๆ เพื่อพิจารณา (Attachment)', type: 'file' },
    { type: 'heading', label: 'ระยะเวลาของสัญญา (Term)' },
    { key: 'term_type', label: 'เลือกระยะเวลาของสัญญา', type: 'radio', options: ['dates', 'unknown'],
      labels: { dates: 'วันเริ่มต้นและสิ้นสุดสัญญา (Commencement and Expiry Date)', unknown: 'ยังไม่ทราบวันที่เริ่มต้นและวันที่สิ้นสุดแน่นอน' } },
    { key: 'term_start', label: 'วันเริ่มต้นสัญญา (Commencement Date)', type: 'date', show: termDates },
    { key: 'term_end', label: 'วันสิ้นสุดสัญญา (Expiry Date)', type: 'date', show: termDates },
    { key: 'term_period', label: 'ระบุช่วงระยะเวลาสัญญา เช่น xx เดือน / ปี (Specify the contract period)', type: 'text', show: (v) => v.term_type === 'unknown' },
    { key: 'renewal', label: 'เงื่อนไขการต่ออายุสัญญา (Renewal Term)', type: 'text', placeholder: 'โปรดระบุเงื่อนไขการต่ออายุสัญญา Please specify the renewal term.' },
    { type: 'heading', label: 'ค่าจ้าง/ค่าบริการ (Service Fee)' },
    { key: 'fee', label: 'มูลค่ารวมของค่าบริการ (Service Fee)', type: 'text', placeholder: 'กรุณากรอก มูลค่ารวมของค่าบริการ' },
    { key: 'fee_vat', label: 'มูลค่ารวมข้างต้นนั้น (The Total Service Fee above)', type: 'radio',
      options: ['รวม VAT (includes VAT)', 'ไม่รวม VAT (excludes VAT)', 'ไม่มี VAT (is not subject to VAT)'] },
    { key: 'payment_term', label: 'รูปแบบการชำระเงิน (Payment Term)', type: 'select',
      options: ['ชำระครั้งเดียว (Lump sum)', 'รายเดือน (Monthly)', 'รายงวด', OTHERS] },
    { key: 'payment_detail', label: 'โปรดระบุ (please provide details)', type: 'text', placeholder: 'ระบุรายละเอียด' },
    { key: 'credit_term', label: 'เครดิตการชำระเงิน หรือระยะเวลาถึงกำหนดชำระเงิน (Credit Term)', type: 'text', placeholder: 'ระบุรายละเอียดเครดิตการชำระเงิน' },
    { key: 'performance_bond', label: 'หลักประกันการปฏิบัติงาน (Performance Bond)', type: 'text', placeholder: 'โปรดระบุรูปแบบหลักประกัน วงเงิน และเงื่อนไขการคืนหลักประกัน' },
    { type: 'heading', label: 'ค่าปรับ (Penalty)' },
    { key: 'penalty_delay', label: 'กรณีไม่ส่งมอบงานตามวันเวลาในสัญญา (in case of delay in service performance)', type: 'text', placeholder: 'กรุณากรอกรายละเอียด' },
    { key: 'penalty_undelivered', label: 'กรณีไม่ส่งมอบงานตามข้อตกลงที่กำหนดไว้ (if work is not delivered as agreed)', type: 'text', placeholder: 'กรุณากรอกรายละเอียด' },
    { key: 'penalty_absence', label: 'กรณีขาดงาน (in case of absence from work)', type: 'text', placeholder: 'โปรดระบุอัตราค่าปรับกรณีผู้รับจ้างขาดงาน' },
    { key: 'penalty_other', label: 'กรณีอื่นๆ (Others)', type: 'text', placeholder: 'โปรดระบุเหตุการคิดค่าปรับ และอัตราค่าปรับ' },
    { type: 'heading', label: 'การบอกเลิกสัญญา (Termination)' },
    { key: 'termination', label: 'การบอกเลิกสัญญา (Termination)', type: 'text', placeholder: 'กรุณากรอกรายละเอียด' },
    { type: 'heading', label: 'อื่นๆ (Others)' },
    { key: 'ip', label: 'ความเป็นเจ้าของกรรมสิทธิ์ในผลสำเร็จของงาน (IP Ownership in the Deliverables)', type: 'text', placeholder: 'กรุณาระบุผู้เป็นเจ้าของกรรมสิทธิ์ในผลสำเร็จของงาน' },
    { key: 'warranty', label: 'การรับประกันผลงาน (Warranty)', type: 'text', placeholder: 'โปรดระบุระยะเวลาการรับประกัน และข้อจำกัดของการรับประกัน' },
    { key: 'stamp', label: 'อากรแสตมป์ (Stamp Duty)', type: 'text', placeholder: 'กรุณาระบุผู้ชำระอากรแสตมป์' },
    { key: 'other_fees', label: 'ค่าธรรมเนียมอื่นๆ (Other Fees)', type: 'text', placeholder: 'โปรดระบุค่าธรรมเนียมอื่นๆ และผู้ชำระ' },
    { key: 'other_conditions', label: 'เงื่อนไขอื่น ๆ (หากมี) (Other Conditions)', type: 'text', placeholder: 'กรุณากรอกเงื่อนไขอื่นๆ' },
    ...common,
    prevLegal('ระบุอีเมลของนักกฎหมายที่เคยรับผิดชอบเอกสารนี้ (Legal team who has handled this work (if any))'),
    ...approval,
  ],
  'DBD Registration': [
    ...company('ชื่อบริษัท (Name of the Company)'),
    { type: 'heading', label: 'เรื่องที่จะขอจดทะเบียน (Registration Request)' },
    { key: 'regs', label: 'Registration Request', type: 'regs', required: true, options: REG_LIST,
      hint: 'กรุณากรอกข้อมูลด้านในเอกสารที่เลือกให้ครบถ้วน' },
    { key: 'reg_others', label: 'อื่นๆ (Others)', type: 'text', show: (v) => (v.regs || '').includes(OTHERS) },
    { key: 'confidentiality', label: 'ระดับชั้นความลับ (Confidentiality Level)', type: 'select', options: CONF, required: true },
    prevLegal(),
    ...approval,
  ],
  'Legal Documents': [
    { key: 'company_name', label: 'งานของบริษัท (Company’s Work)', type: 'select', options: '@companies', required: true, others: true, placeholder: 'กรอกชื่อว่าเป็นงานของบริษัทใด' },
    { key: 'purpose', label: 'วัตถุประสงค์ที่ต้องการเอกสารไปใช้ (Purpose) — เพื่อนำไปใช้', type: 'text', required: true, placeholder: 'Input' },
    { key: 'f_main', label: 'เอกสารแนบ (Attachment)', type: 'file' },
    { type: 'heading', label: 'เอกสารที่ต้องการขอ (Required Document)' },
    { key: 'required_docs', label: 'สามารถเลือกได้มากกว่า 1 ช่อง', type: 'checks', options: LEGAL_DOCS, required: true },
    { key: 'doc1_company', label: '1. บริษัท (BU)', type: 'select', options: '@companies', others: true, show: (v) => hasDoc(v, 1) },
    { key: 'doc1_age', label: '1. อายุของหนังสือรับรอง', type: 'text', placeholder: 'ระบุอายุของหนังสือรับรอง', show: (v) => hasDoc(v, 1) },
    { ...copies('doc1_copies'), label: '1. จำนวน (Copies)', show: (v) => hasDoc(v, 1) },
    { key: 'doc2_type', label: '2. ประเภท', type: 'radio', options: ['บัตรประชาชนอย่างเดียว (ID Card)', 'บัตรประชาชนและทะเบียนบ้าน (ID Card and House Registration)'], show: (v) => hasDoc(v, 2) },
    { key: 'doc2_name', label: '2. ชื่อ (Name)', type: 'text', placeholder: 'กรอกชื่อ', show: (v) => hasDoc(v, 2) },
    { ...copies('doc2_copies'), label: '2. จำนวน (Copies)', show: (v) => hasDoc(v, 2) },
    { key: 'doc3_name', label: '3. ชื่อ (Name)', type: 'text', placeholder: 'กรอกชื่อ', show: (v) => hasDoc(v, 3) },
    { ...copies('doc3_copies'), label: '3. จำนวน (Copies)', show: (v) => hasDoc(v, 3) },
    { key: 'doc4_company', label: '4. บริษัท (BU)', type: 'select', options: '@companies', others: true, show: (v) => hasDoc(v, 4) },
    { key: 'doc4_age', label: '4. อายุของบอจ.5', type: 'text', placeholder: 'ระบุอายุของบอจ.5', show: (v) => hasDoc(v, 4) },
    { ...copies('doc4_copies'), label: '4. จำนวน (Copies)', show: (v) => hasDoc(v, 4) },
    { key: 'doc5_head', label: '5. สำนักงานใหญ่ (Head Office) — จำนวน (Copies)', type: 'text', placeholder: 'จำนวนเอกสาร', show: (v) => hasDoc(v, 5) },
    { key: 'doc5_branch', label: '5. สาขา Branch(es) — ระบุสาขา', type: 'text', placeholder: 'สาขา', show: (v) => hasDoc(v, 5) },
    { key: 'doc5_branch_copies', label: '5. สาขา — จำนวน (Copies)', type: 'text', placeholder: 'จำนวนเอกสาร', show: (v) => hasDoc(v, 5) },
    { key: 'doc6_name', label: '6. ชื่อเอกสาร (Documents Name)', type: 'text', placeholder: 'ระบุชื่อเอกสาร', show: (v) => hasDoc(v, 6) },
    { key: 'doc6_age', label: '6. อายุของเอกสาร', type: 'text', placeholder: 'ระบุอายุของเอกสาร', show: (v) => hasDoc(v, 6) },
    { ...copies('doc6_copies'), label: '6. จำนวน (Copies)', show: (v) => hasDoc(v, 6) },
    { key: 'doc6_reason', label: '6. เหตุผลที่ต้องใช้ (Reason)', type: 'text', placeholder: 'ระบุเหตุผล', show: (v) => hasDoc(v, 6) },
    { type: 'heading', label: 'การรับรองสำเนาถูกต้อง (Certified True Copy)' },
    { key: 'certified', label: 'ต้องการรับรองสำเนาถูกต้องหรือไม่ (Certified True Copy)', type: 'radio',
      options: ['รับรองสำเนาถูกต้อง (Certified true copy)', 'ไม่รับรองสำเนาถูกต้อง (Not certified as a true copy)'] },
    ...approval,
  ],
};
export const REMARKS = { NDA: BTS_REMARK, 'Service Agreement': BTS_REMARK, 'Legal Documents': BTS_REMARK,
  'DBD Registration': 'ใช้ระยะเวลาในการดำเนินการประมาณ 15 วัน ขึ้นอยู่กับตารางกำหนดการของกรรมการที่ลงนาม (The processing time is approximately 15 days, subject to the signing director\'s schedule.)' };

// Older requests used a few different keys: keep their labels readable.
const LEGACY = { party: 'ชื่อคู่สัญญา (Counterparty)', service: 'รายละเอียดบริการ', value: 'มูลค่าสัญญา', currency: 'สกุลเงิน', counterparty_type: 'ประเภทคู่สัญญา',
  term_years: 'ระยะเวลา (ปี)', governing_law: 'กฎหมายที่ใช้บังคับ', effective_date: 'วันที่มีผลบังคับ', reg_type: 'ประเภทการจดทะเบียน', company: 'ชื่อบริษัท',
  reg_no: 'เลขทะเบียนนิติบุคคล', details: 'รายละเอียด', target_date: 'วันที่ต้องการให้เสร็จ', doc_type: 'ประเภทเอกสาร', language_: 'ภาษา', needed_by: 'ต้องการภายในวันที่' };
export const fieldLabel = (matter, key) =>
  (FORMS[matter] || []).find((f) => f.key === key)?.label || LEGACY[key] || key;
export const visibleFields = (matter, values) => (FORMS[matter] || []).filter((f) => !f.show || f.show(values || {}));
export const MATTER_FIELDS = FORMS; // back-compat
export const deriveTitle = (matter, v) => {
  const x = v.project_name || v.counterparty || v.company_name || v.purpose || '';
  return (matter + (x ? ' - ' + String(x).slice(0, 80) : '')).slice(0, 200);
};
export const missingRequired = (matter, v) =>
  visibleFields(matter, v).filter((f) => f.required && !String(v[f.key] ?? '').trim()).map((f) => f.key);
