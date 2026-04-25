-- ─────────── Conventions collectives & catégories salariales ───────────
CREATE TABLE IF NOT EXISTS public.hr_collective_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  secteur TEXT,
  date_signature DATE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_salary_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.hr_collective_agreements(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  statut TEXT NOT NULL,
  salaire_minima NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agreement_id, code)
);

ALTER TABLE public.hr_collective_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_salary_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR read agreements" ON public.hr_collective_agreements
  FOR SELECT USING (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "HR write agreements" ON public.hr_collective_agreements
  FOR ALL USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "HR read categories" ON public.hr_salary_categories
  FOR SELECT USING (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "HR write categories" ON public.hr_salary_categories
  FOR ALL USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE TRIGGER trg_hr_agreements_updated BEFORE UPDATE ON public.hr_collective_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hr_categories_updated BEFORE UPDATE ON public.hr_salary_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────── Audit trail RH (réutilise activity_log) ───────────
-- On déclenche le log existant sur les tables RH sensibles
DROP TRIGGER IF EXISTS trg_hr_employees_audit ON public.hr_employees;
CREATE TRIGGER trg_hr_employees_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.hr_employees
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_hr_payroll_runs_audit ON public.hr_payroll_runs;
CREATE TRIGGER trg_hr_payroll_runs_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.hr_payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_hr_payslips_audit ON public.hr_payslips;
CREATE TRIGGER trg_hr_payslips_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.hr_payslips
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_hr_contracts_audit ON public.hr_contracts;
CREATE TRIGGER trg_hr_contracts_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.hr_contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_hr_leave_requests_audit ON public.hr_leave_requests;
CREATE TRIGGER trg_hr_leave_requests_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.hr_leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();