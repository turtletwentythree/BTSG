// Finds the working Supabase pooler region for your project and updates DATABASE_URL in .env.
// Usage: npm run detect-db
import fs from 'node:fs';
import pg from 'pg';

const envText = fs.readFileSync('.env', 'utf8');
const urlLine = envText.split('\n').find((l) => l.startsWith('DATABASE_URL='));
if (!urlLine) { console.error('No active DATABASE_URL= line found in .env'); process.exit(1); }
const u = new URL(urlLine.slice('DATABASE_URL='.length).trim());
const password = decodeURIComponent(u.password);
const ref = (u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/) || u.username.match(/^postgres\.([a-z0-9]+)$/) || [])[1];
if (!ref) { console.error('Could not work out the project id from DATABASE_URL'); process.exit(1); }

const regions = [
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ca-central-1', 'sa-east-1',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-central-2', 'eu-north-1',
];
const hosts = [];
for (const r of regions) for (const n of [0, 1]) hosts.push({ r, host: `aws-${n}-${r}.pooler.supabase.com` });

async function tryHost({ r, host }) {
  const c = new pg.Client({
    host, port: 5432, user: `postgres.${ref}`, password, database: 'postgres',
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000,
  });
  c.on('error', () => {});
  try { await c.connect(); await c.query('select 1'); await c.end(); return { r, host, ok: true }; }
  catch (e) { try { await c.end(); } catch {} return { r, host, ok: false, msg: e.message }; }
}

console.log(`Project ${ref}: testing ${hosts.length} pooler hosts...`);
const results = [];
for (let i = 0; i < hosts.length; i += 12) results.push(...(await Promise.all(hosts.slice(i, i + 12).map(tryHost))));
const hit = results.find((x) => x.ok);

if (!hit) {
  const auth = results.find((x) => /password authentication failed/i.test(x.msg || ''));
  if (auth) {
    console.error(`\nFound the server (${auth.host}) but the password was rejected.`);
    console.error('Reset it: Supabase > Project Settings > Database > Reset database password, then put it in .env (write @ as %40).');
  } else {
    const net = results.filter((x) => /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/.test(x.msg || '')).length;
    console.error(net > hosts.length / 2
      ? '\nCould not reach Supabase from this computer. Check your internet / VPN / firewall.'
      : '\nNo region matched. Copy the "Session pooler" URI from Supabase > Connect and paste it as DATABASE_URL in .env.');
    console.error('Sample errors:', [...new Set(results.map((x) => x.msg))].slice(0, 3).join(' | '));
  }
  process.exit(1);
}

const newUrl = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${hit.host}:5432/postgres`;
const out = envText.split('\n').map((l) => (l.startsWith('DATABASE_URL=') ? `DATABASE_URL=${newUrl}` : l)).join('\n');
fs.writeFileSync('.env', out);
console.log(`\nWorking region: ${hit.r} (${hit.host}). .env updated. Now run: npm run dev`);
