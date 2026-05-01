ALTER TABLE public.hr_employees
  ADD COLUMN IF NOT EXISTS default_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.hr_payslips
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.hr_expense_lines
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.hr_payroll_runs
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hr_payslips_project ON public.hr_payslips(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hr_expense_lines_project ON public.hr_expense_lines(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hr_employees_default_project ON public.hr_employees(default_project_id) WHERE default_project_id IS NOT NULL;