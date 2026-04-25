-- Enum statut note de frais
DO $$ BEGIN
  CREATE TYPE public.hr_expense_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'reimbursed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table principale : notes de frais
CREATE TABLE IF NOT EXISTS public.hr_expense_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  reference text,
  title text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XOF',
  status public.hr_expense_status NOT NULL DEFAULT 'draft',
  notes text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  reimbursed_at timestamptz,
  reimbursement_mois int CHECK (reimbursement_mois BETWEEN 1 AND 12),
  reimbursement_annee int CHECK (reimbursement_annee BETWEEN 2000 AND 2100),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_expense_reports_employee ON public.hr_expense_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_expense_reports_status ON public.hr_expense_reports(status);
CREATE INDEX IF NOT EXISTS idx_hr_expense_reports_period ON public.hr_expense_reports(period_start, period_end);

-- Lignes
CREATE TABLE IF NOT EXISTS public.hr_expense_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.hr_expense_reports(id) ON DELETE CASCADE,
  expense_date date NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'XOF',
  tax_rate numeric(5,2) DEFAULT 0,
  receipt_url text,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_expense_lines_report ON public.hr_expense_lines(report_id);

-- Trigger updated_at
CREATE TRIGGER trg_hr_expense_reports_touch
  BEFORE UPDATE ON public.hr_expense_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recalcul automatique du total
CREATE OR REPLACE FUNCTION public.hr_expense_recalc_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _report_id uuid;
  _sum numeric;
BEGIN
  _report_id := COALESCE(NEW.report_id, OLD.report_id);
  SELECT COALESCE(SUM(amount), 0) INTO _sum FROM public.hr_expense_lines WHERE report_id = _report_id;
  UPDATE public.hr_expense_reports SET total_amount = _sum, updated_at = now() WHERE id = _report_id;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_hr_expense_lines_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.hr_expense_lines
  FOR EACH ROW EXECUTE FUNCTION public.hr_expense_recalc_total();

-- Empêche modification après remboursement
CREATE OR REPLACE FUNCTION public.hr_expense_prevent_locked()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _status public.hr_expense_status;
BEGIN
  SELECT status INTO _status FROM public.hr_expense_reports
    WHERE id = COALESCE(NEW.report_id, OLD.report_id);
  IF _status = 'reimbursed' THEN
    RAISE EXCEPTION 'Cette note de frais est remboursée et ne peut plus être modifiée';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_hr_expense_lines_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.hr_expense_lines
  FOR EACH ROW EXECUTE FUNCTION public.hr_expense_prevent_locked();

-- Audit
CREATE TRIGGER trg_hr_expense_reports_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.hr_expense_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- RLS
ALTER TABLE public.hr_expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_expense_lines ENABLE ROW LEVEL SECURITY;

-- Reports : employés voient/créent les leurs ; admins voient tout
CREATE POLICY "Employees view own expense reports" ON public.hr_expense_reports
  FOR SELECT TO authenticated USING (
    public.is_admin_or_coordinator(auth.uid())
    OR EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Employees create own expense reports" ON public.hr_expense_reports
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_or_coordinator(auth.uid())
    OR EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  );

CREATE POLICY "Employees update own draft, admins update all" ON public.hr_expense_reports
  FOR UPDATE TO authenticated USING (
    public.is_admin_or_coordinator(auth.uid())
    OR (
      status IN ('draft', 'rejected')
      AND EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
    )
  );

CREATE POLICY "Admins delete expense reports" ON public.hr_expense_reports
  FOR DELETE TO authenticated USING (public.is_admin_or_coordinator(auth.uid()));

-- Lines : héritent des droits du report
CREATE POLICY "View expense lines" ON public.hr_expense_lines
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.hr_expense_reports r
      LEFT JOIN public.hr_employees e ON e.id = r.employee_id
      WHERE r.id = report_id
        AND (public.is_admin_or_coordinator(auth.uid()) OR e.user_id = auth.uid())
    )
  );

CREATE POLICY "Manage expense lines on editable reports" ON public.hr_expense_lines
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.hr_expense_reports r
      LEFT JOIN public.hr_employees e ON e.id = r.employee_id
      WHERE r.id = report_id
        AND (
          public.is_admin_or_coordinator(auth.uid())
          OR (r.status IN ('draft', 'rejected') AND e.user_id = auth.uid())
        )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hr_expense_reports r
      LEFT JOIN public.hr_employees e ON e.id = r.employee_id
      WHERE r.id = report_id
        AND (
          public.is_admin_or_coordinator(auth.uid())
          OR (r.status IN ('draft', 'rejected') AND e.user_id = auth.uid())
        )
    )
  );

-- Bucket privé pour justificatifs
INSERT INTO storage.buckets (id, name, public)
VALUES ('hr-expense-receipts', 'hr-expense-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read own expense receipts" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'hr-expense-receipts' AND (
      public.is_admin_or_coordinator(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "Authenticated upload expense receipts" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'hr-expense-receipts' AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated delete own expense receipts" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'hr-expense-receipts' AND (
      public.is_admin_or_coordinator(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );