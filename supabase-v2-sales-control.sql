-- APEX KREATİF CRM v2 — veri kalitesi, teklif ve tahsilat takibi
-- Supabase SQL Editor'de BİR KEZ çalıştırın.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS contact_verification_status TEXT NOT NULL DEFAULT 'Araştırılacak'
    CHECK (contact_verification_status IN ('Araştırılacak', 'Kısmi Doğrulandı', 'Doğrulandı', 'Ulaşılamadı')),
  ADD COLUMN IF NOT EXISTS website_score SMALLINT CHECK (website_score BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS social_score SMALLINT CHECK (social_score BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS booking_score SMALLINT CHECK (booking_score BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS brand_score SMALLINT CHECK (brand_score BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (delivery_cost >= 0),
  ADD COLUMN IF NOT EXISTS recurring_months SMALLINT NOT NULL DEFAULT 0 CHECK (recurring_months BETWEEN 0 AND 36);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  due_date DATE,
  paid_at DATE,
  status payment_status NOT NULL DEFAULT 'Ödeme Bekliyor',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
DROP TRIGGER IF EXISTS set_payments_updated_at ON payments;
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team Members Payments Access" ON payments;
CREATE POLICY "Team Members Payments Access" ON payments
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE payments;
