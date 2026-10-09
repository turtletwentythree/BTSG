import express from 'express';
import multer from 'multer';
import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mountAuth, attachUser, requireAuth, sameOriginWrites, isApprover, approverList } from './auth.js';
import { initStorage, putFile, getFile, deleteFile, storageMode } from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3001;

// Tolerate common paste mistakes: quotes/whitespace/line breaks, and the REGION placeholder.
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/["'\s]/g, '').replace(
    /aws-0-REGION\./i,
    `aws-0-${process.env.SUPABASE_REGION || 'ap-southeast-1'}.`,
  );
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

// Companies / departments offered in the forms. Override with COMPANIES / DEPARTMENTS (comma or ; separated).
const listEnv = (v, d) => { const l = (v || '').split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean); return l.length ? l : d; };
const COMPANIES = listEnv(process.env.COMPANIES, ['Turtle23']);
const DEPARTMENTS = listEnv(process.env.DEPARTMENTS, []);

const STEPS = [
  'Fill out request form', 'Submitting request', 'Waiting for acceptance', 'Reviewing',
  'Waiting for user comment', 'User approved', 'Finalizing', 'Waiting for final approval',
  'Signing', 'Complete',
];

/* ---------- database (PostgreSQL / Supabase) ---------- */
const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' || local ? false : { rejectUnauthorized: false },
  max: process.env.VERCEL ? 2 : 10,
});
const q = (text, params) => pool.query(text, params);

const addHistory = (c, rid, step, note, actor) =>
  c.query('INSERT INTO history (request_id, step, note, actor) VALUES ($1,$2,$3,$4)', [rid, step, note, actor]);

async function createRequest({ type, matter, title, requester, requester_email = null, company = COMPANIES[0], department = null, fields = {}, step = 3 }, client = pool) {
  const { rows } = await client.query(
    'INSERT INTO requests (type,matter,title,requester,requester_email,company,department,step,fields) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
    [type, matter, title, requester, requester_email, company, department, step, JSON.stringify(fields)]
  );
  const id = rows[0].id;
  await addHistory(client, id, 1, step === 1 ? 'Create request form (draft)' : 'Create request form', requester);
  if (step >= 2) await addHistory(client, id, 2, 'Submit request form', requester);
  if (step >= 3) await addHistory(client, id, 3, 'Waiting for acceptance', 'System');
  return id;
}

async function initDb() {
  await q(fs.readFileSync(path.join(ROOT, 'db', 'schema.sql'), 'utf8'));
  const { rows } = await q('SELECT COUNT(*)::int AS c FROM requests');
  if (rows[0].c === 0 && process.env.SEED !== 'false') {
    const u = 'Thotsaporn Phupha';
    await createRequest({ type: 'Contract / Agreement', matter: 'NDA', title: 'NDA with Acme Co., Ltd.', requester: u, step: 4,
      fields: { counterparty: 'Acme Co., Ltd.', nda_type: 'Mutual', purpose: 'Discuss a potential partnership' } });
    await createRequest({ type: 'Contract / Agreement', matter: 'Service Agreement', title: 'IT support service agreement', requester: u, step: 3,
      fields: { party: 'TechCare Ltd.', service: 'Monthly IT support', value: '120000', currency: 'THB' } });
    await createRequest({ type: 'Corporate Works', matter: 'DBD Registration', title: 'Change of registered address', requester: u, step: 9,
      fields: { reg_type: 'Change of address', company: 'Example Co., Ltd.' } });
    await createRequest({ type: 'Legal Documents', matter: 'Legal Documents', title: 'Power of attorney', requester: u, step: 10,
      fields: { doc_type: 'Power of attorney', purpose: 'Authorize a representative' } });
  }
}

/* ---------- helpers ---------- */
const withStep = (r) => r && { ...r, step_name: STEPS[r.step - 1] };
const actorOf = (req) => req.user?.name || 'Unknown';
// legal_note is internal: only the legal team (approvers) may see it
const out = (r, req) => { const o = withStep(r); if (!isApprover(req.user)) delete o.legal_note; return o; };
const clip = (v, n) => (v == null ? null : String(v).trim().slice(0, n) || null);

// Approval rights: approvers can move any step. The requester may only act on the step that
// is waiting for them (5 = "Waiting for user comment").
const REQUESTER_STEPS = new Set([1, 5]);
const emailIs = (a, b) => !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
// step 2 is the "User Approver" named in the form; steps 1 and 5 belong to the requester; the rest to the legal team
const isUserApprover = (r, user) => emailIs(r.fields?.user_approver, user?.email);
const isOwner = (r, user) =>
  !!user && (r.requester_email ? r.requester_email.toLowerCase() === String(user.email || '').toLowerCase() : r.requester === user.name);
