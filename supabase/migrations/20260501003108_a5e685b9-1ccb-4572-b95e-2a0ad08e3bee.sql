CREATE TABLE IF NOT EXISTS public.domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  webhook_dispatched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_domain_events_name_time ON public.domain_events(event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate ON public.domain_events(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_unprocessed ON public.domain_events(occurred_at) WHERE processed_at IS NULL;

ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read domain events" ON public.domain_events;
CREATE POLICY "Admins read domain events" ON public.domain_events
  FOR SELECT TO authenticated USING (public.is_admin_or_coordinator(auth.uid()));

CREATE OR REPLACE FUNCTION public.emit_domain_event(
  _event_name TEXT, _aggregate_type TEXT, _aggregate_id UUID, _payload JSONB DEFAULT '{}'::jsonb
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  INSERT INTO public.domain_events (event_name, aggregate_type, aggregate_id, payload, actor_user_id)
  VALUES (_event_name, _aggregate_type, _aggregate_id, COALESCE(_payload, '{}'::jsonb), auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.emit_domain_event(TEXT,TEXT,UUID,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emit_domain_event(TEXT,TEXT,UUID,JSONB) TO authenticated, service_role;

-- Triggers ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_emit_project_events()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.emit_domain_event('project.created','project',NEW.id,
      jsonb_build_object('name',NEW.name,'status',NEW.status,'program_id',NEW.program_id));
  ELSIF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.emit_domain_event('project.status_changed','project',NEW.id,
      jsonb_build_object('from',OLD.status,'to',NEW.status,'name',NEW.name));
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_project_events ON public.projects;
CREATE TRIGGER trg_emit_project_events AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_project_events();

CREATE OR REPLACE FUNCTION public.tg_emit_grant_events()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM public.emit_domain_event('grant.created','grant',NEW.id,
      jsonb_build_object('name',NEW.name,'amount_total',NEW.amount_total,'project_id',NEW.project_id));
  ELSIF TG_OP='UPDATE' AND COALESCE(OLD.amount_disbursed,0) IS DISTINCT FROM COALESCE(NEW.amount_disbursed,0) THEN
    PERFORM public.emit_domain_event('grant.disbursed','grant',NEW.id,
      jsonb_build_object('amount_disbursed',NEW.amount_disbursed,'amount_total',NEW.amount_total,
        'delta',COALESCE(NEW.amount_disbursed,0)-COALESCE(OLD.amount_disbursed,0)));
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_grant_events ON public.grants;
CREATE TRIGGER trg_emit_grant_events AFTER INSERT OR UPDATE ON public.grants
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_grant_events();

CREATE OR REPLACE FUNCTION public.tg_emit_payroll_events()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status='validated' THEN
      PERFORM public.emit_domain_event('payroll.validated','payroll_run',NEW.id,
        jsonb_build_object('mois',NEW.mois,'annee',NEW.annee));
    ELSIF NEW.status='closed' THEN
      PERFORM public.emit_domain_event('payroll.closed','payroll_run',NEW.id,
        jsonb_build_object('mois',NEW.mois,'annee',NEW.annee));
    END IF;
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_payroll_events ON public.hr_payroll_runs;
CREATE TRIGGER trg_emit_payroll_events AFTER UPDATE ON public.hr_payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_payroll_events();

CREATE OR REPLACE FUNCTION public.tg_emit_po_events()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status::text='approved' THEN
    PERFORM public.emit_domain_event('po.approved','purchase_order',NEW.id,
      jsonb_build_object('total',NEW.total,'project_id',NEW.project_id));
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_po_events ON public.purchase_orders;
CREATE TRIGGER trg_emit_po_events AFTER UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_po_events();

CREATE OR REPLACE FUNCTION public.tg_emit_invoice_events()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status::text='payee' THEN
    PERFORM public.emit_domain_event('invoice.paid','crm_invoice',NEW.id,
      jsonb_build_object('total',NEW.total,'project_id',NEW.project_id,'invoice_number',NEW.invoice_number));
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_invoice_events ON public.crm_invoices;
CREATE TRIGGER trg_emit_invoice_events AFTER UPDATE ON public.crm_invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_invoice_events();

CREATE OR REPLACE FUNCTION public.tg_emit_milestone_events()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status::text='completed' THEN
    PERFORM public.emit_domain_event('milestone.completed','milestone',NEW.id,
      jsonb_build_object('title',NEW.title,'project_id',NEW.project_id));
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_emit_milestone_events ON public.milestones;
CREATE TRIGGER trg_emit_milestone_events AFTER UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.tg_emit_milestone_events();

-- Vue consolidée ───────────────────────────────────
CREATE OR REPLACE VIEW public.cost_imputation_consolidated
WITH (security_invoker = on) AS
  SELECT 'payroll'::text AS source, p.project_id, p.employee_id::text AS subject_id,
    p.mois AS month, p.annee AS year, make_date(p.annee, p.mois, 1) AS occurred_on,
    (COALESCE(p.net_total,0) + COALESCE(p.employer_charges,0)) AS amount,
    'XOF'::text AS currency, p.id AS source_id
  FROM public.hr_payslips p WHERE p.project_id IS NOT NULL
  UNION ALL
  SELECT 'expense'::text, el.project_id, el.report_id::text,
    EXTRACT(MONTH FROM el.expense_date)::int, EXTRACT(YEAR FROM el.expense_date)::int,
    el.expense_date, el.amount, COALESCE(el.currency,'XOF'), el.id
  FROM public.hr_expense_lines el
  JOIN public.hr_expense_reports er ON er.id = el.report_id
  WHERE el.project_id IS NOT NULL AND er.status::text IN ('approved','reimbursed')
  UNION ALL
  SELECT 'purchase_order'::text, po.project_id, po.id::text,
    EXTRACT(MONTH FROM po.issue_date)::int, EXTRACT(YEAR FROM po.issue_date)::int,
    po.issue_date, po.total, COALESCE(po.currency,'XOF'), po.id
  FROM public.purchase_orders po
  WHERE po.project_id IS NOT NULL AND po.status::text IN ('approved','sent','received','paid')
  UNION ALL
  SELECT 'invoice'::text, ci.project_id, ci.id::text,
    EXTRACT(MONTH FROM ci.issue_date)::int, EXTRACT(YEAR FROM ci.issue_date)::int,
    ci.issue_date, ci.total, COALESCE(ci.currency,'XOF'), ci.id
  FROM public.crm_invoices ci
  WHERE ci.project_id IS NOT NULL AND ci.direction::text='recue'
    AND ci.status::text IN ('payee','payee_partiel');

CREATE OR REPLACE FUNCTION public.get_project_cost_breakdown(
  _project_id UUID, _from DATE DEFAULT NULL, _to DATE DEFAULT NULL
) RETURNS TABLE(source TEXT, total_amount NUMERIC, line_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT source, COALESCE(SUM(amount),0)::numeric, COUNT(*)::bigint
  FROM public.cost_imputation_consolidated
  WHERE project_id = _project_id
    AND (_from IS NULL OR occurred_on >= _from)
    AND (_to IS NULL OR occurred_on <= _to)
  GROUP BY source ORDER BY 2 DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.get_project_cost_breakdown(UUID,DATE,DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_cost_breakdown(UUID,DATE,DATE) TO authenticated, service_role;