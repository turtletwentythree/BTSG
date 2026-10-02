# Sign-in with Google / Microsoft 365

The server signs people in with OpenID Connect, then keeps a signed `HttpOnly` cookie
(12 h, `SESSION_HOURS` to change). Every `/api/*` route except `/api/health` needs that cookie.
Users are recorded in the `users` table on first sign-in.

## Environment variables
| Name | Purpose |
|---|---|
| `APP_URL` | Public URL of the site (no trailing slash). Local: `http://localhost:5173` |
| `SESSION_SECRET` | Random string, `openssl rand -hex 32` (Render generates one) |
| `APPROVER_EMAILS` | Emails (comma-separated) allowed to approve and move any request to the next step. Requesters can only act on the step waiting for them ("Waiting for user comment"). Empty = everyone signed in can approve |
| `COMPANIES` / `DEPARTMENTS` | Options for the Company and Department fields (comma-separated). Default company `Turtle23`; leave `DEPARTMENTS` empty for free text with suggestions |
| `ALLOWED_EMAIL_DOMAINS` / `ALLOWED_EMAILS` | Who may sign in. **Required in production**; empty = nobody |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client |
| `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT` | Microsoft Entra app; `MS_TENANT` = Directory (tenant) ID |
| `ALLOW_DEMO_LOGIN=true` | Local testing only |

Without any provider configured and outside production, a "Demo User" login still works.

## Google
1. https://console.cloud.google.com -> APIs & Services -> OAuth consent screen (Internal if you use Google Workspace).
2. Credentials -> Create credentials -> OAuth client ID -> Web application.
3. Authorized redirect URIs: `<APP_URL>/auth/google/callback`
   (add `http://localhost:5173/auth/google/callback` for local use).
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

## Microsoft 365
1. https://entra.microsoft.com -> App registrations -> New registration.
   Supported account types: **Single tenant** (this organisation only).
2. Redirect URI (Web): `<APP_URL>/auth/microsoft/callback` (also the localhost one for local use).
3. Overview page: copy **Application (client) ID** -> `MS_CLIENT_ID`, **Directory (tenant) ID** -> `MS_TENANT`.
4. Certificates & secrets -> New client secret -> copy the **Value** -> `MS_CLIENT_SECRET`.
