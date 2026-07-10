
-- API KEYS
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL UNIQUE,
  key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['read']::text[],
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON public.api_keys(key_prefix) WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their api keys" ON public.api_keys
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_coordinator(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin_or_coordinator(auth.uid()));

CREATE TRIGGER trg_api_keys_updated BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WEBHOOK DELIVERIES
CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id uuid REFERENCES public.webhook_configs(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.domain_events(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  status text NOT NULL,
  http_status integer,
  response_body text,
  duration_ms integer,
  error text,
  delivered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_deliveries_cfg ON public.webhook_deliveries(webhook_config_id, delivered_at DESC);
CREATE INDEX idx_webhook_deliveries_event ON public.webhook_deliveries(event_id);

GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read webhook deliveries" ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Service role writes deliveries" ON public.webhook_deliveries
  FOR INSERT TO service_role WITH CHECK (true);

-- Verify api key: returns user_id + scopes if valid
CREATE OR REPLACE FUNCTION public.verify_api_key(_prefix text, _hash text)
RETURNS TABLE(api_key_id uuid, user_id uuid, scopes text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, user_id, scopes
  FROM public.api_keys
  WHERE key_prefix = _prefix
    AND key_hash = _hash
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.log_api_key_usage(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.api_keys SET last_used_at = now() WHERE id = _id;
$$;
