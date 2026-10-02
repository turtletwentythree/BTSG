-- Legal Request System schema (PostgreSQL / Supabase)
-- Run once in the Supabase SQL editor, or let the server create it on start (it runs this file).

CREATE TABLE IF NOT EXISTS requests (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  no         TEXT GENERATED ALWAYS AS ('LR-' || lpad(id::text, 4, '0')) STORED,
  type       TEXT NOT NULL,
  matter     TEXT NOT NULL,
  title      TEXT NOT NULL,
  requester  TEXT NOT NULL,
  step       INTEGER NOT NULL DEFAULT 3 CHECK (step BETWEEN 1 AND 10),
  fields     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS requests_no_key ON requests (no);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS requester_email TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT 'Turtle23';
ALTER TABLE requests ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS handler_name TEXT;   -- ผู้รับเรื่อง (legal)
ALTER TABLE requests ADD COLUMN IF NOT EXISTS handler_email TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS legal_note TEXT;     -- internal note, legal team only

CREATE TABLE IF NOT EXISTS attachments (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id  BIGINT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  stored      TEXT NOT NULL,
  size        BIGINT NOT NULL,
  mime        TEXT,
  uploaded_by TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attachments_request_idx ON attachments (request_id);

CREATE TABLE IF NOT EXISTS history (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  step       INTEGER NOT NULL,
  note       TEXT,
  actor      TEXT,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS history_request_idx ON history (request_id);

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  provider      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- The API connects with the database owner / service credentials. Block direct access from
-- Supabase's public (anon) API so data is only reachable through this server.
ALTER TABLE requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
