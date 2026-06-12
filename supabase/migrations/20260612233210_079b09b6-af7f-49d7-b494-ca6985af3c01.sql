CREATE TABLE public.startup_investments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  round_type text NOT NULL CHECK (round_type IN ('pre_seed','seed','series_a','series_b','series_c','bridge','grant','convertible_note','safe')),
  round_name text,
  amount_xof numeric NOT NULL DEFAULT 0,
  amount_currency text NOT NULL DEFAULT 'XOF',
  pre_money_valuation_xof numeric,
  post_money_valuation_xof numeric,
  closed_at date NOT NULL DEFAULT CURRENT_DATE,
  lead_investor text,
  investors jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'closed' CHECK (status IN ('pipeline','negotiation','closed','cancelled')),
  document_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.startup_investments TO authenticated;
GRANT ALL ON public.startup_investments TO service_role;
ALTER TABLE public.startup_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage investments" ON public.startup_investments FOR ALL TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "Founders view own investments" ON public.startup_investments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.startups s WHERE s.id = startup_id AND (s.founder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.startup_members sm WHERE sm.startup_id = s.id AND sm.user_id = auth.uid()))));
CREATE INDEX idx_startup_investments_startup ON public.startup_investments(startup_id);
CREATE TRIGGER trg_startup_investments_uat BEFORE UPDATE ON public.startup_investments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cap_table_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  investment_id uuid REFERENCES public.startup_investments(id) ON DELETE SET NULL,
  holder_type text NOT NULL CHECK (holder_type IN ('founder','investor','employee','esop','advisor','other')),
  holder_name text NOT NULL,
  holder_email text,
  shares numeric NOT NULL DEFAULT 0,
  share_class text NOT NULL DEFAULT 'common' CHECK (share_class IN ('common','preferred_a','preferred_b','preferred_c','option','warrant','safe','convertible')),
  ownership_pct numeric,
  vesting_start date,
  vesting_months integer,
  cliff_months integer DEFAULT 12,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_table_entries TO authenticated;
GRANT ALL ON public.cap_table_entries TO service_role;
ALTER TABLE public.cap_table_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cap table" ON public.cap_table_entries FOR ALL TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "Founders view own cap table" ON public.cap_table_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.startups s WHERE s.id = startup_id AND (s.founder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.startup_members sm WHERE sm.startup_id = s.id AND sm.user_id = auth.uid()))));
CREATE INDEX idx_cap_table_startup ON public.cap_table_entries(startup_id);
CREATE TRIGGER trg_cap_table_uat BEFORE UPDATE ON public.cap_table_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.term_sheets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  investor_name text NOT NULL,
  amount_xof numeric NOT NULL DEFAULT 0,
  valuation_xof numeric,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','negotiation','signed','rejected','expired')),
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at date,
  expires_at date,
  signed_at date,
  document_url text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.term_sheets TO authenticated;
GRANT ALL ON public.term_sheets TO service_role;
ALTER TABLE public.term_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage term sheets" ON public.term_sheets FOR ALL TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "Founders view own term sheets" ON public.term_sheets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.startups s WHERE s.id = startup_id AND s.founder_id = auth.uid()));
CREATE INDEX idx_term_sheets_startup ON public.term_sheets(startup_id);
CREATE TRIGGER trg_term_sheets_uat BEFORE UPDATE ON public.term_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.treasury_consolidated WITH (security_invoker = on) AS
SELECT 'grant_disbursement'::text AS source, gd.id AS source_id, g.project_id, NULL::uuid AS program_id,
  'in'::text AS direction,
  COALESCE(gd.amount_received, gd.amount_approved, gd.amount_requested, 0) AS amount_xof,
  COALESCE(gd.received_at::date, gd.approved_at::date, gd.requested_at::date) AS occurred_on,
  ('Tranche subvention ' || COALESCE(g.name, ''))::text AS label,
  CASE WHEN gd.received_at IS NOT NULL THEN 'realized' ELSE 'planned' END AS status
