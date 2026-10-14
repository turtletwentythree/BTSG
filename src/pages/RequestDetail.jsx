import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Stepper from '../components/Stepper.jsx';
import { api, fmtSize } from '../api';
import { STEPS, FORMS, OTHERS, fieldLabel } from '../data/requestTypes';

const WHO = {
  1: 'ผู้ทำคำขอ / Coordinator', 2: 'ผู้อนุมัติแบบคำขอ (User Approver)', 3: 'ฝ่ายกฎหมาย (Legal)', 4: 'ฝ่ายกฎหมาย (Legal)',
  5: 'Coordinator', 6: 'Coordinator (แนบ Signing Memo)', 7: 'ฝ่ายกฎหมาย / Coordinator', 8: 'Final Approver', 9: 'ฝ่ายกฎหมาย (Legal)',
};
const HINT = {
  return: 'ระบุความเห็น / เหตุผลที่ส่งกลับ (จำเป็น)', reject: 'ระบุเหตุผล (จำเป็น)', cancel: 'ระบุเหตุผลที่ยกเลิก (จำเป็น)',
  request_cancel: 'ระบุเหตุผลที่ขอยกเลิก (จำเป็น)', send: 'ความเห็นของฝ่ายกฎหมายถึง Coordinator (จำเป็น)',
};
const skipKeys = new Set(['user_approver', 'user_coordinator']);
const isOk = (name) => /\.(docx?|pdf|jpe?g|png)$/i.test(name);

