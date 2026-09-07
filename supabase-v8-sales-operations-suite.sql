-- APEX v8. Additive sales intelligence, sequence, lifecycle and proposal tracking.
-- Run AFTER supabase-v7-client-workspace.sql. No existing CRM record is deleted.
BEGIN;

CREATE TABLE IF NOT EXISTS public.crm_outreach_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES public.leads(id),
 channel text NOT NULL CHECK(channel IN ('Telefon','WhatsApp','Instagram DM','E-posta','Toplantı')),
 step_order integer NOT NULL CHECK(step_order BETWEEN 1 AND 12), due_date date NOT NULL DEFAULT current_date,
 status text NOT NULL DEFAULT 'Bekliyor' CHECK(status IN ('Bekliyor','Tamamlandı','Atlandı')),
 message_version text NOT NULL DEFAULT 'v1', message text, completed_at timestamptz, completed_by uuid REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(lead_id, step_order)
);
CREATE TABLE IF NOT EXISTS public.crm_audit_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES public.leads(id),
 category text NOT NULL CHECK(category IN ('Web','Sosyal Medya','Google','İletişim','Teknik')),
 source_url text, checked_at timestamptz NOT NULL DEFAULT now(), finding text NOT NULL,
 score integer CHECK(score BETWEEN 0 AND 5), evidence text, created_by uuid REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crm_lifecycle_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid REFERENCES public.leads(id), project_id uuid REFERENCES public.projects(id),
 action_type text NOT NULL CHECK(action_type IN ('Yenileme','Çapraz Satış','Referans','Memnuniyet','Tekrar Teklif')),
 due_date date NOT NULL, status text NOT NULL DEFAULT 'Bekliyor' CHECK(status IN ('Bekliyor','Tamamlandı','Atlandı')),
 notes text NOT NULL DEFAULT '', owner_id uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(lead_id IS NOT NULL OR project_id IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.crm_proposal_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), proposal_id uuid NOT NULL REFERENCES public.proposals(id),
 event_type text NOT NULL CHECK(event_type IN ('Hazırlandı','Gönderildi','Görüntülendi','Revizyon İstendi','Kabul','Reddedildi')),
 detail text, actor_id uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['crm_outreach_steps','crm_audit_evidence','crm_lifecycle_actions','crm_proposal_events'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('DROP POLICY IF EXISTS crm_suite_read ON public.%I',t);
  EXECUTE format('CREATE POLICY crm_suite_read ON public.%I FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid()))',t);
  EXECUTE format('DROP POLICY IF EXISTS crm_suite_write ON public.%I',t);
  EXECUTE format('CREATE POLICY crm_suite_write ON public.%I FOR ALL TO authenticated USING (public.crm_can_write()) WITH CHECK (public.crm_can_write())',t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.crm_create_standard_sequence(p_lead uuid, p_start date DEFAULT current_date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT crm_can_write() THEN RAISE EXCEPTION 'Yetkiniz yok'; END IF;
 IF NOT EXISTS(SELECT 1 FROM leads WHERE id=p_lead AND archived_at IS NULL AND NOT do_not_contact) THEN RAISE EXCEPTION 'Aday uygun değil'; END IF;
 INSERT INTO crm_outreach_steps(lead_id,channel,step_order,due_date,message_version)
 VALUES (p_lead,'Instagram DM',1,p_start,'v1'),(p_lead,'Telefon',2,p_start+interval '2 days','v1'),(p_lead,'E-posta',3,p_start+interval '5 days','v1'),(p_lead,'WhatsApp',4,p_start+interval '9 days','v1')
 ON CONFLICT(lead_id,step_order) DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION public.crm_complete_sequence_step(p_step uuid,p_status text,p_note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s crm_outreach_steps; BEGIN
 IF NOT crm_can_write() OR p_status NOT IN ('Tamamlandı','Atlandı') OR length(p_note)>3000 THEN RAISE EXCEPTION 'Geçersiz işlem'; END IF;
 UPDATE crm_outreach_steps SET status=p_status,completed_at=now(),completed_by=auth.uid(),message=COALESCE(NULLIF(p_note,''),message) WHERE id=p_step RETURNING * INTO s;
 IF NOT FOUND THEN RAISE EXCEPTION 'Adım bulunamadı'; END IF;
 INSERT INTO lead_activities(lead_id,user_id,user_name,type,description,channel,message_version) VALUES(s.lead_id,auth.uid(),(SELECT name FROM profiles WHERE id=auth.uid()),'Not','Satış akışı: '||p_status||CASE WHEN p_note<>'' THEN ' — '||p_note ELSE '' END,s.channel,s.message_version);
END $$;
REVOKE ALL ON FUNCTION public.crm_create_standard_sequence(uuid,date),public.crm_complete_sequence_step(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_create_standard_sequence(uuid,date),public.crm_complete_sequence_step(uuid,text,text) TO authenticated;
COMMIT;
