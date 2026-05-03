ALTER TABLE public.webhook_configs ADD COLUMN IF NOT EXISTS secret text;
ALTER TABLE public.webhook_configs ADD COLUMN IF NOT EXISTS last_dispatch_at timestamptz;
ALTER TABLE public.webhook_configs ADD COLUMN IF NOT EXISTS last_dispatch_status text;