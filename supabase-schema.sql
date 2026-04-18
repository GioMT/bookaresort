-- ── ROOMS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id          TEXT PRIMARY KEY,
  name        TEXT        NOT NULL,
  price_12h   INTEGER     NOT NULL DEFAULT 0,
  price_24h   INTEGER     NOT NULL DEFAULT 0,
  quantity    INTEGER     NOT NULL DEFAULT 1,  -- NEW: Total number of this room type
  cap         TEXT        NOT NULL,
  emoji       TEXT        NOT NULL DEFAULT '🏠',
  img         TEXT        NOT NULL DEFAULT 'cottage',
  badge       TEXT        NOT NULL DEFAULT '',
  amenities   TEXT[]      NOT NULL DEFAULT '{}',
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INTEGER     NOT NULL DEFAULT 99,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── BOOKINGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ref          TEXT        NOT NULL,           -- REMOVED 'UNIQUE' constraint
  room_id      TEXT        NOT NULL REFERENCES rooms(id),
  room_name    TEXT        NOT NULL,
  room_quantity INTEGER    NOT NULL DEFAULT 1, -- NEW: How many of this room they booked
  guest_name   TEXT        NOT NULL,
  guest_fname  TEXT        NOT NULL DEFAULT '',
  guest_lname  TEXT        NOT NULL DEFAULT '',
  guest_email  TEXT        NOT NULL,
  guest_phone  TEXT                   DEFAULT '',
  check_in     DATE        NOT NULL,
  check_out    DATE        NOT NULL,
  nights       INTEGER     NOT NULL,
  subtotal     INTEGER     NOT NULL DEFAULT 0,
  tax          INTEGER     NOT NULL DEFAULT 0,
  total        INTEGER     NOT NULL DEFAULT 0,
  special_req  TEXT                   DEFAULT '',
  notes        TEXT                   DEFAULT '',
  repair_cost  INTEGER     NOT NULL DEFAULT 0,
  status       TEXT        NOT NULL DEFAULT 'confirmed'
                           CHECK (status IN ('confirmed','pending','cancelled')),
  flagged      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (check_out > check_in)
);
-- (The rest of your Indexes and Triggers remain exactly the same)
-- -- BUSINESS DOCS ----------------------------------------------
CREATE TABLE IF NOT EXISTS business_docs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  filename     TEXT        NOT NULL,
  file_url     TEXT        NOT NULL,
  size_kb      INTEGER     NOT NULL,
  uploaded_by  TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Set up Storage Bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('business_docs', 'business_docs', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'business_docs');
CREATE POLICY "Admin Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business_docs');
CREATE POLICY "Admin Updates" ON storage.objects FOR UPDATE USING (bucket_id = 'business_docs');
CREATE POLICY "Admin Deletes" ON storage.objects FOR DELETE USING (bucket_id = 'business_docs');

-- Add emp_id to staff_profiles
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS emp_id TEXT UNIQUE;