FROM public.grant_disbursements gd
JOIN public.grants g ON g.id = gd.grant_id
WHERE COALESCE(gd.amount_received, gd.amount_approved, gd.amount_requested, 0) > 0
UNION ALL
SELECT 'invoice_in', ci.id, ci.project_id, NULL::uuid, 'in',
  COALESCE(ci.amount_paid, 0), COALESCE(ci.paid_at::date, ci.due_date, ci.issue_date),
  ('Facture émise ' || COALESCE(ci.invoice_number, '')),
  CASE WHEN ci.status::text = 'payee' THEN 'realized' WHEN ci.status::text = 'payee_partiel' THEN 'partial' ELSE 'planned' END
FROM public.crm_invoices ci WHERE ci.direction::text = 'emise'
UNION ALL
SELECT 'invoice_out', ci.id, ci.project_id, NULL::uuid, 'out',
  COALESCE(ci.total, 0), COALESCE(ci.paid_at::date, ci.due_date, ci.issue_date),
  ('Facture fournisseur ' || COALESCE(ci.invoice_number, '')),
  CASE WHEN ci.status::text = 'payee' THEN 'realized' ELSE 'planned' END
FROM public.crm_invoices ci WHERE ci.direction::text = 'recue'
UNION ALL
SELECT 'payroll', hp.id, NULL::uuid, NULL::uuid, 'out',
  COALESCE(hp.net_total, 0), make_date(hp.annee, hp.mois, 28),
  'Salaire net',
  CASE WHEN EXISTS (SELECT 1 FROM public.hr_payroll_runs r WHERE r.id = hp.payroll_run_id AND r.status = 'closed') THEN 'realized' ELSE 'planned' END
FROM public.hr_payslips hp
UNION ALL
SELECT 'purchase_order', po.id, po.project_id, NULL::uuid, 'out',
  COALESCE(po.total, 0), COALESCE(po.expected_delivery_date, po.issue_date),
  ('Bon de commande ' || COALESCE(po.po_number, '')),
  CASE WHEN po.status::text IN ('received','paid','closed') THEN 'realized' ELSE 'planned' END
FROM public.purchase_orders po WHERE po.status::text IN ('approved','sent','received','paid','closed')
UNION ALL
SELECT 'expense', er.id, NULL::uuid, NULL::uuid, 'out',
  COALESCE(er.total_amount, 0), COALESCE(er.reimbursed_at::date, er.submitted_at::date, CURRENT_DATE),
  ('Note de frais ' || COALESCE(er.title, '')),
  CASE WHEN er.status::text = 'reimbursed' THEN 'realized' ELSE 'planned' END
FROM public.hr_expense_reports er WHERE er.status::text IN ('approved','approved_l1','reimbursed');

GRANT SELECT ON public.treasury_consolidated TO authenticated;

CREATE OR REPLACE FUNCTION public.get_cashflow_summary(
  _from date DEFAULT (CURRENT_DATE - INTERVAL '6 months')::date,
  _to date DEFAULT (CURRENT_DATE + INTERVAL '6 months')::date
)
RETURNS TABLE(month_start date, inflow_xof numeric, outflow_xof numeric, net_xof numeric, cumulative_xof numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH monthly AS (
    SELECT date_trunc('month', occurred_on)::date AS m,
      SUM(CASE WHEN direction='in' THEN amount_xof ELSE 0 END) AS inflow,
      SUM(CASE WHEN direction='out' THEN amount_xof ELSE 0 END) AS outflow
    FROM public.treasury_consolidated
    WHERE occurred_on BETWEEN _from AND _to
    GROUP BY 1
  )
  SELECT m, inflow, outflow, inflow - outflow,
    SUM(inflow - outflow) OVER (ORDER BY m)
  FROM monthly ORDER BY m;
$$;

CREATE OR REPLACE FUNCTION public.recalc_cap_table_pct(_startup_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _total numeric;
BEGIN
  SELECT NULLIF(SUM(shares), 0) INTO _total FROM public.cap_table_entries WHERE startup_id = _startup_id;
  IF _total IS NULL THEN RETURN; END IF;
  UPDATE public.cap_table_entries SET ownership_pct = ROUND((shares / _total) * 100, 4)
    WHERE startup_id = _startup_id;
END; $$;

CREATE OR REPLACE FUNCTION public.tg_cap_table_recalc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_cap_table_pct(COALESCE(NEW.startup_id, OLD.startup_id));
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_cap_table_recalc
  AFTER INSERT OR UPDATE OF shares OR DELETE ON public.cap_table_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_cap_table_recalc();