const canEdit = (r, user) => isApprover(user) || (isOwner(r, user) && r.step < STEPS.length);
const canAdvance = (r, user) => r.step < STEPS.length && (
  r.step === 2 ? (isUserApprover(r, user) || isApprover(user))
    : r.step === 1 ? (isOwner(r, user) || isApprover(user))
    : (isApprover(user) || (REQUESTER_STEPS.has(r.step) && isOwner(r, user))));
const REJECT_TO = { 2: 1, 3: 1, 5: 4 };
const canReject = (r, user) => !!REJECT_TO[r.step] && canAdvance(r, user);
const fixName = (n) => Buffer.from(n, 'latin1').toString('utf8'); // multer gives latin1 names
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const ATT_COLS = 'id,filename,size::int AS size,mime,uploaded_by,created_at';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 10 } });

async function saveFiles(client, rid, files = [], actor) {
  const stored = [];
  try {
    for (const f of files) {
      const key = crypto.randomUUID();
      await putFile(key, f.buffer, f.mimetype);
      stored.push(key);
      await client.query(
        'INSERT INTO attachments (request_id,filename,stored,size,mime,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6)',
        [rid, fixName(f.originalname), key, f.size, f.mimetype, actor]
      );
    }
  } catch (e) {
    await Promise.all(stored.map((k) => deleteFile(k).catch(() => {})));
    throw e;
  }
}

const findRequest = async (idOrNo) => {
  const isNum = /^\d+$/.test(idOrNo);
  const { rows } = await q(`SELECT * FROM requests WHERE ${isNum ? 'id = $1::bigint' : 'no = $1'}`, [idOrNo]);
  return rows[0];
};

/* ---------- api ---------- */
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(attachUser);
app.use(sameOriginWrites);
mountAuth(app, {
  onLogin: (u) => q(
    `INSERT INTO users (email,name,provider,last_login_at) VALUES ($1,$2,$3,now())
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, provider = EXCLUDED.provider, last_login_at = now()`,
    [u.email, u.name, u.provider]
  ),
});

app.get('/api/health', wrap(async (_q, res) => { await q('SELECT 1'); res.json({ ok: true, storage: storageMode }); }));

app.use('/api', requireAuth);

app.get('/api/requests', wrap(async (req, res) => {
  const term = String(req.query.q || '').trim();
  const { rows } = term
    ? await q(`SELECT * FROM requests WHERE (no || ' ' || title || ' ' || type || ' ' || matter) ILIKE $1 ORDER BY id DESC`, [`%${term}%`])
    : await q('SELECT * FROM requests ORDER BY id DESC');
  res.json(rows.map((r) => out(r, req)));
}));

app.post('/api/requests', upload.array('files', 10), wrap(async (req, res) => {
  const actor = actorOf(req);
  const { type, matter, title } = req.body;
  const company = COMPANIES.includes(req.body.company) ? req.body.company : COMPANIES[0];
  const department = clip(req.body.department, 100);
  if (!type || !matter || !String(title || '').trim()) return res.status(400).json({ error: 'type, matter and title are required' });
  let fields = {};
  try { fields = JSON.parse(req.body.fields || '{}'); } catch {}
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = await createRequest({ type, matter, title: title.trim(), requester: actor, requester_email: req.user?.email || null, company, department, fields, step: req.body.draft ? 1 : 2 }, client);
    await saveFiles(client, id, req.files, actor);
    await client.query('COMMIT');
    const { rows } = await q('SELECT * FROM requests WHERE id=$1', [id]);
    res.status(201).json(out(rows[0], req));
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { client.release(); }
}));

