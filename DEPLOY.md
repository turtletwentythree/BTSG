# Deploy to Google Cloud Run

The database and file storage live in Supabase, so Cloud Run stays stateless.

Prerequisites: Google Cloud project with billing, gcloud CLI (`gcloud auth login`), a Supabase project (see README).

    gcloud config set project YOUR_PROJECT_ID
    gcloud run deploy legal-request-web \
      --source . \
      --region asia-southeast1 \
      --allow-unauthenticated \
      --set-env-vars "DATABASE_URL=...,SUPABASE_URL=...,SUPABASE_SERVICE_KEY=..."

Better: store the three secrets in Secret Manager and use `--set-secrets` instead of `--set-env-vars`.

## Login
The login buttons are a demo and anyone with the URL can use the app. Before sharing it outside your team, add real
Google / Microsoft 365 sign-in, or remove --allow-unauthenticated and use Identity-Aware Proxy.

## Render (no CLI, uses GitHub + Supabase)

1. https://dashboard.render.com -> New -> Blueprint -> pick this repo (reads `render.yaml`).
2. Enter `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` when prompted (copy from local `.env`).
3. Deploy; the public URL is `https://legal-request-system.onrender.com` (or similar).
