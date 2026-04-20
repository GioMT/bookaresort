-- ============================================================
-- Create the site_content table for the CMS / Site Editor
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS site_content (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  section     TEXT NOT NULL DEFAULT '',
  label       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow the service role full access (already the case with service key)
-- Enable RLS but allow public reads (guest page needs to fetch content)
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Public read policy (no auth required for GET)
CREATE POLICY "Allow public read on site_content"
  ON site_content FOR SELECT
  USING (true);

-- Authenticated write policy (only logged-in staff can update)
CREATE POLICY "Allow authenticated write on site_content"
  ON site_content FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- ENABLE REALTIME FOR CHAT MODULE (Fixes manual refresh issue)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE support_cases;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
