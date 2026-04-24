DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_payroll_run_status') THEN
    CREATE TYPE public.hr_payroll_run_status AS ENUM ('draft', 'calculated', 'validated', 'closed', 'cancelled');
  END IF;
END $$;

ALTER TABLE public.hr_employees
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_hr_employees_user_id ON public.hr_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_archived_at ON public.hr_employees(archived_at);

ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "HR admins can manage employees" ON public.hr_employees;
DROP POLICY IF EXISTS "Employees can view own HR record" ON public.hr_employees;
CREATE POLICY "HR admins can manage employees"
ON public.hr_employees
FOR ALL
TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()))
WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "Employees can view own HR record"
ON public.hr_employees
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.hr_payroll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Paramètres paie Sénégal',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_payroll_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "HR admins can manage payroll settings" ON public.hr_payroll_settings;
CREATE POLICY "HR admins can manage payroll settings"
ON public.hr_payroll_settings
FOR ALL
TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()))
WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hr_collective_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sector TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_collective_agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "HR admins can manage collective agreements" ON public.hr_collective_agreements;
CREATE POLICY "HR admins can manage collective agreements"
ON public.hr_collective_agreements
FOR ALL
TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()))
WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hr_salary_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID REFERENCES public.hr_collective_agreements(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  minimum_salary NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (agreement_id, code)
);
ALTER TABLE public.hr_salary_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "HR admins can manage salary categories" ON public.hr_salary_categories;
CREATE POLICY "HR admins can manage salary categories"
ON public.hr_salary_categories
FOR ALL
TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()))
WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hr_payroll_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  mois INTEGER NOT NULL,
  annee INTEGER NOT NULL,
  hs_115 NUMERIC NOT NULL DEFAULT 0,
  hs_140 NUMERIC NOT NULL DEFAULT 0,
  hs_160 NUMERIC NOT NULL DEFAULT 0,
  hs_200 NUMERIC NOT NULL DEFAULT 0,
  heures_absence NUMERIC NOT NULL DEFAULT 0,
  heures_abs_maladie NUMERIC NOT NULL DEFAULT 0,
  taux_maladie NUMERIC NOT NULL DEFAULT 0,
  nb_paniers NUMERIC NOT NULL DEFAULT 0,
  avance_tabaski NUMERIC NOT NULL DEFAULT 0,
  avance_caisse NUMERIC NOT NULL DEFAULT 0,
  avance_financiere NUMERIC NOT NULL DEFAULT 0,
  ret_cooperative NUMERIC NOT NULL DEFAULT 0,
  frais_medicaux NUMERIC NOT NULL DEFAULT 0,
  ind_kilometrique NUMERIC NOT NULL DEFAULT 0,
  primes_exceptionnelles NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, mois, annee)
);
ALTER TABLE public.hr_payroll_variables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "HR admins can manage payroll variables" ON public.hr_payroll_variables;
CREATE POLICY "HR admins can manage payroll variables"
ON public.hr_payroll_variables
FOR ALL
TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()))
WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hr_payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mois INTEGER NOT NULL,
  annee INTEGER NOT NULL,
  status public.hr_payroll_run_status NOT NULL DEFAULT 'draft',
  settings_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_brut NUMERIC NOT NULL DEFAULT 0,
  total_net NUMERIC NOT NULL DEFAULT 0,
  total_charges NUMERIC NOT NULL DEFAULT 0,
  total_masse NUMERIC NOT NULL DEFAULT 0,
  nb_employes INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE,
  validated_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID,
  closed_by UUID,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mois, annee)
);
ALTER TABLE public.hr_payroll_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "HR admins can manage payroll runs" ON public.hr_payroll_runs;
CREATE POLICY "HR admins can manage payroll runs"
ON public.hr_payroll_runs
FOR ALL
TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()))
WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE TABLE IF NOT EXISTS public.hr_payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.hr_payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE RESTRICT,
  mois INTEGER NOT NULL,
  annee INTEGER NOT NULL,
  reference TEXT NOT NULL,
  employee_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  variables_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  gross_total NUMERIC NOT NULL DEFAULT 0,
  net_total NUMERIC NOT NULL DEFAULT 0,
  employer_charges NUMERIC NOT NULL DEFAULT 0,
  pdf_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(payroll_run_id, employee_id)
);
ALTER TABLE public.hr_payslips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "HR admins can manage payslips" ON public.hr_payslips;
DROP POLICY IF EXISTS "Employees can view own payslips" ON public.hr_payslips;
CREATE POLICY "HR admins can manage payslips"
ON public.hr_payslips
FOR ALL
TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()))
WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "Employees can view own payslips"
ON public.hr_payslips
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.id = employee_id AND e.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_hr_payroll_variables_period ON public.hr_payroll_variables(annee, mois);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_period ON public.hr_payroll_runs(annee, mois);
CREATE INDEX IF NOT EXISTS idx_hr_payslips_period ON public.hr_payslips(annee, mois);
CREATE INDEX IF NOT EXISTS idx_hr_payslips_employee ON public.hr_payslips(employee_id);

DROP TRIGGER IF EXISTS update_hr_payroll_settings_updated_at ON public.hr_payroll_settings;
CREATE TRIGGER update_hr_payroll_settings_updated_at BEFORE UPDATE ON public.hr_payroll_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_hr_collective_agreements_updated_at ON public.hr_collective_agreements;
CREATE TRIGGER update_hr_collective_agreements_updated_at BEFORE UPDATE ON public.hr_collective_agreements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_hr_salary_categories_updated_at ON public.hr_salary_categories;
CREATE TRIGGER update_hr_salary_categories_updated_at BEFORE UPDATE ON public.hr_salary_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_hr_payroll_variables_updated_at ON public.hr_payroll_variables;
CREATE TRIGGER update_hr_payroll_variables_updated_at BEFORE UPDATE ON public.hr_payroll_variables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_hr_payroll_runs_updated_at ON public.hr_payroll_runs;
CREATE TRIGGER update_hr_payroll_runs_updated_at BEFORE UPDATE ON public.hr_payroll_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_hr_payslips_updated_at ON public.hr_payslips;
CREATE TRIGGER update_hr_payslips_updated_at BEFORE UPDATE ON public.hr_payslips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();