ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS approval_threshold_xof numeric DEFAULT 500000;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'hr_expense_status' AND e.enumlabel = 'approved_l1'
  ) THEN
    ALTER TYPE public.hr_expense_status ADD VALUE 'approved_l1' BEFORE 'approved';
  END IF;
END $$;

ALTER TABLE public.hr_expense_reports
  ADD COLUMN IF NOT EXISTS second_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS second_reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS second_approval_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS second_approval_requested_at timestamptz;

ALTER TABLE public.hr_expense_reports
  DROP CONSTRAINT IF EXISTS hr_expense_distinct_approvers;
ALTER TABLE public.hr_expense_reports
  ADD CONSTRAINT hr_expense_distinct_approvers
  CHECK (second_reviewed_by IS NULL OR reviewed_by IS NULL OR second_reviewed_by <> reviewed_by);

CREATE OR REPLACE FUNCTION public.hr_expense_flag_second_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _threshold numeric;
BEGIN
  SELECT COALESCE(MIN(approval_threshold_xof), 500000) INTO _threshold FROM public.org_settings;
  IF NEW.total_amount IS NOT NULL AND NEW.total_amount >= _threshold THEN
    NEW.second_approval_required := true;
  ELSE
    NEW.second_approval_required := false;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_hr_expense_flag_second_approval ON public.hr_expense_reports;
CREATE TRIGGER trg_hr_expense_flag_second_approval
BEFORE INSERT OR UPDATE OF total_amount, status ON public.hr_expense_reports
FOR EACH ROW EXECUTE FUNCTION public.hr_expense_flag_second_approval();

CREATE OR REPLACE FUNCTION public.notify_expense_second_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved_l1'::public.hr_expense_status
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.second_approval_requested_at := now();
    INSERT INTO public.notifications (user_id, title, content, type, link)
    SELECT ur.user_id, '⚠️ Validation N+2 requise',
           'Note de frais "' || COALESCE(NEW.title,'') || '" (' || COALESCE(NEW.total_amount,0)::text || ' XOF) en attente de 2e approbation.',
           'expense', '/app/hr'
    FROM public.user_roles ur
    WHERE ur.role IN ('super_admin','coordinator')
      AND ur.user_id <> COALESCE(NEW.reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid);
    PERFORM public.emit_domain_event(
      'expense.second_approval_requested', 'hr_expense_report', NEW.id,
      jsonb_build_object('amount', NEW.total_amount, 'reviewed_by', NEW.reviewed_by)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_expense_second_approval ON public.hr_expense_reports;
CREATE TRIGGER trg_notify_expense_second_approval
BEFORE UPDATE OF status ON public.hr_expense_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_expense_second_approval();