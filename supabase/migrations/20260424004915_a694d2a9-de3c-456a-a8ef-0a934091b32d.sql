CREATE OR REPLACE FUNCTION public.hr_prevent_closed_period_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.hr_payroll_runs r
    WHERE r.mois = COALESCE(NEW.mois, OLD.mois)
      AND r.annee = COALESCE(NEW.annee, OLD.annee)
      AND r.status = 'closed'
  ) THEN
    RAISE EXCEPTION 'La paie de cette période est clôturée et ne peut plus être modifiée';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_closed_hr_variables_changes ON public.hr_payroll_variables;
CREATE TRIGGER prevent_closed_hr_variables_changes
BEFORE INSERT OR UPDATE OR DELETE ON public.hr_payroll_variables
FOR EACH ROW EXECUTE FUNCTION public.hr_prevent_closed_period_changes();

CREATE OR REPLACE FUNCTION public.hr_prevent_closed_payslip_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.hr_payroll_runs r
    WHERE r.id = COALESCE(NEW.payroll_run_id, OLD.payroll_run_id)
      AND r.status = 'closed'
  ) THEN
    RAISE EXCEPTION 'Les bulletins d’une paie clôturée ne peuvent plus être modifiés';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_closed_hr_payslip_changes ON public.hr_payslips;
CREATE TRIGGER prevent_closed_hr_payslip_changes
BEFORE INSERT OR UPDATE OR DELETE ON public.hr_payslips
FOR EACH ROW EXECUTE FUNCTION public.hr_prevent_closed_payslip_changes();