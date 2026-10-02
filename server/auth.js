// Google / Microsoft 365 sign-in (OpenID Connect, authorization-code flow + PKCE)
// and signed-cookie sessions. No session table needed.
import crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER || !!process.env.VERCEL;
const env = (k) => (process.env[k] || '').trim();
const list = (k) => env(k).toLowerCase().split(/[,\s;]+/).filter(Boolean);

let SECRET = env('SESSION_SECRET');
if (!SECRET) {
  SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET is not set: using a random one (everyone is signed out on restart).');
}

const SESSION_HOURS = Number(env('SESSION_HOURS')) || 12;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MS_TENANT = env('MS_TENANT');

const PROVIDERS = {
  google: {
    id: env('GOOGLE_CLIENT_ID'), secret: env('GOOGLE_CLIENT_SECRET'),
    auth: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    jwks: 'https://www.googleapis.com/oauth2/v3/certs',
    scope: 'openid email profile',
    issuerOk: (iss) => iss === 'https://accounts.google.com' || iss === 'accounts.google.com',
  },
  microsoft: {
    // MS_TENANT = your Directory (tenant) ID. Required: it limits sign-in to your organisation.
    id: env('MS_CLIENT_ID'), secret: env('MS_CLIENT_SECRET'),
    auth: `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize`,
    token: `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`,
    jwks: `https://login.microsoftonline.com/${MS_TENANT}/discovery/v2.0/keys`,
    scope: 'openid email profile',
    issuerOk: (iss, claims) =>
      iss === `https://login.microsoftonline.com/${claims.tid}/v2.0` && (!GUID.test(MS_TENANT) || claims.tid === MS_TENANT),
  },
};
const enabled = (name) => {
  const p = PROVIDERS[name];
  return !!(p.id && p.secret && (name !== 'microsoft' || MS_TENANT));
};
const jwksCache = {};
const jwksFor = (name) => (jwksCache[name] ||= createRemoteJWKSet(new URL(PROVIDERS[name].jwks)));

const allowedDomains = list('ALLOWED_EMAIL_DOMAINS');
const allowedEmails = list('ALLOWED_EMAILS');
const anyProvider = () => enabled('google') || enabled('microsoft');
// demo login only when explicitly allowed, or when no provider is set up outside production
export const demoEnabled = () => env('ALLOW_DEMO_LOGIN') === 'true' || (!isProd && !anyProvider());

function isAllowed(email) {
  const e = email.toLowerCase();
  if (!allowedDomains.length && !allowedEmails.length) return !isProd; // production needs an allow-list
  return allowedEmails.includes(e) || allowedDomains.includes(e.split('@')[1]);
}

/* ---------- signed cookies ---------- */
const b64 = (b) => Buffer.from(b).toString('base64url');
const sign = (payload) => {
  const body = b64(JSON.stringify(payload));
  return body + '.' + crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
};
const unsign = (token) => {
  if (!token) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const good = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp && p.exp > Date.now() ? p : null;
  } catch { return null; }
};
const cookies = (req) => Object.fromEntries(
  (req.headers.cookie || '').split(';').map((c) => c.trim().split(/=(.*)/s).slice(0, 2)).filter(([k]) => k)
);
const setCookie = (req, res, name, value, maxAgeSec) => {
  const secure = req.secure || /^https:/.test(env('APP_URL'));
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (secure) parts.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [].concat(prev || [], parts.join('; ')));
};
const clearCookie = (req, res, name) => setCookie(req, res, name, '', 0);

const baseUrl = (req) => env('APP_URL').replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;

function startSession(req, res, user) {
  setCookie(req, res, 'lrs_session', sign({ ...user, exp: Date.now() + SESSION_HOURS * 3600e3 }), SESSION_HOURS * 3600);
}

