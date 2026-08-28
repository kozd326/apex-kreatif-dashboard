-- ==============================================================================
-- APEX KREATİF — PRODUCTION SUPABASE POSTGRESQL DATABASE SCHEMA & RLS POLICIES
-- ==============================================================================
-- Bu dosya Supabase SQL Editor üzerinde tek seferde veya tekrar tekrar çalıştırılabilir.
-- ==============================================================================

-- 1. ENUM TANIMLARI
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('Yönetici', 'Satış', 'Operasyon', 'Görüntüleme');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE lead_priority AS ENUM ('Yüksek', 'Orta', 'Düşük');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'Yeni', 
    'İlk Temas', 
    'Takipte', 
    'Görüşme Planlandı', 
    'Teklif Gönderildi', 
    'Kazanıldı', 
    'Kaybedildi'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('Taslak', 'Gönderildi', 'Revizyon', 'Kabul', 'Reddedildi');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('Başlamadı', 'Devam Ediyor', 'Müşteri Bekleniyor', 'Revizyon', 'Tamamlandı');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('Ödeme Bekliyor', 'Kısmi Ödendi', 'Tamamlandı');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- 2. TABLOLARIN OLUŞTURULMASI

-- PROFILES (Ekip Üyeleri: Kaan, Kubilay, Murat, Cem)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role DEFAULT 'Satış',
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEADS (Müşteri Adayları / CRM)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  sector TEXT,
  city_district TEXT,
  website TEXT,
  instagram TEXT,
  phone TEXT,
  email TEXT,
  decision_maker TEXT,
  source_url TEXT,
  priority lead_priority DEFAULT 'Orta',
  status lead_status DEFAULT 'Yeni',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_name TEXT,
  last_contact_date DATE,
  next_step_date DATE,
  contact_reason TEXT,
  recommended_package TEXT,
  first_contact_text TEXT,
  mini_audit_notes TEXT,
  estimated_deal_value NUMERIC(12,2) DEFAULT 0,
  win_probability INTEGER DEFAULT 50,
  expected_revenue NUMERIC(12,2) GENERATED ALWAYS AS (estimated_deal_value * (win_probability::numeric / 100.0)) STORED,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEAD_ACTIVITIES (Görüşme ve Not Geçmişi)
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  type TEXT NOT NULL, -- 'Arama', 'Toplantı', 'Not', 'E-posta', 'Teklif Gönderildi', 'Durum Değişikliği'
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROPOSALS (Teklifler)
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  lead_name TEXT NOT NULL,
  title TEXT NOT NULL,
  service_package TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  date_sent DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  status proposal_status DEFAULT 'Taslak',
  estimated_close_date DATE,
  notes TEXT,
  follow_up_reminder_date DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECTS (Projeler)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  assigned_name TEXT,
  start_date DATE DEFAULT CURRENT_DATE,
  deadline DATE,
  status project_status DEFAULT 'Devam Ediyor',
  total_fee NUMERIC(12,2) DEFAULT 0,
  payment_status payment_status DEFAULT 'Ödeme Bekliyor',
  files_or_links TEXT,
  client_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASKS (Görevler)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id),
  assigned_name TEXT,
  due_date TIMESTAMPTZ,
  priority lead_priority DEFAULT 'Orta',
  status TEXT DEFAULT 'Yapılacak', -- 'Yapılacak', 'Devam Ediyor', 'Tamamlandı'
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. İNDEKS TANIMLARI (HIZLI SORGULAR İÇİN)
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_next_step_date ON leads(next_step_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_to ON projects(assigned_to);


-- 4. OTOMATİK UPDATED_AT TRIGGER'I
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_leads_updated_at ON leads;
CREATE TRIGGER set_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_proposals_updated_at ON proposals;
CREATE TRIGGER set_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_projects_updated_at ON projects;
CREATE TRIGGER set_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_tasks_updated_at ON tasks;
CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 5. YENİ KULLANICI KAYDINDA OTOMATİK PROFILES SATIRI OLUŞTURMA TRIGGER'I
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'Satış'::user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 6. ROW LEVEL SECURITY (RLS) GÜVENLİK POLİTİKALARI

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle
DROP POLICY IF EXISTS "Team Members Profiles Read" ON profiles;
DROP POLICY IF EXISTS "Admins Profiles Update" ON profiles;
DROP POLICY IF EXISTS "Team Members Leads Access" ON leads;
DROP POLICY IF EXISTS "Team Members Activities Access" ON lead_activities;
DROP POLICY IF EXISTS "Team Members Proposals Access" ON proposals;
DROP POLICY IF EXISTS "Team Members Projects Access" ON projects;
DROP POLICY IF EXISTS "Team Members Tasks Access" ON tasks;

-- Profil okuma: Giriş yapmış tüm ekip üyeleri birbirlerinin profillerini görebilir
CREATE POLICY "Team Members Profiles Read" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Profil güncelleme: Yöneticiler veya kullanıcının kendisi profil bilgilerini güncelleyebilir
CREATE POLICY "Admins Profiles Update" ON profiles
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      auth.uid() = id OR 
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Yönetici')
    )
  );

-- Leads: Tüm authenticated ekip üyeleri okuyabilir ve işlem yapabilir
CREATE POLICY "Team Members Leads Access" ON leads
  FOR ALL USING (auth.role() = 'authenticated');

-- Activities: Tüm authenticated ekip üyeleri erişebilir
CREATE POLICY "Team Members Activities Access" ON lead_activities
  FOR ALL USING (auth.role() = 'authenticated');

-- Proposals: Tüm authenticated ekip üyeleri erişebilir
CREATE POLICY "Team Members Proposals Access" ON proposals
  FOR ALL USING (auth.role() = 'authenticated');

-- Projects: Tüm authenticated ekip üyeleri erişebilir
CREATE POLICY "Team Members Projects Access" ON projects
  FOR ALL USING (auth.role() = 'authenticated');

-- Tasks: Tüm authenticated ekip üyeleri erişebilir
CREATE POLICY "Team Members Tasks Access" ON tasks
  FOR ALL USING (auth.role() = 'authenticated');


-- 7. SUPABASE REALTIME CANLI YAYIN YETKİLERİ
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE leads, lead_activities, proposals, projects, tasks;
EXCEPTION WHEN OTHERS THEN null; END $$;
