
-- Add suspended status & last_active to profiles for full user lifecycle
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- Track invitation resend history
CREATE TABLE IF NOT EXISTS public.invitation_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  sent_by uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  reminder_type text NOT NULL DEFAULT 'manual'
);

ALTER TABLE public.invitation_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view reminders"
ON public.invitation_reminders FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator'));

CREATE POLICY "Admins insert reminders"
ON public.invitation_reminders FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator'));

CREATE INDEX IF NOT EXISTS idx_inv_reminders_invitation ON public.invitation_reminders(invitation_id);