/* ---------- middleware ---------- */
export function attachUser(req, _res, next) {
  const s = unsign(cookies(req).lrs_session);
  req.user = s ? { name: s.name, email: s.email, provider: s.provider } : null;
  next();
}
export function requireAuth(req, res, next) {
  if (req.user) return next();
  res.status(401).json({ error: 'Please sign in' });
}
// CSRF defence in depth: browsers send Origin on cross-site writes; it must match our host.
export function sameOriginWrites(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== req.get('host') && new URL(origin).host !== new URL(baseUrl(req)).host) throw 0; }
    catch { return res.status(403).json({ error: 'Cross-site request blocked' }); }
  }
  next();
}

/* ---------- routes ---------- */
export function mountAuth(app, { onLogin }) {
  const fail = (res, code) => res.redirect('/login?error=' + code);

  app.get('/api/auth/me', (req, res) => {
    res.json({
      user: req.user,
      providers: { google: enabled('google'), microsoft: enabled('microsoft') },
      demo: demoEnabled(),
    });
  });

  app.post('/api/auth/logout', (req, res) => { clearCookie(req, res, 'lrs_session'); res.status(204).end(); });

  app.post('/api/auth/demo', async (req, res) => {
    if (!demoEnabled()) return res.status(403).json({ error: 'Demo login is disabled' });
    const name = String(req.body?.name || 'Demo User').slice(0, 80);
    const user = { name, email: 'demo@localhost', provider: 'demo' };
    startSession(req, res, user);
    res.json({ user });
  });

  for (const name of Object.keys(PROVIDERS)) {
    app.get(`/auth/${name}`, (req, res) => {
      if (!enabled(name)) return fail(res, 'not_configured');
      const p = PROVIDERS[name];
      const state = crypto.randomBytes(16).toString('hex');
      const nonce = crypto.randomBytes(16).toString('hex');
      const verifier = crypto.randomBytes(32).toString('base64url');
      setCookie(req, res, 'lrs_oauth', sign({ state, nonce, verifier, name, exp: Date.now() + 10 * 60e3 }), 600);
      const url = new URL(p.auth);
      url.search = new URLSearchParams({
        client_id: p.id, response_type: 'code', scope: p.scope, state, nonce,
        redirect_uri: `${baseUrl(req)}/auth/${name}/callback`,
        code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
        code_challenge_method: 'S256',
        ...(name === 'google' ? { prompt: 'select_account' } : { prompt: 'select_account', response_mode: 'query' }),
      }).toString();
      res.redirect(url.toString());
    });

    app.get(`/auth/${name}/callback`, async (req, res) => {
      try {
        const p = PROVIDERS[name];
        const saved = unsign(cookies(req).lrs_oauth);
        clearCookie(req, res, 'lrs_oauth');
        if (req.query.error) return fail(res, 'cancelled');
        if (!saved || saved.name !== name || saved.state !== req.query.state || !req.query.code) return fail(res, 'state');

        const tokenRes = await fetch(p.token, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code', code: String(req.query.code),
            client_id: p.id, client_secret: p.secret,
            redirect_uri: `${baseUrl(req)}/auth/${name}/callback`, code_verifier: saved.verifier,
          }),
        });
        const tok = await tokenRes.json();
        if (!tokenRes.ok || !tok.id_token) { console.error(name, 'token error', tok.error, tok.error_description); return fail(res, 'token'); }

        const { payload: c } = await jwtVerify(tok.id_token, jwksFor(name), { audience: p.id });
        if (!p.issuerOk(c.iss, c) || c.nonce !== saved.nonce) return fail(res, 'token');

        const email = String(c.email || (name === 'microsoft' ? c.preferred_username : '') || '').toLowerCase();
        if (!email || (name === 'google' && c.email_verified !== true)) return fail(res, 'email');
        if (!isAllowed(email)) { console.warn('Sign-in refused (not on allow-list):', email); return fail(res, 'denied'); }

        const user = { name: c.name || email, email, provider: name };
        await onLogin(user);
        startSession(req, res, user);
        res.redirect('/');
      } catch (e) {
        console.error(name, 'sign-in failed:', e.message);
        fail(res, 'failed');
      }
    });
  }
}
