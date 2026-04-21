ALTER TABLE public.crm_invoices
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_to_email TEXT;