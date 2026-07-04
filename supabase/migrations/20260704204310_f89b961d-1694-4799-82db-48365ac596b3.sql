
-- Client-side error log
CREATE TABLE public.client_error_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  route TEXT,
  user_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('info','warning','error','fatal')),
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_error_log_created_at ON public.client_error_log (created_at DESC);
CREATE INDEX idx_client_error_log_severity ON public.client_error_log (severity);

GRANT SELECT, INSERT ON public.client_error_log TO authenticated;
GRANT ALL ON public.client_error_log TO service_role;

ALTER TABLE public.client_error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own errors"
ON public.client_error_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins read errors"
ON public.client_error_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator'));

-- System health snapshots
CREATE TABLE public.system_health_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_users_24h INT DEFAULT 0,
  domain_events_24h INT DEFAULT 0,
  errors_24h INT DEFAULT 0,
  emails_sent_24h INT DEFAULT 0,
  webhook_failures_24h INT DEFAULT 0,
  avg_query_ms NUMERIC(10,2),
  extra JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_system_health_captured_at ON public.system_health_snapshots (captured_at DESC);

GRANT SELECT, INSERT ON public.system_health_snapshots TO authenticated;
GRANT ALL ON public.system_health_snapshots TO service_role;

ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read snapshots"
ON public.system_health_snapshots FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator'));

CREATE POLICY "Admins insert snapshots"
ON public.system_health_snapshots FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator'));

-- Real-time health overview view
CREATE OR REPLACE VIEW public.system_health_overview
WITH (security_invoker = on) AS
SELECT
  (SELECT COUNT(*) FROM public.profiles) AS total_users,
  (SELECT COUNT(*) FROM public.profiles WHERE updated_at > now() - interval '24 hours') AS active_users_24h,
  (SELECT COUNT(*) FROM public.projects) AS total_projects,
  (SELECT COUNT(*) FROM public.domain_events WHERE occurred_at > now() - interval '24 hours') AS domain_events_24h,
  (SELECT COUNT(*) FROM public.domain_events WHERE occurred_at > now() - interval '1 hour') AS domain_events_1h,
  (SELECT COUNT(*) FROM public.client_error_log WHERE created_at > now() - interval '24 hours') AS errors_24h,
  (SELECT COUNT(*) FROM public.client_error_log WHERE created_at > now() - interval '24 hours' AND severity IN ('error','fatal')) AS critical_errors_24h,
  (SELECT COUNT(*) FROM public.email_send_log WHERE created_at > now() - interval '24 hours') AS emails_sent_24h,
  (SELECT COUNT(*) FROM public.activity_log WHERE created_at > now() - interval '24 hours') AS activity_24h,
  now() AS generated_at;

GRANT SELECT ON public.system_health_overview TO authenticated;
