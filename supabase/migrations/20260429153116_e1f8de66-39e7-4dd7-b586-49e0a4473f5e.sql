
-- Fonction utilitaire
CREATE OR REPLACE FUNCTION public.is_demo_user(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'demo_user'
  )
$$;

-- Trigger générique
CREATE OR REPLACE FUNCTION public.set_is_demo_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.is_demo := public.is_demo_user(auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.is_demo := OLD.is_demo;
  END IF;
  RETURN NEW;
END $$;

-- Application sur les tables métier
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'portfolios','programs','projects','milestones','tasks',
    'startups','cohorts','applications','grants','grant_transactions',
    'grant_disbursements','grant_activities','grant_indicators',
    'mentor_profiles','partners','events','resources','surveys',
    'survey_responses','risks','budgets','project_budget_lines',
    'project_budget_details','project_indicators','startup_kpis',
    'startup_members','coaching_sessions','coaching_notes',
    'evaluation_criteria','application_evaluations','application_rounds',
    'data_collection_forms','data_collection_responses',
    'logical_frameworks','theory_of_change','event_registrations',
    'course_enrollments','courses','course_modules',
    'crm_invoices','crm_quotes','crm_payments','crm_subscriptions',
    'crm_contreparties','purchase_orders',
    'hr_employees','hr_contracts','hr_payslips','hr_leave_requests',
    'hr_expense_reports','webhook_configs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (is_demo)',
      'idx_' || t || '_is_demo', t
    );
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_is_demo ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_set_is_demo BEFORE INSERT OR UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_is_demo_flag()',
      t
    );
    EXECUTE format('DROP POLICY IF EXISTS "demo_isolation_update" ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY "demo_isolation_update" ON public.%I
      AS RESTRICTIVE FOR UPDATE TO authenticated
      USING (
        (public.is_demo_user(auth.uid()) AND is_demo = true)
        OR (NOT public.is_demo_user(auth.uid()) AND is_demo = false)
      )
    $f$, t);
    EXECUTE format('DROP POLICY IF EXISTS "demo_isolation_delete" ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY "demo_isolation_delete" ON public.%I
      AS RESTRICTIVE FOR DELETE TO authenticated
      USING (
        (public.is_demo_user(auth.uid()) AND is_demo = true)
        OR (NOT public.is_demo_user(auth.uid()) AND is_demo = false)
      )
    $f$, t);
  END LOOP;
END $$;

-- Attribuer le rôle demo_user au compte démo
DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'demo@growhub.app' LIMIT 1;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'demo_user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
