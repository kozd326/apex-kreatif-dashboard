-- APEX KREATİF CRM v6 — kanıtlı dijital denetim ve satış hazırlık kartı
-- Supabase SQL Editor'de BİR KEZ çalıştırın.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS audit_sources TEXT,
  ADD COLUMN IF NOT EXISTS website_findings TEXT,
  ADD COLUMN IF NOT EXISTS social_findings TEXT,
  ADD COLUMN IF NOT EXISTS booking_findings TEXT,
  ADD COLUMN IF NOT EXISTS brand_findings TEXT,
  ADD COLUMN IF NOT EXISTS audit_checked_at DATE,
  ADD COLUMN IF NOT EXISTS call_opening TEXT,
  ADD COLUMN IF NOT EXISTS discovery_questions TEXT,
  ADD COLUMN IF NOT EXISTS objection_reply TEXT,
  ADD COLUMN IF NOT EXISTS next_best_action TEXT;

COMMENT ON COLUMN leads.audit_sources IS 'Yalnızca kamuya açık ve doğrulanmış kaynak bağlantıları; her satıra bir URL.';
COMMENT ON COLUMN leads.website_findings IS 'Web sitesi için somut, kanıta dayalı bulgular.';
COMMENT ON COLUMN leads.social_findings IS 'Kamuya açık sosyal medya görünümü için somut bulgular.';
COMMENT ON COLUMN leads.booking_findings IS 'Telefon, WhatsApp, form ve randevu yolu bulguları.';
COMMENT ON COLUMN leads.brand_findings IS 'Marka güveni, hizmet netliği ve yerel tutarlılık bulguları.';

CREATE INDEX IF NOT EXISTS idx_leads_audit_checked_at ON leads(audit_checked_at);
