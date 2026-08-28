-- APEX KREATİF CRM v4 — müşteri marka kartları ve proje teslim kontrolü
-- Supabase SQL Editor'de BİR KEZ çalıştırın.

CREATE TABLE IF NOT EXISTS client_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID UNIQUE REFERENCES leads(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  sector TEXT,
  website TEXT,
  instagram TEXT,
  brand_colors TEXT,
  logo_url TEXT,
  domain_provider TEXT,
  hosting_provider TEXT,
  renewal_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_name TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_brands_project_id ON client_brands(project_id);
CREATE INDEX IF NOT EXISTS idx_project_checklists_project_id ON project_checklists(project_id);
DROP TRIGGER IF EXISTS set_client_brands_updated_at ON client_brands;
CREATE TRIGGER set_client_brands_updated_at BEFORE UPDATE ON client_brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_project_checklists_updated_at ON project_checklists;
CREATE TRIGGER set_project_checklists_updated_at BEFORE UPDATE ON project_checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE client_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team Members Client Brands Access" ON client_brands;
DROP POLICY IF EXISTS "Team Members Project Checklists Access" ON project_checklists;
CREATE POLICY "Team Members Client Brands Access" ON client_brands FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Team Members Project Checklists Access" ON project_checklists FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE client_brands, project_checklists;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
