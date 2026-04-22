-- Table d'historique des relances de facture
CREATE TABLE IF NOT EXISTS public.invoice_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.crm_invoices(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'standard', -- standard | ferme | mise_en_demeure
  channel TEXT NOT NULL DEFAULT 'email', -- email | manuel | sms
  subject TEXT,
  message TEXT,
  recipient_email TEXT,
  sent_by UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice ON public.invoice_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_sent_at ON public.invoice_reminders(sent_at DESC);

ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read reminders"
  ON public.invoice_reminders FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins/coordinators can insert reminders"
  ON public.invoice_reminders FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Admins/coordinators can delete reminders"
  ON public.invoice_reminders FOR DELETE
  TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid()));

-- Compteurs sur la facture
ALTER TABLE public.crm_invoices
  ADD COLUMN IF NOT EXISTS reminder_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;

-- Trigger pour incrémenter compteurs
CREATE OR REPLACE FUNCTION public.crm_bump_reminder_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.crm_invoices
    SET reminder_count = COALESCE(reminder_count, 0) + 1,
        last_reminder_at = NEW.sent_at,
        last_reminder_sent_at = NEW.sent_at,
        updated_at = now()
    WHERE id = NEW.invoice_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_invoice_reminders_bump ON public.invoice_reminders;
CREATE TRIGGER trg_invoice_reminders_bump
AFTER INSERT ON public.invoice_reminders
FOR EACH ROW EXECUTE FUNCTION public.crm_bump_reminder_counters();