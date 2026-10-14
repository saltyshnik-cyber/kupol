CREATE TABLE IF NOT EXISTS users (
  tg_id        BIGINT PRIMARY KEY,
  first_name   TEXT,
  last_name    TEXT,
  username     TEXT,
  phone        TEXT,
  consent_at   TIMESTAMPTZ,
  is_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  step         TEXT,
  draft        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diplomas (
  id          SERIAL PRIMARY KEY,
  tg_id       BIGINT NOT NULL REFERENCES users(tg_id),
  file_id     TEXT NOT NULL,
  file_type   TEXT NOT NULL DEFAULT 'photo',
  status      TEXT NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id         SERIAL PRIMARY KEY,
  tg_id      BIGINT NOT NULL REFERENCES users(tg_id),
  course_id  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_applications (
  id            SERIAL PRIMARY KEY,
  tg_id         BIGINT NOT NULL REFERENCES users(tg_id),
  full_name     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  zone          TEXT NOT NULL,
  photo_file_id TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diplomas_status ON diplomas(status);
CREATE INDEX IF NOT EXISTS idx_leads_tg ON leads(tg_id);
