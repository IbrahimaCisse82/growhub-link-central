
CREATE TABLE public.accounting_fiscal_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closed_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.accounting_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  account_class smallint NOT NULL,
  parent_code text,
  level smallint NOT NULL DEFAULT 1,
  nature text NOT NULL DEFAULT 'autre',
  is_detail boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acc_accounts_class ON public.accounting_accounts(account_class);
CREATE INDEX idx_acc_accounts_parent ON public.accounting_accounts(parent_code);

CREATE TABLE public.accounting_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  journal_type text NOT NULL DEFAULT 'od',
  counterpart_account text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id uuid REFERENCES public.accounting_fiscal_years(id) ON DELETE SET NULL,
  journal_id uuid REFERENCES public.accounting_journals(id) ON DELETE SET NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  piece_ref text,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'brouillon',
  currency text NOT NULL DEFAULT 'XOF',
  total_debit numeric NOT NULL DEFAULT 0,
  total_credit numeric NOT NULL DEFAULT 0,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  grant_id uuid REFERENCES public.grants(id) ON DELETE SET NULL,
  source_type text,
  source_id uuid,
  notes text,
  created_by uuid,
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acc_entries_date ON public.accounting_entries(entry_date);
CREATE INDEX idx_acc_entries_fy ON public.accounting_entries(fiscal_year_id);

CREATE TABLE public.accounting_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.accounting_entries(id) ON DELETE CASCADE,
  line_no integer NOT NULL DEFAULT 1,
  account_code text NOT NULL,
  label text,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  third_party_id uuid REFERENCES public.crm_contreparties(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  analytic_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acc_lines_entry ON public.accounting_entry_lines(entry_id);
CREATE INDEX idx_acc_lines_account ON public.accounting_entry_lines(account_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_fiscal_years TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_journals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_entry_lines TO authenticated;
GRANT ALL ON public.accounting_fiscal_years TO service_role;
GRANT ALL ON public.accounting_accounts TO service_role;
GRANT ALL ON public.accounting_journals TO service_role;
GRANT ALL ON public.accounting_entries TO service_role;
GRANT ALL ON public.accounting_entry_lines TO service_role;

ALTER TABLE public.accounting_fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_accounting(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin_or_coordinator(_user_id)
      OR public.has_role(_user_id, 'staff'::app_role);
$$;
REVOKE ALL ON FUNCTION public.can_view_accounting(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_accounting(uuid) TO authenticated, service_role;

CREATE POLICY "acc_fy_read" ON public.accounting_fiscal_years FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()));
CREATE POLICY "acc_fy_write" ON public.accounting_fiscal_years FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "acc_accounts_read" ON public.accounting_accounts FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()));
CREATE POLICY "acc_accounts_write" ON public.accounting_accounts FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "acc_journals_read" ON public.accounting_journals FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()));
CREATE POLICY "acc_journals_write" ON public.accounting_journals FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "acc_entries_read" ON public.accounting_entries FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()));
CREATE POLICY "acc_entries_write" ON public.accounting_entries FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "acc_lines_read" ON public.accounting_entry_lines FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()));
CREATE POLICY "acc_lines_write" ON public.accounting_entry_lines FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE OR REPLACE FUNCTION public.acc_recalc_entry_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _entry uuid;
BEGIN
  _entry := COALESCE(NEW.entry_id, OLD.entry_id);
  UPDATE public.accounting_entries e
     SET total_debit = COALESCE((SELECT SUM(debit) FROM public.accounting_entry_lines WHERE entry_id = _entry), 0),
         total_credit = COALESCE((SELECT SUM(credit) FROM public.accounting_entry_lines WHERE entry_id = _entry), 0),
         updated_at = now()
   WHERE e.id = _entry;
  RETURN NULL;
END;
$$;
CREATE TRIGGER tg_acc_recalc_totals
AFTER INSERT OR UPDATE OR DELETE ON public.accounting_entry_lines
FOR EACH ROW EXECUTE FUNCTION public.acc_recalc_entry_totals();

CREATE OR REPLACE FUNCTION public.acc_guard_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'validee' AND NEW.status = 'validee' THEN
    IF NEW.label IS DISTINCT FROM OLD.label OR NEW.entry_date IS DISTINCT FROM OLD.entry_date
       OR NEW.journal_id IS DISTINCT FROM OLD.journal_id THEN
      RAISE EXCEPTION 'Écriture validée : modification interdite';
    END IF;
  END IF;
  IF NEW.status = 'validee' AND (TG_OP = 'INSERT' OR OLD.status <> 'validee') THEN
    IF ROUND(COALESCE(NEW.total_debit,0),2) <> ROUND(COALESCE(NEW.total_credit,0),2)
       OR COALESCE(NEW.total_debit,0) = 0 THEN
      RAISE EXCEPTION 'Écriture déséquilibrée : débit % <> crédit %', NEW.total_debit, NEW.total_credit;
    END IF;
    NEW.validated_at := now();
    NEW.validated_by := auth.uid();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER tg_acc_guard_entry
BEFORE INSERT OR UPDATE ON public.accounting_entries
FOR EACH ROW EXECUTE FUNCTION public.acc_guard_entry();

CREATE OR REPLACE FUNCTION public.acc_guard_lines()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _status text;
BEGIN
  SELECT status INTO _status FROM public.accounting_entries WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
  IF _status = 'validee' THEN
    RAISE EXCEPTION 'Écriture validée : lignes non modifiables';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER tg_acc_guard_lines
BEFORE INSERT OR UPDATE OR DELETE ON public.accounting_entry_lines
FOR EACH ROW EXECUTE FUNCTION public.acc_guard_lines();

CREATE TRIGGER tg_acc_fy_updated BEFORE UPDATE ON public.accounting_fiscal_years FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_acc_accounts_updated BEFORE UPDATE ON public.accounting_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_acc_journals_updated BEFORE UPDATE ON public.accounting_journals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.accounting_balance
WITH (security_invoker = on) AS
SELECT l.account_code,
       a.label AS account_label,
       a.account_class,
       e.fiscal_year_id,
       SUM(l.debit) AS total_debit,
       SUM(l.credit) AS total_credit,
       SUM(l.debit) - SUM(l.credit) AS solde
FROM public.accounting_entry_lines l
JOIN public.accounting_entries e ON e.id = l.entry_id
LEFT JOIN public.accounting_accounts a ON a.code = l.account_code
WHERE e.status = 'validee'
GROUP BY l.account_code, a.label, a.account_class, e.fiscal_year_id;

GRANT SELECT ON public.accounting_balance TO authenticated, service_role;
