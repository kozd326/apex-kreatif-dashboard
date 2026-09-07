-- APEX v7. Additive migration: no existing customer or financial record is deleted.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.crm_can_write() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('Yönetici','Satış','Operasyon'))
$$;
REVOKE ALL ON FUNCTION public.crm_can_write() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_can_write() TO authenticated;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_channels jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS do_not_contact boolean NOT NULL DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sales_context jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS outcome text;
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS message_version text;

CREATE TABLE IF NOT EXISTS public.crm_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 entity_type text NOT NULL CHECK(entity_type IN ('lead','project','proposal')),
 entity_id uuid NOT NULL,
 content jsonb NOT NULL DEFAULT '{}',
 revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(entity_type,entity_id), CHECK(octet_length(content::text)<200000)
);
CREATE TABLE IF NOT EXISTS public.crm_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_type text NOT NULL,
 entity_id uuid NOT NULL, before_data jsonb, after_data jsonb,
 actor_id uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crm_analysis_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES leads(id),
 created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','review','applied','failed')),
 response_id text, result jsonb, baseline jsonb NOT NULL DEFAULT '{}',
 error text, token_usage jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_one_active_analysis ON crm_analysis_jobs(lead_id) WHERE status IN ('queued','running');
CREATE TABLE IF NOT EXISTS public.crm_time_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES projects(id),
 user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
 entry_date date NOT NULL DEFAULT current_date, hours numeric(8,2) NOT NULL CHECK(hours>0 AND hours<=24),
 hourly_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK(hourly_cost>=0),
 description text NOT NULL DEFAULT '', revision_work boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crm_shares (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES crm_documents(id),
 token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 revoked_at timestamptz, created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(),
 published jsonb NOT NULL, views integer NOT NULL DEFAULT 0, last_viewed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.crm_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), share_id uuid NOT NULL REFERENCES crm_shares(id),
 name text NOT NULL, message text NOT NULL, kind text NOT NULL CHECK(kind IN ('Soru','Revizyon','Onay')),
 asset_id text, time_seconds integer CHECK(time_seconds>=0), created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['crm_documents','crm_history','crm_analysis_jobs','crm_time_entries','crm_shares','crm_feedback'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('DROP POLICY IF EXISTS crm_read ON public.%I',t);
  EXECUTE format('CREATE POLICY crm_read ON public.%I FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid()))',t);
  IF t NOT IN ('crm_history','crm_feedback','crm_shares') THEN
   EXECUTE format('DROP POLICY IF EXISTS crm_write ON public.%I',t);
   EXECUTE format('CREATE POLICY crm_write ON public.%I FOR ALL TO authenticated USING (public.crm_can_write()) WITH CHECK (public.crm_can_write())',t);
  END IF;
 END LOOP;
END $$;

-- History is append-only to clients. Capture changes even outside the new UI.
CREATE OR REPLACE FUNCTION public.crm_record_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND to_jsonb(OLD)=to_jsonb(NEW) THEN RETURN NEW; END IF;
 INSERT INTO crm_history(entity_type,entity_id,before_data,after_data)
 VALUES(TG_TABLE_NAME,COALESCE(NEW.id,OLD.id),CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END);
 RETURN COALESCE(NEW,OLD);
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['leads','projects','proposals','crm_documents','crm_time_entries'] LOOP
 EXECUTE format('DROP TRIGGER IF EXISTS crm_history_trigger ON public.%I',t);
 EXECUTE format('CREATE TRIGGER crm_history_trigger AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.crm_record_history()',t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.crm_save_document(p_type text,p_id uuid,p_content jsonb,p_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d crm_documents; BEGIN
 IF NOT crm_can_write() THEN RAISE EXCEPTION 'Yetkiniz yok'; END IF;
 IF p_type NOT IN ('lead','project','proposal') OR octet_length(p_content::text)>190000 THEN RAISE EXCEPTION 'Geçersiz belge'; END IF;
 IF (p_type='lead' AND NOT EXISTS(SELECT 1 FROM leads WHERE id=p_id)) OR (p_type='project' AND NOT EXISTS(SELECT 1 FROM projects WHERE id=p_id)) OR (p_type='proposal' AND NOT EXISTS(SELECT 1 FROM proposals WHERE id=p_id)) THEN RAISE EXCEPTION 'Kayıt bulunamadı'; END IF;
 INSERT INTO crm_documents(entity_type,entity_id) VALUES(p_type,p_id) ON CONFLICT DO NOTHING;
 SELECT * INTO d FROM crm_documents WHERE entity_type=p_type AND entity_id=p_id FOR UPDATE;
 IF d.revision<>p_revision THEN RAISE EXCEPTION 'Başka bir ekip üyesi güncelledi. Yenileyip tekrar deneyin.'; END IF;
 UPDATE crm_documents SET content=p_content,revision=revision+1,updated_at=now() WHERE id=d.id RETURNING * INTO d;
 RETURN to_jsonb(d);
END $$;

CREATE OR REPLACE FUNCTION public.crm_claim_lead(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT crm_can_write() THEN RAISE EXCEPTION 'Yetkiniz yok'; END IF;
 UPDATE leads SET assigned_to=auth.uid(),assigned_name=(SELECT name FROM profiles WHERE id=auth.uid())
 WHERE id=p_id AND archived_at IS NULL AND (assigned_to IS NULL OR assigned_to=auth.uid());
 IF NOT FOUND THEN RAISE EXCEPTION 'Aday başka bir ekip üyesinde. Sorumlu değişimini ekip içinde kararlaştırın.'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.crm_log_contact(p_id uuid,p_channel text,p_outcome text,p_note text,p_next date,p_version text DEFAULT 'v1') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l leads; BEGIN
 IF NOT crm_can_write() THEN RAISE EXCEPTION 'Yetkiniz yok'; END IF;
 SELECT * INTO l FROM leads WHERE id=p_id AND archived_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Aday bulunamadı'; END IF;
 IF p_channel NOT IN ('Telefon','WhatsApp','Instagram DM','E-posta','Toplantı') OR p_outcome NOT IN ('Ulaşılamadı','İlgileniyor','Teklif İstedi','Daha Sonra Ara','Olumsuz') OR length(p_note)>5000 THEN RAISE EXCEPTION 'Geçersiz sonuç'; END IF;
 IF l.assigned_to IS NOT NULL AND l.assigned_to<>auth.uid() AND NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role::text='Yönetici') THEN RAISE EXCEPTION 'Bu adayın sorumlusu farklı'; END IF;
 UPDATE leads SET contact_outcome=p_outcome,outcome_note=p_note,last_contact_date=current_date,next_step_date=CASE WHEN p_outcome='Olumsuz' THEN NULL ELSE p_next END,
 status=CASE WHEN p_outcome='Olumsuz' THEN 'Kaybedildi'::lead_status WHEN p_outcome IN ('İlgileniyor','Teklif İstedi') THEN 'Takipte'::lead_status WHEN status='Yeni' THEN 'İlk Temas'::lead_status ELSE status END WHERE id=p_id;
 INSERT INTO lead_activities(lead_id,user_id,user_name,type,description,channel,outcome,message_version)
 VALUES(p_id,auth.uid(),(SELECT name FROM profiles WHERE id=auth.uid()),CASE WHEN p_channel='Telefon' THEN 'Arama' WHEN p_channel='E-posta' THEN 'E-posta' WHEN p_channel='Toplantı' THEN 'Toplantı' ELSE 'Not' END,p_outcome||' — '||p_note,p_channel,p_outcome,left(p_version,80));
END $$;

-- Durable daily budget shared across server instances, never one counter per process.
CREATE OR REPLACE FUNCTION public.crm_start_analysis(p_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j uuid; BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role::text IN ('Yönetici','Satış')) THEN RAISE EXCEPTION 'Yetkiniz yok'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('crm-analysis-budget'));
 UPDATE crm_analysis_jobs SET status='failed',error='Başlangıç kesildi; yeniden başlatabilirsiniz.' WHERE status='queued' AND created_at<now()-interval '5 minutes';
 IF (SELECT count(*) FROM crm_analysis_jobs WHERE created_at>now()-interval '24 hours')>=20 THEN RAISE EXCEPTION 'Günlük 20 analiz güvenlik sınırına ulaşıldı'; END IF;
 INSERT INTO crm_analysis_jobs(lead_id,baseline) SELECT id,to_jsonb(l) FROM leads l WHERE id=p_id AND archived_at IS NULL RETURNING id INTO j;
 IF j IS NULL THEN RAISE EXCEPTION 'Aday bulunamadı'; END IF; RETURN j;
END $$;

-- A published snapshot contains ONLY explicitly reviewed, customer-facing content.
CREATE OR REPLACE FUNCTION public.crm_publish(p_document uuid,p_public jsonb) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tok text; BEGIN
 IF NOT crm_can_write() OR NOT EXISTS(SELECT 1 FROM crm_documents WHERE id=p_document) THEN RAISE EXCEPTION 'Yetkiniz yok'; END IF;
 IF jsonb_typeof(p_public)<>'object' OR octet_length(p_public::text)>100000 OR NOT p_public ? 'title' THEN RAISE EXCEPTION 'Geçersiz paylaşım'; END IF;
 tok=encode(gen_random_bytes(32),'hex');
 INSERT INTO crm_shares(document_id,token_hash,published) VALUES(p_document,encode(digest(tok,'sha256'),'hex'),p_public);
 RETURN tok;
END $$;
CREATE OR REPLACE FUNCTION public.crm_revoke(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NOT crm_can_write() THEN RAISE EXCEPTION 'Yetkiniz yok'; END IF; UPDATE crm_shares SET revoked_at=now() WHERE id=p_id; END $$;
CREATE OR REPLACE FUNCTION public.crm_read_share(p_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s crm_shares; BEGIN
 IF p_token !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
 UPDATE crm_shares SET views=views+1,last_viewed_at=now() WHERE token_hash=encode(digest(p_token,'sha256'),'hex') AND revoked_at IS NULL AND expires_at>now() RETURNING * INTO s;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('published',s.published,'expires_at',s.expires_at,'feedback',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',name,'message',message,'kind',kind,'asset_id',asset_id,'time_seconds',time_seconds,'created_at',created_at) ORDER BY created_at) FROM crm_feedback WHERE share_id=s.id),'[]'::jsonb));
END $$;
CREATE OR REPLACE FUNCTION public.crm_share_feedback(p_token text,p_name text,p_message text,p_kind text,p_asset text DEFAULT NULL,p_seconds integer DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s crm_shares; BEGIN
 SELECT * INTO s FROM crm_shares WHERE token_hash=encode(digest(p_token,'sha256'),'hex') AND revoked_at IS NULL AND expires_at>now() FOR UPDATE;
 IF NOT FOUND OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Paylaşım bulunamadı'; END IF;
 IF length(trim(p_name)) NOT BETWEEN 1 AND 100 OR length(trim(p_message)) NOT BETWEEN 1 AND 4000 OR p_kind NOT IN ('Soru','Revizyon','Onay') OR length(COALESCE(p_asset,''))>100 OR p_seconds<0 OR p_seconds>86400 THEN RAISE EXCEPTION 'Yorum bilgileri geçersiz'; END IF;
 IF (SELECT count(*) FROM crm_feedback WHERE share_id=s.id AND created_at>now()-interval '1 minute')>=5 THEN RAISE EXCEPTION 'Lütfen bir dakika bekleyin'; END IF;
 INSERT INTO crm_feedback(share_id,name,message,kind,asset_id,time_seconds) VALUES(s.id,p_name,p_message,p_kind,p_asset,p_seconds);
END $$;

REVOKE ALL ON FUNCTION public.crm_save_document(text,uuid,jsonb,integer),public.crm_claim_lead(uuid),public.crm_log_contact(uuid,text,text,text,date,text),public.crm_start_analysis(uuid),public.crm_publish(uuid,jsonb),public.crm_revoke(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_save_document(text,uuid,jsonb,integer),public.crm_claim_lead(uuid),public.crm_log_contact(uuid,text,text,text,date,text),public.crm_start_analysis(uuid),public.crm_publish(uuid,jsonb),public.crm_revoke(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.crm_read_share(text),public.crm_share_feedback(text,text,text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_read_share(text),public.crm_share_feedback(text,text,text,text,text,integer) TO anon,authenticated;
COMMIT;
