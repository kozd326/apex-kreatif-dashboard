-- APEX KREATİF CRM v3 — proje teslimatı ve ajans gider takibi
-- Supabase SQL Editor'de BİR KEZ çalıştırın.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS deliverables TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at DATE,
  ADD COLUMN IF NOT EXISTS client_approval_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

CREATE TABLE IF NOT EXISTS business_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  vendor TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Yazılım', 'Reklam', 'Çekim & Edit', 'Freelancer', 'Vergi & Muhasebe', 'Operasyon', 'Diğer')),
  description TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Ödendi' CHECK (status IN ('Planlandı', 'Ödendi')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_expenses_project_id ON business_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_business_expenses_date ON business_expenses(expense_date);
DROP TRIGGER IF EXISTS set_business_expenses_updated_at ON business_expenses;
CREATE TRIGGER set_business_expenses_updated_at BEFORE UPDATE ON business_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE business_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team Members Business Expenses Access" ON business_expenses;
CREATE POLICY "Team Members Business Expenses Access" ON business_expenses
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE business_expenses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Eski CSV aktarımındaki uydurma başlangıç değerlerini sıfırlar.
-- El ile düzenlenmiş veya gerçek teklif tutarlarına dokunmaz.
UPDATE leads
SET estimated_deal_value = 0,
    win_probability = CASE status
      WHEN 'Yeni' THEN 10 WHEN 'İlk Temas' THEN 20 WHEN 'Takipte' THEN 30
      WHEN 'Görüşme Planlandı' THEN 40 WHEN 'Teklif Gönderildi' THEN 60
      WHEN 'Kazanıldı' THEN 100 WHEN 'Kaybedildi' THEN 0 ELSE 0 END
WHERE estimated_deal_value = 75000
  AND win_probability = 50
  AND notes = 'Google Sheets CSV dosyasından toplu olarak Supabase veritabanına aktarıldı.';
