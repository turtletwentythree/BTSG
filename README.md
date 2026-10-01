# Legal Request System

React (Vite) front end + Node/Express API + PostgreSQL (Supabase) + Supabase Storage for attachments.

## 1. Set up Supabase
1. Create a project at https://supabase.com
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL`: Project Settings > Database > Connection string (Session pooler)
   - `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`: Project Settings > API (service_role key, keep secret)
3. Tables are created automatically on first start from `db/schema.sql`
   (or paste that file into the Supabase SQL editor). A private storage bucket `attachments` is also created automatically.

If `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` are empty, attachments are stored on local disk (`uploads/`).

## 2. Run
    npm install
    npm run dev        # web http://localhost:5173, API http://localhost:3001
    npm start          # build + serve everything on http://localhost:3001

Needs Node 20.6+ (for --env-file-if-exists). Demo data is inserted when the requests table is empty (set SEED=false to skip).

## Pages
- /login - demo login (no real auth yet)
- /all-type-request, /create-requests, / (All Request), /requests/:id, /dashboard

## API
GET/POST /api/requests, GET /api/requests/:id, POST /api/requests/:id/advance,
POST /api/requests/:id/attachments, GET/DELETE /api/attachments/:id, GET /api/stats, GET /api/health

See DEPLOY.md for Cloud Run.
