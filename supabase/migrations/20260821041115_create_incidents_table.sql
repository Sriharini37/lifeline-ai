/*
# Create incidents table for LifeLine AI

1. Purpose
   Stores emergency SOS incidents submitted by bystanders/patients,
   along with AI triage output (priority, confidence, signals, reasoning).

2. New Tables
   - `incidents`
     - `id` (uuid, primary key)
     - `description` (text, not null) — raw text/voice-transcribed description
     - `reporter_name` (text) — optional name of the person reporting
     - `reporter_phone` (text) — optional contact number
     - `latitude` (double precision) — GPS latitude
     - `longitude` (double precision) — GPS longitude
     - `location_label` (text) — human-readable location text
     - `incident_type` (text) — AI-classified type (e.g. Road Accident, Cardiac, Fall, Fire, Unknown)
     - `priority` (text, not null default 'UNKNOWN') — CRITICAL | HIGH | MODERATE | LOW | UNKNOWN
     - `confidence` (integer, default 0) — 0-100 AI confidence score
     - `severity_signals` (text[]) — detected urgency signals
     - `extracted_fields` (jsonb) — structured extracted data (people count, consciousness, bleeding, hazard, etc.)
     - `missing_information` (text[]) — what the AI couldn't determine
     - `reasoning` (text[]) — human-readable reasoning steps for the priority
     - `status` (text, not null default 'PENDING') — PENDING | REVIEWING | DISPATCHED | RESOLVED
     - `dispatch_note` (text) — note added by operator on dispatch
     - `created_at` (timestamptz, default now())
     - `updated_at` (timestamptz, default now())

3. Security
   - Enable RLS on `incidents`.
   - This is a no-auth app (no sign-in screen) — the SOS page and the control
     room both operate as the anon-key client. All CRUD is open to
     anon + authenticated because the incident data is intentionally shared
     across the public SOS interface and the control-room dashboard.

4. Indexes
   - `incidents_priority_idx` on priority (dashboard filters by priority)
   - `incidents_status_idx` on status (dashboard filters by status)
   - `incidents_created_at_idx` on created_at DESC (dashboard sorts by newest)
*/

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  reporter_name text,
  reporter_phone text,
  latitude double precision,
  longitude double precision,
  location_label text,
  incident_type text,
  priority text NOT NULL DEFAULT 'UNKNOWN',
  confidence integer NOT NULL DEFAULT 0,
  severity_signals text[] NOT NULL DEFAULT '{}',
  extracted_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_information text[] NOT NULL DEFAULT '{}',
  reasoning text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'PENDING',
  dispatch_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incidents_priority_idx ON incidents (priority);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents (status);
CREATE INDEX IF NOT EXISTS incidents_created_at_idx ON incidents (created_at DESC);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_incidents" ON incidents;
CREATE POLICY "anon_select_incidents" ON incidents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_incidents" ON incidents;
CREATE POLICY "anon_insert_incidents" ON incidents FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_incidents" ON incidents;
CREATE POLICY "anon_update_incidents" ON incidents FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_incidents" ON incidents;
CREATE POLICY "anon_delete_incidents" ON incidents FOR DELETE
  TO anon, authenticated USING (true);

-- auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS incidents_set_updated_at ON incidents;
CREATE TRIGGER incidents_set_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