app.get('/api/requests/:id', wrap(async (req, res) => {
  const r = await findRequest(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const att = await q(`SELECT ${ATT_COLS} FROM attachments WHERE request_id=$1 ORDER BY id`, [r.id]);
  const hist = await q('SELECT step,note,actor,at FROM history WHERE request_id=$1 ORDER BY id', [r.id]);
  res.json({ ...out(r, req), can_advance: canAdvance(r, req.user), can_reject: canReject(r, req.user), can_edit: canEdit(r, req.user), attachments: att.rows, history: hist.rows.map((h) => ({ ...h, step_name: STEPS[h.step - 1] })) });
}));

app.patch('/api/requests/:id', wrap(async (req, res) => {
  const r = await findRequest(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (!canEdit(r, req.user)) return res.status(403).json({ error: 'You do not have permission to edit this request' });
  const title = String(req.body?.title ?? r.title).trim().slice(0, 300);
  if (!title) return res.status(400).json({ error: 'title is required' });
  const incoming = req.body?.fields;
  if (incoming && (typeof incoming !== 'object' || Array.isArray(incoming))) return res.status(400).json({ error: 'fields must be an object' });
  const fields = {};
  for (const [k, v] of Object.entries(incoming ?? r.fields ?? {})) {
    if (v == null || typeof v === 'object') continue;
    fields[String(k).slice(0, 60)] = String(v).slice(0, 5000);
  }
  const changed = [];
  if (title !== r.title) changed.push('title');
  const company = req.body?.company !== undefined && COMPANIES.includes(req.body.company) ? req.body.company : r.company;
  const department = req.body?.department !== undefined ? clip(req.body.department, 100) : r.department;
  if (company !== r.company) changed.push('company');
  if ((department || '') !== (r.department || '')) changed.push('department');
  // legal-team-only data
  let handler_name = r.handler_name, handler_email = r.handler_email, legal_note = r.legal_note;
  if (isApprover(req.user)) {
    if (req.body?.handler_email !== undefined) {
      const he = clip(req.body.handler_email, 200);
      const hn = clip(req.body.handler_name, 200);
      handler_email = he ? he.toLowerCase() : null;
      handler_name = he ? (hn || he) : null;
    }
    if (req.body?.legal_note !== undefined) legal_note = clip(req.body.legal_note, 5000);
    if ((handler_email || '') !== (r.handler_email || '')) changed.push('handler');
    if ((legal_note || '') !== (r.legal_note || '')) changed.push('legal_note');
  }
  for (const k of new Set([...Object.keys(fields), ...Object.keys(r.fields || {})])) {
    if (String(fields[k] ?? '') !== String((r.fields || {})[k] ?? '')) changed.push(k);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE requests SET title=$1, fields=$2, company=$3, department=$4, handler_name=$5, handler_email=$6, legal_note=$7, updated_at=now() WHERE id=$8',
      [title, JSON.stringify(fields), company, department, handler_name, handler_email, legal_note, r.id]);
    if (changed.length) await addHistory(client, r.id, r.step, `Request details edited (${changed.join(', ')})`, actorOf(req));
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
  const { rows } = await q('SELECT * FROM requests WHERE id=$1', [r.id]);
  res.json(out(rows[0], req));
}));

app.post('/api/requests/:id/advance', wrap(async (req, res) => {
  const r = await findRequest(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (r.step >= STEPS.length) return res.status(400).json({ error: 'Already complete' });
  if (!canAdvance(r, req.user)) return res.status(403).json({ error: 'You do not have permission to approve this step' });
  const step = r.step + 1;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE requests SET step=$1, updated_at=now() WHERE id=$2', [step, r.id]);
    // the legal person who accepts the request becomes its handler (ผู้รับเรื่อง)
    if (r.step === 3 && !r.handler_email && isApprover(req.user)) {
      await client.query('UPDATE requests SET handler_name=$1, handler_email=$2 WHERE id=$3', [actorOf(req), req.user.email || null, r.id]);
    }
    const label = { 1: 'Submit request form', 2: 'Approve request form', 3: 'Accept request', 5: 'User approved' }[r.step] || STEPS[step - 1];
    await addHistory(client, r.id, step, clip(req.body?.note, 500) || label, req.user?.email || actorOf(req));
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
  const { rows } = await q('SELECT * FROM requests WHERE id=$1', [r.id]);
  res.json(out(rows[0], req));
}));

app.post('/api/requests/:id/reject', wrap(async (req, res) => {
  const r = await findRequest(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (!canReject(r, req.user)) return res.status(403).json({ error: 'You cannot reject this step' });
  const reason = clip(req.body?.note, 1000);
  if (!reason) return res.status(400).json({ error: 'Please give a reason' });
  const step = REJECT_TO[r.step];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE requests SET step=$1, updated_at=now() WHERE id=$2', [step, r.id]);
    await addHistory(client, r.id, step, `Reject request: ${reason}`, req.user?.email || actorOf(req));
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
  const { rows } = await q('SELECT * FROM requests WHERE id=$1', [r.id]);
  res.json(out(rows[0], req));
}));

app.post('/api/requests/:id/attachments', upload.array('files', 10), wrap(async (req, res) => {
  const r = await findRequest(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  await saveFiles(pool, r.id, req.files, actorOf(req));
  await q('UPDATE requests SET updated_at=now() WHERE id=$1', [r.id]);
  const { rows } = await q(`SELECT ${ATT_COLS} FROM attachments WHERE request_id=$1 ORDER BY id`, [r.id]);
  res.status(201).json(rows);
}));

app.get('/api/attachments/:id', wrap(async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const { rows } = await q('SELECT * FROM attachments WHERE id=$1::bigint', [req.params.id]);
  const a = rows[0];
  if (!a) return res.status(404).json({ error: 'Not found' });
  const buf = await getFile(a.stored);
  res.set('Content-Type', a.mime || 'application/octet-stream');
  res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(a.filename)}`);
  res.send(buf);
}));

app.delete('/api/attachments/:id', wrap(async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const { rows } = await q('DELETE FROM attachments WHERE id=$1::bigint RETURNING stored', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  await deleteFile(rows[0].stored).catch(() => {});
  res.json({ ok: true });
}));

app.get('/api/config', wrap(async (req, res) => {
  const { rows: depts } = await q(`SELECT DISTINCT department FROM requests WHERE department IS NOT NULL ORDER BY 1`);
  const departments = [...new Set([...DEPARTMENTS, ...depts.map((d) => d.department)])];
  // legal team = approvers; names come from people who have signed in at least once
  const emails = approverList();
  const { rows: us } = emails.length ? await q('SELECT email, name FROM users WHERE lower(email) = ANY($1)', [emails]) : { rows: [] };
  const nameOf = Object.fromEntries(us.map((u) => [u.email.toLowerCase(), u.name]));
  const legalTeam = emails.map((e) => ({ email: e, name: nameOf[e] || e }));
  res.json({ companies: COMPANIES, departments, departmentsFixed: DEPARTMENTS.length > 0, legalTeam, approver: isApprover(req.user) });
}));

app.get('/api/stats', wrap(async (req, res) => {
  const { rows: all } = await q('SELECT * FROM requests');
  const f = req.query;
  const rows = all.filter((r) =>
    (!f.company || r.company === f.company) && (!f.department || (r.department || '') === f.department) &&
    (!f.requester || r.requester === f.requester) && (!f.handler || (r.handler_name || '') === f.handler));
  const uniq = (key) => [...new Set(all.map((r) => r[key]).filter(Boolean))].sort();
  const now = Date.now();
  const days = (a, b) => (new Date(b) - new Date(a)) / 86400000;
  const count = (key) => {
    const m = {};
    rows.forEach((r) => { m[r[key]] = (m[r[key]] || 0) + 1; });
    return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };
  const done = rows.filter((r) => r.step === STEPS.length);
  const byStep = STEPS.map((name, i) => ({ step: i + 1, name, count: rows.filter((r) => r.step === i + 1).length }));
  const months = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0');
    months.push({ month: key, count: rows.filter((r) => new Date(r.created_at).toISOString().startsWith(key)).length });
  }
  const stalled = rows
    .filter((r) => r.step < STEPS.length && days(r.updated_at, now) >= 7)
    .map((r) => ({ id: r.id, no: r.no, title: r.title, step_name: STEPS[r.step - 1], days: Math.floor(days(r.updated_at, now)) }))
    .sort((a, b) => b.days - a.days);
  res.json({
    total: rows.length,
    completed: done.length,
    inProgress: rows.length - done.length,
    avgDaysToComplete: done.length ? +(done.reduce((t, r) => t + days(r.created_at, r.updated_at), 0) / done.length).toFixed(1) : null,
    byType: count('type'), byMatter: count('matter'), byStep, byMonth: months, stalled,
    byCompany: count('company'),
    byDepartment: count('department').map((d) => ({ ...d, name: d.name === 'null' || d.name === 'undefined' ? '(ไม่ระบุ)' : d.name })),
    byRequester: count('requester').slice(0, 15),
    byHandler: count('handler_name').map((d) => ({ ...d, name: d.name === 'null' || d.name === 'undefined' ? '(ยังไม่มีผู้รับเรื่อง)' : d.name })),
    options: { company: uniq('company'), department: uniq('department'), requester: uniq('requester'), handler: uniq('handler_name') },
  });
}));

app.use('/api', (_q, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err instanceof multer.MulterError ? 400 : 500).json({ error: err.message });
});

/* ---------- serve built frontend ---------- */
const DIST = path.join(ROOT, 'dist');
if (fs.existsSync(path.join(DIST, 'index.html'))) {
  app.use(express.static(DIST));
  app.get('*', (_q, res) => res.sendFile(path.join(DIST, 'index.html')));
}

export const ready = (async () => { await initStorage(); await initDb(); })();
export default app;

if (!process.env.VERCEL) {
  await ready;
  app.listen(PORT, () => console.log(`Legal Request API on http://localhost:${PORT} (storage: ${storageMode})`));
}