export default function RequestDetail() {
  const params = useParams();
  const nav = useNavigate();
  let id = params.id;
  if (!id && params.code) { try { id = atob(params.code); } catch { id = ''; } }
  const [tab, setTab] = useState('summary');
  const [note, setNote] = useState('');
  const [cfg, setCfg] = useState(null);
  const [handler, setHandler] = useState('');
  const [finalizer, setFinalizer] = useState('');
  const [memoLang, setMemoLang] = useState('th');
  const [appr, setAppr] = useState(['', '', '']);   // legal's choice (step 7) or the coordinator's extras
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refs = { work: useRef(null), memo: useRef(null), final: useRef(null), signed: useRef(null) };
  useEffect(() => { api.config().then(setCfg).catch(() => {}); }, []);

  const reload = useCallback(() => api.get(id).then(setR).catch((e) => setError(e.message)), [id]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (r) { setFinalizer(r.finalizer || ''); setAppr(r.final_stage === 0 ? [...r.final_list, '', '', ''].slice(0, 3) : ['', '', '']); } }, [r?.step, r?.final_stage]); // eslint-disable-line

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); await reload(); } catch (e) { setError(e.message); }
    setBusy(false);
  };

  if (error && !r) return <div className="page"><div className="err big">{error}</div></div>;
  if (!r) return <div className="page">Loading...</div>;

  const of = (kind) => r.attachments.filter((a) => a.kind === kind);
  const plain = r.attachments.filter((a) => !a.kind);
  const acts = r.actions || [];
  const closed = r.state === 'rejected' || r.state === 'cancelled';
  const lastReason = [...r.history].reverse().find((h) => /reject|cancel/i.test(h.note || ''))?.note;
  const can = (k) => acts.some((a) => a.key === k);
  const mine = (r.my_roles || []);
  const isLegal = mine.includes('legal');
  const isCo = mine.includes('co');
  const legalDoc = r.matter === 'Legal Documents';
  // which upload buttons are useful at this step
  const showWork = !closed && r.step < 10 && (acts.length > 0 || mine.length > 0);
  const upMemo = !closed && ((r.step === 6 && isCo) || (r.step === 1 && legalDoc && isCo) || isLegal) && r.step < 10;
  const upFinal = !closed && ((r.step === 6 && isCo && finalizer === 'counterparty') || (r.step === 7 && ((r.final_stage === 0 && isLegal) || (r.final_stage === 1 && isCo))) || (isLegal && r.step >= 4 && r.step <= 8));
  const upSigned = !closed && isLegal && r.step === 9;
  const fileList = (list, removable) => (list.length === 0 ? <p className="muted">-</p> : (
    <ul className="file-list">{list.map((a) => (
      <li key={a.id}><i className="mdi mdi-paperclip" /><a className="fn" href={api.downloadUrl(a.id)}>{a.filename}</a><span className="fs">{fmtSize(a.size)}</span>
        <span className="fs">{a.uploaded_by}</span>
        {removable && <button className="x" title="Remove" disabled={busy} onClick={() => window.confirm('Remove this file?') && run(() => api.removeAttachment(a.id))}><i className="mdi mdi-delete-outline" /></button>}</li>
    ))}</ul>
  ));
  const picker = (kind, label) => (
    <>
      <input ref={refs[kind]} type="file" multiple hidden accept=".doc,.docx,.pdf,.jpg,.jpeg,.png"
        onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; if (!f.length) return;
          if (f.some((x) => !isOk(x.name))) { setError('รองรับเฉพาะไฟล์ Word, PDF, JPG, PNG (ไม่รองรับ PowerPoint / Excel)'); return; }
          run(() => api.upload(id, f, kind)); }} />
      <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => refs[kind].current.click()}><i className="mdi mdi-paperclip" /> {label}</button>
    </>
  );
  const byDay = [...r.history].reverse().reduce((m, h) => {
    const d = new Date(h.at);
    const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    (m[day] = m[day] || []).push({ ...h, time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) });
    return m;
  }, {});
  const Row = ({ l, v }) => <div className="rf-row"><span className="rf-l">{l}</span><b className="rf-v">{v || '-'}</b></div>;

  const press = (a) => {
    if (a.key === 'save') { nav(`/requests/${r.id}/edit`); return; }
    if (a.note === 'required' && !note.trim()) { setError('กรุณาเขียนความเห็น / เหตุผลในช่อง Work Area ก่อน'); return; }
    if (!window.confirm(`ยืนยัน: ${a.label} ?`)) return;
    const body = { note: note.trim() };
    if (r.step === 3) body.handler_email = handler;
    if (r.step === 6) { body.finalizer = finalizer; body.memo_lang = memoLang; }
    if (r.step === 7 && r.final_stage === 0) body.final_approvers = appr.filter(Boolean).join(',');
    if (r.step === 7 && r.final_stage === 1) body.extra_approvers = appr.filter(Boolean).join(',');
    run(async () => { await api.action(id, a.key, body); setNote(''); setHandler(''); });
  };
  const legalPicked = r.final_list || [];
  const dupWarn = r.step === 7 && r.final_stage === 1 && appr.some((e) => e && legalPicked.includes(e.trim().toLowerCase()));
  const noUA = r.step === 7 && r.final_stage === 1 && r.fields.user_approver
    && ![...legalPicked, ...appr.map((x) => x.trim().toLowerCase())].includes(String(r.fields.user_approver).trim().toLowerCase());

  return (
    <div className="page detail">
      <div className="crumb"><Link to="/">← All Request</Link></div>
      <h2 className="rd-title">Request Detail &gt; {r.no || 'Draft'}</h2>
      <Stepper current={r.step} />
      {error && <div className="err big">{error}</div>}

      <div className={'rd-status' + (closed ? ' bad' : '')}>
        <b>{r.status_label}</b>
        {!closed && r.step < 10 && acts.length === 0 && <span className="muted"> · รอ: {WHO[r.step]}{r.step === 8 && r.current_final ? ` (${r.current_final})` : ''}</span>}
        {closed && lastReason && <span className="muted"> · {lastReason}</span>}
        {r.state === 'rejected' && <span className="muted"> · คำขอนี้แก้ไขไม่ได้ ต้องสร้างคำขอใหม่</span>}
      </div>

      {showWork && (
        <section className="rd-card work">
          <h3 className="rd-h">Work Area</h3>
          {r.state === 'returned' && r.step === 1 && <div className="rd-hint">ถูกตีกลับโดย User Approver — ดูความเห็นที่แท็บ History แล้วแก้ไขก่อน Submit อีกครั้ง</div>}
          {r.step === 3 && can('accept') && cfg?.approver && (
            <label className="rd-assign">ผู้รับเรื่อง (Assign to)
              <select value={handler} onChange={(e) => setHandler(e.target.value)}>
                <option value="">ตัวฉันเอง (me)</option>
                {cfg.legalTeam.map((t) => <option key={t.email} value={t.email}>{t.name}</option>)}
              </select>
            </label>
          )}

          {r.step === 6 && can('submit') && (
            <div className="wk-block">
              <p className="rf-l">ใครเป็นผู้จัดทำร่างเอกสารสุดท้าย (Who prepares the final draft)<span className="req">*</span></p>
              <div className="radios">
                <label className="chk"><input type="radio" checked={finalizer === 'counterparty'} onChange={() => setFinalizer('counterparty')} /> คู่สัญญาอีกฝ่ายเป็นผู้จัดทำ (Counterparty finalizes the document)</label>
                <label className="chk"><input type="radio" checked={finalizer === 'legal'} onChange={() => setFinalizer('legal')} /> ทีมกฎหมายเป็นผู้จัดทำ (Legal team finalizes the document)</label>
              </div>
              {finalizer === 'counterparty' && <div className="wk-row">{picker('final', 'Attachment File (ร่างสุดท้ายจากคู่สัญญา)')}{fileList(of('final'), true)}</div>}
              <p className="rf-l rd-gap">Signing Memo<span className="req">*</span> — ดาวน์โหลดแบบฟอร์ม กรอกข้อกำหนดและเงื่อนไขสำคัญ สแกนแล้วแนบ (Word, PDF, JPG, PNG)</p>
              <div className="wk-row">
                <a className="btn btn-outline btn-sm" href="/templates/signing-memo-th.doc" download>Memo (ไทย)</a>
                <a className="btn btn-outline btn-sm" href="/templates/signing-memo-en.doc" download>Memo (English)</a>
                <select value={memoLang} onChange={(e) => setMemoLang(e.target.value)} className="wk-sel"><option value="th">ภาษาที่ใช้: ไทย</option><option value="en">ภาษาที่ใช้: English</option></select>
              </div>
              <div className="wk-row">{picker('memo', 'Attachment File (Signing Memo)')}</div>
              {fileList(of('memo'), true)}
            </div>
          )}

          {r.step === 7 && (
            <div className="wk-block">
              {r.final_stage === 0 && isLegal && (
                <>
                  <p className="rf-l">ร่างสุดท้าย (Final Draft)<span className="req">*</span></p>
                  <div className="wk-row">{picker('final', 'Attachment File')}</div>
                  {fileList(of('final'), true)}
                  <p className="rf-l rd-gap">ผู้อนุมัติร่างสุดท้าย (Final Approver) — เลือกได้สูงสุด 3 ท่าน เรียงตามลำดับการอนุมัติ</p>
                  {appr.map((v, i) => <input key={i} className="form-control gap" placeholder={`${i + 1}. อีเมล Final Approver`} value={v} onChange={(e) => setAppr(appr.map((x, j) => (j === i ? e.target.value : x)))} />)}
                  <div className="muted small">รวมกับที่ Coordinator เพิ่มได้ ต้องมี User Approver ({r.fields.user_approver || '-'}) อยู่ด้วย</div>
                </>
              )}
              {r.final_stage === 1 && (
                <>
                  <p className="rf-l">ผู้อนุมัติร่างสุดท้ายที่ฝ่ายกฎหมายเลือกไว้ (Legal team selected)</p>
                  <ol className="final-list">{legalPicked.map((e) => <li key={e}>{e}</li>)}{legalPicked.length === 0 && <li className="muted">-</li>}</ol>
                  {can('submit') && (
                    <>
                      <p className="rf-l rd-gap">เพิ่ม Final Approver ได้อีกสูงสุด 3 ท่าน (ตามลำดับการอนุมัติ) — เว้นว่างได้</p>
                      {appr.map((v, i) => <input key={i} className="form-control gap" placeholder={`${i + 1}. อีเมล (ถ้ามี)`} value={v} onChange={(e) => setAppr(appr.map((x, j) => (j === i ? e.target.value : x)))} />)}
                      {dupWarn && <div className="err">มีอีเมลซ้ำกับที่ฝ่ายกฎหมายเลือกไว้แล้ว</div>}
                      {noUA && <div className="err">ต้องมี User Approver ({r.fields.user_approver}) อยู่ในรายชื่อ Final Approver</div>}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {r.step === 9 && isLegal && (
            <div className="wk-block"><p className="rf-l">ไฟล์ที่ลงนามเรียบร้อยแล้ว (Signed file)<span className="req">*</span></p><div className="wk-row">{picker('signed', 'Attachment File')}</div>{fileList(of('signed'), true)}</div>
          )}
          {r.step === 1 && legalDoc && /^รับรอง/.test(r.fields.certified || '') && isCo && (
            <div className="wk-block"><p className="rf-l">Signing Memo (กรณีรับรองสำเนาถูกต้อง)<span className="req">*</span></p>
              <div className="wk-row"><a className="btn btn-outline btn-sm" href="/templates/signing-memo-th.doc" download>Memo (ไทย)</a>
                <a className="btn btn-outline btn-sm" href="/templates/signing-memo-en.doc" download>Memo (English)</a>{picker('memo', 'Attachment File')}</div>{fileList(of('memo'), true)}</div>
          )}

          {acts.some((a) => a.note) || r.step === 6 || r.step === 7 || r.step === 8 || r.step === 3 ? (
            <>
              <textarea className="form-control" rows="3" placeholder={acts.filter((a) => a.note === 'required').map((a) => HINT[a.key]).filter(Boolean)[0] || 'Work Area — ความเห็น / หมายเหตุ'}
                value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="wk-row">{picker('work', 'Attachment File')}<span className="muted small">แนบไฟล์ประกอบความเห็น (ถ้ามี)</span></div>
              {of('work').length > 0 && fileList(of('work'), false)}
            </>
          ) : null}

          {r.step === 8 && (
            <div className="wk-block">
              <p className="rf-l">ผู้อนุมัติร่างสุดท้าย (อนุมัติทีละท่านตามลำดับ)</p>
              <ol className="final-list">{r.final_list.map((e) => (
                <li key={e} className={r.final_done.includes(e) ? 'done' : e === r.current_final ? 'cur' : ''}>{e}{r.final_done.includes(e) && ' ✓'}</li>
              ))}</ol>
              <div className="muted small">ท่านที่อนุมัติไปแล้ว ระบบจะไม่กลับมาถามซ้ำแม้มีผู้อื่นไม่อนุมัติ · User Approver ต้องตรวจสอบข้อมูลใน Signing Memo</div>
            </div>
          )}

          <div className="rd-arow wk-actions">
            {acts.length === 0 && <span className="muted small">ไม่มีรายการที่ต้องดำเนินการสำหรับคุณในขั้นตอนนี้ (ดูได้อย่างเดียว)</span>}
            <span className="rd-spacer" />
            {acts.map((a, i) => (
              <button key={a.key} className={'btn ' + (i === acts.length - 1 && !a.danger ? 'btn-primary' : a.danger ? 'btn-outline danger' : 'btn-outline')}
                disabled={busy || (a.key === 'submit' && r.step === 7 && r.final_stage === 1 && (dupWarn || noUA))} onClick={() => press(a)}>{a.label}</button>
            ))}
          </div>
        </section>
      )}

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
          <Row l="เลขที่คำขอ (Request No.)" v={r.no || 'Draft'} />
          <Row l="สถานะ (Status)" v={r.status_label} />
          <p className="rf-l">ร่างเอกสารสุดท้ายและเอกสารแนบ (Finalized Document and Attachment)</p>
          {fileList(of('final'), upFinal)}
          {upFinal && r.step >= 7 && <div className="wk-row">{picker('final', 'Upload final draft')}</div>}
          <p className="rf-l rd-gap">Memo สำหรับเสนอลงนาม (Signing Memo)</p>
          {fileList(of('memo'), upMemo)}
          {upMemo && r.step !== 6 && r.step !== 1 && <div className="wk-row">{picker('memo', 'Upload memo')}</div>}
          <p className="rf-l rd-gap">ไฟล์ที่ลงนามแล้ว (Signed Document)</p>
          {fileList(of('signed'), upSigned)}
          <h3 className="rd-h rd-gap">ผู้อนุมัติร่างสุดท้าย (Final approver(s))</h3>
          <p className="rf-l">อนุมัติตามลำดับ ดังนี้ (following approval sequence)</p>
          <ol className="final-list">
            {r.final_list.map((e) => <li key={e} className={r.final_done.includes(e) ? 'done' : e === r.current_final && r.step === 8 ? 'cur' : ''}>{e}{r.final_done.includes(e) && ' ✓'}</li>)}
            {r.final_list.length === 0 && <li className="muted">ยังไม่ได้กำหนด</li>}
          </ol>
          <p className="rf-l rd-gap">ผู้รับเรื่อง (Legal handler)</p>
          <b>{r.handler_name || <span className="muted">ยังไม่มีผู้รับเรื่อง</span>}</b>
          {r.finalizer && <><p className="rf-l rd-gap">ผู้จัดทำร่างสุดท้าย (Final draft prepared by)</p><b>{r.finalizer === 'counterparty' ? 'คู่สัญญาอีกฝ่าย (Counterparty)' : 'ทีมกฎหมาย (Legal team)'}</b></>}
          {r.legal_note !== undefined && <><p className="rf-l rd-gap">บันทึกภายใน (เห็นเฉพาะฝ่ายกฎหมาย)</p><b>{r.legal_note || '-'}</b></>}
        </section>
      )}

      {tab === 'form' && (
        <section className="rd-card">
          <button className="btn btn-primary rd-export" onClick={() => window.print()}><i className="mdi mdi-export-variant" /> Export</button>
          <h3 className="rd-h">ข้อมูลของผู้ทำคำขอ (User Information)</h3>
          <div className="rf-grid">
            <Row l="คำขอเลขที่ (Request No.)" v={r.no || 'Draft'} />
            <Row l="วันที่สร้างคำขอ (Date of Request)" v={new Date(r.created_at).toLocaleDateString('en-GB')} />
            <Row l="ผู้ทำคำขอ (User’s Request)" v={r.requester} />
            <Row l="อีเมลผู้ทำคำขอ (User’s email)" v={r.requester_email} />
            <Row l="บริษัทที่สังกัด (User's BU)" v={r.company} />
            <Row l="แผนกที่สังกัด (User's Department)" v={r.department} />
          </div>
          <h3 className="rd-h">ข้อมูลของผู้ประสานงานกลาง (User Coordinator Information)</h3>
          <div className="rf-grid">
            <Row l="ผู้อนุมัติแบบคำขอ (User Approver)" v={r.fields.user_approver} />
            <Row l="ผู้ประสานงาน (Name of User Coordinator)" v={r.fields.user_coordinator} />
          </div>
          <h3 className="rd-h">ข้อมูลทั่วไป (Request General Information)</h3>
          <div className="rf-grid">
            <Row l="ประเภทคำขอ (Type of Request)" v={r.type} />
            <Row l="เรื่อง (Matters)" v={r.matter} />
          </div>
          {formBlocks(r)}
          <h3 className="rd-h">เอกสารแนบ (Attachment)</h3>
          {plain.length === 0 ? <p className="muted">No attachments</p> : (
            <ul className="file-list">{plain.map((a) => <li key={a.id}><i className="mdi mdi-paperclip" /><a className="fn" href={api.downloadUrl(a.id)}>{a.filename}</a><span className="fs">{fmtSize(a.size)}</span></li>)}</ul>
          )}
          <h3 className="rd-h">ฝ่ายกฎหมาย (Legal)</h3>
          <div className="rf-grid"><Row l="ผู้รับเรื่อง" v={r.handler_name} /><Row l="อนุมัติโดย (To be approved by)" v={r.fields.user_approver} /></div>
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

// General-information rows grouped under the form's own headings; only fields that were answered.
function formBlocks(r) {
  const defs = FORMS[r.matter] || [];
  const known = new Set(defs.map((d) => d.key));
  const blocks = []; let cur = { title: null, rows: [] };
  const flush = () => { if (cur.rows.length) blocks.push(cur); };
  for (const d of defs) {
    if (d.type === 'heading') { flush(); cur = { title: d.label, rows: [] }; continue; }
    if (d.type === 'file' || skipKeys.has(d.key)) continue;
    let v = r.fields[d.key];
    if (v == null || v === '') continue;
    if (v === OTHERS && r.fields[d.key + '_other']) v = r.fields[d.key + '_other'];
    cur.rows.push([d.key, d.label, String(v).split(';').join('\n')]);
  }
  flush();
  const legacy = Object.keys(r.fields).filter((k) => !known.has(k) && !k.endsWith('_other') && !skipKeys.has(k) && r.fields[k] !== '');
  if (legacy.length) blocks.push({ title: null, rows: legacy.map((k) => [k, fieldLabel(r.matter, k), String(r.fields[k])]) });
  return blocks.map((b, i) => (
    <div key={i}>
      {b.title && <h4 className="rd-sub">{b.title}</h4>}
      <div className="rf-grid">
        {b.rows.map(([k, l, v]) => <div className="rf-row" key={k}><span className="rf-l">{l}</span><b className="rf-v pre">{v}</b></div>)}
      </div>
    </div>
  ));
}
