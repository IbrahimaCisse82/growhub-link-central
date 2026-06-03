
-- 6.1 Colonnes anonymisation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_anonymized boolean NOT NULL DEFAULT false;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS is_anonymized boolean NOT NULL DEFAULT false;

-- 6.2 Demandes d'export RGPD
CREATE TABLE public.data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  file_path text,
  error_message text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.data_export_requests TO authenticated;
GRANT ALL ON public.data_export_requests TO service_role;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own export requests" ON public.data_export_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "users create own export requests" ON public.data_export_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "service updates export requests" ON public.data_export_requests FOR UPDATE TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE TRIGGER trg_data_export_requests_updated BEFORE UPDATE ON public.data_export_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6.3 Demandes de suppression de compte
CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled','completed')),
  reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own deletion" ON public.account_deletion_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "users request own deletion" ON public.account_deletion_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users cancel own deletion" ON public.account_deletion_requests FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_coordinator(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_admin_or_coordinator(auth.uid()));
CREATE TRIGGER trg_account_deletion_updated BEFORE UPDATE ON public.account_deletion_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6.4 Registre des traitements
CREATE TABLE public.data_processing_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_name text NOT NULL,
  purpose text NOT NULL,
  legal_basis text NOT NULL CHECK (legal_basis IN ('consent','contract','legal_obligation','vital_interests','public_task','legitimate_interests')),
  data_categories text[] NOT NULL DEFAULT '{}',
  recipients text[] NOT NULL DEFAULT '{}',
  retention_period_days integer,
  cross_border_transfer boolean NOT NULL DEFAULT false,
  transfer_countries text[] DEFAULT '{}',
  security_measures text,
  data_controller text,
  dpo_contact text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.data_processing_register TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.data_processing_register TO authenticated;
GRANT ALL ON public.data_processing_register TO service_role;
ALTER TABLE public.data_processing_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all authenticated read register" ON public.data_processing_register FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage register" ON public.data_processing_register FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE TRIGGER trg_dpr_updated BEFORE UPDATE ON public.data_processing_register FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6.5 Audit consultation PII
CREATE TABLE public.pii_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accessed_entity_type text NOT NULL,
  accessed_entity_id uuid,
  accessed_fields text[] NOT NULL DEFAULT '{}',
  purpose text,
  ip_address text,
  user_agent text,
  accessed_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.pii_access_log TO authenticated;
GRANT SELECT ON public.pii_access_log TO authenticated;
GRANT ALL ON public.pii_access_log TO service_role;
ALTER TABLE public.pii_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own pii log" ON public.pii_access_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin read all pii log" ON public.pii_access_log FOR SELECT TO authenticated USING (public.is_admin_or_coordinator(auth.uid()) OR user_id = auth.uid());
CREATE INDEX idx_pii_log_user ON public.pii_access_log(user_id, accessed_at DESC);
CREATE INDEX idx_pii_log_entity ON public.pii_access_log(accessed_entity_type, accessed_entity_id);

-- 6.6 Consentements cookies
CREATE TABLE public.cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_token text,
  necessary boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  given_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.cookie_consents TO authenticated;
GRANT INSERT ON public.cookie_consents TO anon;
GRANT ALL ON public.cookie_consents TO service_role;
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert consent" ON public.cookie_consents FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "users see own consents" ON public.cookie_consents FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "users insert own consents" ON public.cookie_consents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "users update own consents" ON public.cookie_consents FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_cookie_consents_updated BEFORE UPDATE ON public.cookie_consents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6.7 Fonction anonymisation
CREATE OR REPLACE FUNCTION public.anonymize_user_data(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hash text;
BEGIN
  IF NOT (public.is_admin_or_coordinator(auth.uid()) OR auth.uid() = _user_id) THEN
    RAISE EXCEPTION 'Not authorized to anonymize this user';
  END IF;
  _hash := encode(digest(_user_id::text, 'sha256'), 'hex');

  UPDATE public.profiles SET
    full_name = 'Utilisateur supprimé',
    email = 'deleted-' || left(_hash, 12) || '@anonymized.local',
    phone = NULL,
    bio = NULL,
    linkedin_url = NULL,
    avatar_url = NULL,
    organization = NULL,
    position = NULL,
    department = NULL,
    job_title = NULL,
    is_anonymized = true,
    updated_at = now()
  WHERE user_id = _user_id;

  UPDATE public.hr_employees SET
    is_anonymized = true,
    updated_at = now()
  WHERE user_id = _user_id;

  -- Détache des conversations et channels
  DELETE FROM public.conversation_participants WHERE user_id = _user_id;
  DELETE FROM public.channel_members WHERE user_id = _user_id;

  -- Anonymise les messages mais conserve l'historique
  UPDATE public.channel_messages SET content = '[Message supprimé — utilisateur anonymisé]' WHERE sender_id = _user_id;
  UPDATE public.messages SET content = '[Message supprimé — utilisateur anonymisé]' WHERE sender_id = _user_id;

  -- Marque la demande de suppression comme complétée
  UPDATE public.account_deletion_requests SET status = 'completed', completed_at = now() WHERE user_id = _user_id AND status = 'scheduled';
END;
$$;

-- 6.8 Storage RLS sur bucket gdpr-exports
CREATE POLICY "users read own gdpr export"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'gdpr-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "service write gdpr export"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gdpr-exports' AND (storage.foldername(name))[1] = auth.uid()::text);
