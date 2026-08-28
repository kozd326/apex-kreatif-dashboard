-- APEX KREATİF CRM v5 — satış sonucu, revizyon ve aylık hedefler
-- Supabase SQL Editor'de BİR KEZ çalıştırın.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS contact_outcome TEXT CHECK (contact_outcome IN ('Ulaşılamadı', 'İlgileniyor', 'Teklif İstedi', 'Daha Sonra Ara', 'Olumsuz')),
  ADD COLUMN IF NOT EXISTS outcome_note TEXT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS revision_count SMALLINT NOT NULL DEFAULT 0 CHECK (revision_count >= 0),
  ADD COLUMN IF NOT EXISTS client_approval_note TEXT;

CREATE TABLE IF NOT EXISTS agency_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_start DATE NOT NULL UNIQUE,
  revenue_target NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (revenue_target >= 0),
  new_lead_target INTEGER NOT NULL DEFAULT 0 CHECK (new_lead_target >= 0),
  proposal_target INTEGER NOT NULL DEFAULT 0 CHECK (proposal_target >= 0),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_agency_goals_updated_at ON agency_goals;
CREATE TRIGGER set_agency_goals_updated_at BEFORE UPDATE ON agency_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE agency_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team Members Agency Goals Access" ON agency_goals;
CREATE POLICY "Team Members Agency Goals Access" ON agency_goals FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE agency_goals;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
