REVOKE ALL ON FUNCTION public.acc_prevent_duplicate_piece(), public.crm_prevent_overpayment(), public.treasury_guard_movement(), public.acc_prevent_validated_delete() FROM PUBLIC, anon, authenticated;

-- Intérêts séparés sur un décaissement (échéance d'emprunt)
ALTER TABLE public.treasury_movements ADD COLUMN IF NOT EXISTS interest_amount numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS interest_account text;
ALTER TABLE public.crm_contreparties ADD COLUMN IF NOT EXISTS is_related_party boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS related_kind text;

CREATE TABLE public.establishments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL, kind text NOT NULL DEFAULT 'secondaire' CHECK (kind IN ('siege','principal','secondaire')), city text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.accounting_entries ADD COLUMN IF NOT EXISTS establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL;

CREATE TABLE public.shareholders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, kind text NOT NULL DEFAULT 'personne_morale', shares integer NOT NULL DEFAULT 0 CHECK (shares >= 0), nominal numeric NOT NULL DEFAULT 10000, paid_amount numeric NOT NULL DEFAULT 0, is_related_party boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.acc_loans (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), label text NOT NULL, lender text NOT NULL, treasury_account_id uuid NOT NULL REFERENCES public.treasury_accounts(id), principal numeric NOT NULL CHECK (principal > 0), annual_rate numeric NOT NULL DEFAULT 0 CHECK (annual_rate >= 0), start_date date NOT NULL, duration_months integer NOT NULL CHECK (duration_months > 0), loan_account text NOT NULL DEFAULT '162', interest_account text NOT NULL DEFAULT '6712', status text NOT NULL DEFAULT 'en_cours', created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.acc_loan_schedule (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), loan_id uuid NOT NULL REFERENCES public.acc_loans(id) ON DELETE CASCADE, due_no integer NOT NULL, due_date date NOT NULL, principal numeric NOT NULL, interest numeric NOT NULL, remaining numeric NOT NULL, movement_id uuid REFERENCES public.treasury_movements(id) ON DELETE SET NULL, paid_at date, UNIQUE (loan_id, due_no));

CREATE TABLE public.acc_accruals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK (kind IN ('cca','pca','fnp','fae')), label text NOT NULL, amount numeric NOT NULL CHECK (amount > 0), account_code text NOT NULL, entry_date date NOT NULL, third_party_id uuid REFERENCES public.crm_contreparties(id) ON DELETE SET NULL, entry_id uuid, reversal_entry_id uuid, created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.acc_provisions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK (kind IN ('client','stock','risque','autre')), movement text NOT NULL CHECK (movement IN ('dotation','reprise')), label text NOT NULL, amount numeric NOT NULL CHECK (amount > 0), provision_account text NOT NULL, pl_account text NOT NULL, entry_date date NOT NULL, third_party_id uuid REFERENCES public.crm_contreparties(id) ON DELETE SET NULL, entry_id uuid, created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.exchange_rates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), currency text NOT NULL, rate_date date NOT NULL, rate numeric NOT NULL CHECK (rate > 0), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (currency, rate_date));

CREATE TABLE public.stock_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, label text NOT NULL, unit text NOT NULL DEFAULT 'u', stock_account text NOT NULL DEFAULT '311', variation_account text NOT NULL DEFAULT '6031', is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.stock_moves (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE, move_date date NOT NULL DEFAULT current_date, kind text NOT NULL CHECK (kind IN ('entree','sortie','inventaire')), quantity numeric NOT NULL, unit_cost numeric NOT NULL DEFAULT 0, reference text, establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL, created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.vat_returns (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), period date NOT NULL UNIQUE, collected numeric NOT NULL DEFAULT 0, deductible numeric NOT NULL DEFAULT 0, credit_previous numeric NOT NULL DEFAULT 0, due numeric NOT NULL DEFAULT 0, credit_next numeric NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','deposee','payee')), entry_id uuid, created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.bank_statement_lines (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), treasury_account_id uuid NOT NULL REFERENCES public.treasury_accounts(id) ON DELETE CASCADE, line_date date NOT NULL, label text NOT NULL, amount numeric NOT NULL, reference text, matched_movement_id uuid REFERENCES public.treasury_movements(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now());

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['establishments','shareholders','acc_loans','acc_loan_schedule','acc_accruals','acc_provisions','exchange_rates','stock_items','stock_moves','vat_returns','bank_statement_lines'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()))', t||'_sel', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()))', t||'_wr', t);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_activity()', 'log_'||t, t);
  END LOOP;
END $$;
CREATE INDEX ON public.acc_loan_schedule(loan_id); CREATE INDEX ON public.stock_moves(item_id); CREATE INDEX ON public.bank_statement_lines(treasury_account_id);

-- helper : crée une écriture brouillon à partir de lignes jsonb [{a,d,c,l}]
CREATE OR REPLACE FUNCTION public.acc_make_entry(_date date, _journal text, _label text, _piece text, _source text, _source_id uuid, _lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fy uuid; e uuid; l jsonb; i int := 0;
BEGIN
  fy := acc_open_fy(_date);
  IF fy IS NULL THEN RAISE EXCEPTION 'Aucun exercice ouvert au %', _date; END IF;
  INSERT INTO accounting_entries(entry_date,fiscal_year_id,journal_id,label,piece_ref,source_type,source_id,status,currency,created_by)
  VALUES (_date,fy,(SELECT id FROM accounting_journals WHERE code=_journal),_label,_piece,_source,_source_id,'draft','XOF',auth.uid()) RETURNING id INTO e;
  FOR l IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    IF coalesce((l->>'d')::numeric,0)=0 AND coalesce((l->>'c')::numeric,0)=0 THEN CONTINUE; END IF;
    i := i+1;
    INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,third_party_id)
    VALUES (e,i,l->>'a',round(coalesce((l->>'d')::numeric,0),2),round(coalesce((l->>'c')::numeric,0),2),coalesce(l->>'l',_label),nullif(l->>'t','')::uuid);
  END LOOP;
  RETURN e;
END $$;

-- trésorerie : prise en compte des intérêts
CREATE OR REPLACE FUNCTION public.treasury_auto_entry() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ta treasury_accounts; tb treasury_accounts; inv crm_invoices; fy uuid; j uuid; e uuid; p uuid; princ numeric;
BEGIN
  SELECT * INTO ta FROM treasury_accounts WHERE id = new.treasury_account_id;
  IF new.invoice_id IS NOT NULL THEN
    SELECT * INTO inv FROM crm_invoices WHERE id = new.invoice_id;
    INSERT INTO crm_payments(invoice_id,amount,currency,payment_date,payment_method,reference,notes,recorded_by)
    VALUES (new.invoice_id,new.amount,coalesce(inv.currency,'XOF'),new.movement_date,
            CASE WHEN ta.kind='caisse' THEN 'especes' ELSE new.method END,new.reference,new.label,new.created_by)
    RETURNING id INTO p;
    SELECT id INTO e FROM accounting_entries WHERE source_type='crm_payment' AND source_id=p;
    IF e IS NOT NULL THEN
      UPDATE accounting_entry_lines SET account_code = ta.account_code WHERE entry_id=e AND account_code IN ('5211','5711');
      IF ta.kind <> 'caisse' THEN UPDATE accounting_entries SET journal_id=(SELECT id FROM accounting_journals WHERE code='BQ') WHERE id=e; END IF;
    END IF;
    UPDATE treasury_movements SET payment_id=p, entry_id=e WHERE id=new.id;
    RETURN new;
  END IF;
  fy := acc_open_fy(new.movement_date);
  IF fy IS NULL THEN RAISE EXCEPTION 'Aucun exercice ouvert au %', new.movement_date; END IF;
  SELECT id INTO j FROM accounting_journals WHERE code = CASE WHEN ta.kind='caisse' THEN 'CA' ELSE 'BQ' END;
  INSERT INTO accounting_entries(entry_date,fiscal_year_id,journal_id,label,piece_ref,project_id,grant_id,source_type,source_id,status,currency,created_by)
  VALUES (new.movement_date,fy,j,new.label,coalesce(new.reference,'TR-'||left(new.id::text,8)),new.project_id,new.grant_id,'treasury_movement',new.id,'draft','XOF',new.created_by)
  RETURNING id INTO e;
  princ := new.amount - coalesce(new.interest_amount,0);
  IF new.direction='encaissement' THEN
    INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,third_party_id,project_id) VALUES
      (e,1,ta.account_code,new.amount,0,new.label,NULL,new.project_id),
      (e,2,new.counterpart_account,0,new.amount,new.label,new.third_party_id,new.project_id);
  ELSIF new.direction='decaissement' THEN
    INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,third_party_id,project_id) VALUES
      (e,1,new.counterpart_account,princ,0,new.label,new.third_party_id,new.project_id),
      (e,2,ta.account_code,0,new.amount,new.label,NULL,new.project_id);
    IF coalesce(new.interest_amount,0) > 0 THEN
      INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,project_id) VALUES (e,3,coalesce(new.interest_account,'6712'),new.interest_amount,0,'Intérêts',new.project_id);
    END IF;
  ELSE
    SELECT * INTO tb FROM treasury_accounts WHERE id = new.target_account_id;
    INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label) VALUES
      (e,1,'585',new.amount,0,'Virement de fonds vers '||tb.name),
      (e,2,ta.account_code,0,new.amount,'Sortie '||ta.name),
      (e,3,tb.account_code,new.amount,0,'Entrée '||tb.name),
      (e,4,'585',0,new.amount,'Virement de fonds depuis '||ta.name);
  END IF;
  UPDATE treasury_movements SET entry_id=e WHERE id=new.id;
  RETURN new;
END $$;

-- EMPRUNTS : réception des fonds + échéancier (annuités constantes)
CREATE OR REPLACE FUNCTION public.acc_loan_after_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r numeric := new.annual_rate/100/12; ann numeric; rem numeric := new.principal; i int; intr numeric; pr numeric;
BEGIN
  ann := CASE WHEN r = 0 THEN new.principal / new.duration_months ELSE new.principal * r / (1 - power(1 + r, -new.duration_months)) END;
  FOR i IN 1..new.duration_months LOOP
    intr := round(rem * r); pr := CASE WHEN i = new.duration_months THEN rem ELSE round(ann - intr) END;
    rem := rem - pr;
    INSERT INTO acc_loan_schedule(loan_id,due_no,due_date,principal,interest,remaining) VALUES (new.id,i,(new.start_date + make_interval(months => i))::date,pr,intr,rem);
  END LOOP;
  INSERT INTO treasury_movements(direction,category,label,amount,method,treasury_account_id,counterpart_account,movement_date,reference,created_by)
  VALUES ('encaissement','emprunt','Emprunt reçu — '||new.label,new.principal,'virement',new.treasury_account_id,new.loan_account,new.start_date,'EMP-'||left(new.id::text,8),new.created_by);
  RETURN new;
END $$;
CREATE TRIGGER acc_loans_ai AFTER INSERT ON public.acc_loans FOR EACH ROW EXECUTE FUNCTION public.acc_loan_after_insert();

CREATE OR REPLACE FUNCTION public.acc_pay_loan_installment(_id uuid, _date date DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s acc_loan_schedule; l acc_loans; m uuid;
BEGIN
  IF NOT is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO s FROM acc_loan_schedule WHERE id=_id; IF s.movement_id IS NOT NULL THEN RAISE EXCEPTION 'Échéance déjà payée'; END IF;
  SELECT * INTO l FROM acc_loans WHERE id=s.loan_id;
  INSERT INTO treasury_movements(direction,category,label,amount,interest_amount,interest_account,method,treasury_account_id,counterpart_account,movement_date,reference)
  VALUES ('decaissement','emprunt_remb','Échéance '||s.due_no||' — '||l.label,s.principal+s.interest,s.interest,l.interest_account,'prelevement',l.treasury_account_id,l.loan_account,coalesce(_date,s.due_date),'EMP-'||left(l.id::text,8)||'-'||s.due_no)
  RETURNING id INTO m;
  UPDATE acc_loan_schedule SET movement_id=m, paid_at=coalesce(_date,s.due_date) WHERE id=_id;
  IF NOT EXISTS (SELECT 1 FROM acc_loan_schedule WHERE loan_id=l.id AND movement_id IS NULL) THEN UPDATE acc_loans SET status='rembourse' WHERE id=l.id; END IF;
  RETURN m;
END $$;

-- RÉGULARISATIONS
CREATE OR REPLACE FUNCTION public.acc_accrual_entry() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e uuid; t text := coalesce(new.third_party_id::text,'');
BEGIN
  e := acc_make_entry(new.entry_date,'OD','Régularisation '||upper(new.kind)||' — '||new.label,'REG-'||left(new.id::text,8),'accrual',new.id,
    CASE new.kind
      WHEN 'cca' THEN jsonb_build_array(jsonb_build_object('a','476','d',new.amount), jsonb_build_object('a',new.account_code,'c',new.amount))
      WHEN 'pca' THEN jsonb_build_array(jsonb_build_object('a',new.account_code,'d',new.amount), jsonb_build_object('a','477','c',new.amount))
      WHEN 'fnp' THEN jsonb_build_array(jsonb_build_object('a',new.account_code,'d',new.amount), jsonb_build_object('a','4081','c',new.amount,'t',t))
      ELSE jsonb_build_array(jsonb_build_object('a','4181','d',new.amount,'t',t), jsonb_build_object('a',new.account_code,'c',new.amount)) END);
  UPDATE acc_accruals SET entry_id=e WHERE id=new.id;
  RETURN new;
END $$;
CREATE TRIGGER acc_accruals_ai AFTER INSERT ON public.acc_accruals FOR EACH ROW EXECUTE FUNCTION public.acc_accrual_entry();

CREATE OR REPLACE FUNCTION public.acc_reverse_accruals(_next_fy uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f accounting_fiscal_years; a acc_accruals; e uuid; n int := 0;
BEGIN
  IF NOT is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO f FROM accounting_fiscal_years WHERE id=_next_fy;
  FOR a IN SELECT * FROM acc_accruals WHERE reversal_entry_id IS NULL AND entry_date < f.start_date LOOP
    e := acc_make_entry(f.start_date,'OD','Extourne '||upper(a.kind)||' — '||a.label,'EXT-'||left(a.id::text,8),'accrual_reversal',a.id,
      (SELECT jsonb_agg(jsonb_build_object('a',account_code,'d',credit,'c',debit,'t',coalesce(third_party_id::text,''))) FROM accounting_entry_lines WHERE entry_id=a.entry_id));
    UPDATE acc_accruals SET reversal_entry_id=e WHERE id=a.id; n := n+1;
  END LOOP;
  RETURN n;
END $$;

-- PROVISIONS
CREATE OR REPLACE FUNCTION public.acc_provision_entry() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e uuid;
BEGIN
  e := acc_make_entry(new.entry_date,'OD',initcap(new.movement)||' provision — '||new.label,'PROV-'||left(new.id::text,8),'provision',new.id,
    CASE WHEN new.movement='dotation'
      THEN jsonb_build_array(jsonb_build_object('a',new.pl_account,'d',new.amount), jsonb_build_object('a',new.provision_account,'c',new.amount))
      ELSE jsonb_build_array(jsonb_build_object('a',new.provision_account,'d',new.amount), jsonb_build_object('a',new.pl_account,'c',new.amount)) END);
  UPDATE acc_provisions SET entry_id=e WHERE id=new.id;
  RETURN new;
END $$;
CREATE TRIGGER acc_provisions_ai AFTER INSERT ON public.acc_provisions FOR EACH ROW EXECUTE FUNCTION public.acc_provision_entry();

-- AFFECTATION DU RÉSULTAT / DIVIDENDES
CREATE OR REPLACE FUNCTION public.acc_allocate_result(_date date, _result numeric, _legal_reserve numeric, _other_reserves numeric, _dividends numeric, _retained numeric) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF round(_legal_reserve + _other_reserves + _dividends + _retained, 2) <> round(_result, 2) THEN RAISE EXCEPTION 'La répartition (%) doit égaler le résultat (%)', _legal_reserve + _other_reserves + _dividends + _retained, _result; END IF;
  IF _result >= 0 THEN
    RETURN acc_make_entry(_date,'OD','Affectation du résultat','AFF-'||to_char(_date,'YYYY'),'allocation',NULL, jsonb_build_array(
      jsonb_build_object('a','131','d',_result), jsonb_build_object('a','111','c',_legal_reserve), jsonb_build_object('a','118','c',_other_reserves),
      jsonb_build_object('a','465','c',_dividends), jsonb_build_object('a','121','c',_retained)));
  ELSE
    RETURN acc_make_entry(_date,'OD','Affectation de la perte','AFF-'||to_char(_date,'YYYY'),'allocation',NULL, jsonb_build_array(
      jsonb_build_object('a','129','d',-_result), jsonb_build_object('a','139','c',-_result)));
  END IF;
END $$;

-- ÉCARTS DE CHANGE (factures en devises non soldées)
CREATE OR REPLACE FUNCTION public.acc_fx_revaluation(_date date, _currency text, _rate numeric) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i crm_invoices; diff numeric; n int := 0; rem numeric;
BEGIN
  IF NOT is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  FOR i IN SELECT * FROM crm_invoices WHERE currency=_currency AND status NOT IN ('brouillon','annulee','payee') AND coalesce(exchange_rate,1) <> _rate LOOP
    rem := coalesce(i.total,0) - coalesce(i.amount_paid,0);
    diff := round(rem * (_rate - coalesce(i.exchange_rate,1)));
    IF diff = 0 THEN CONTINUE; END IF;
    PERFORM acc_make_entry(_date,'OD','Écart de conversion '||i.invoice_number,'ECV-'||i.invoice_number,'fx_revaluation',i.id,
      CASE WHEN i.direction='emise' THEN
        CASE WHEN diff > 0 THEN jsonb_build_array(jsonb_build_object('a','4111','d',diff,'t',i.contrepartie_id), jsonb_build_object('a','47911','c',diff))
             ELSE jsonb_build_array(jsonb_build_object('a','47811','d',-diff), jsonb_build_object('a','4111','c',-diff,'t',i.contrepartie_id)) END
      ELSE
        CASE WHEN diff > 0 THEN jsonb_build_array(jsonb_build_object('a','47831','d',diff), jsonb_build_object('a','4011','c',diff,'t',i.contrepartie_id))
             ELSE jsonb_build_array(jsonb_build_object('a','4011','d',-diff,'t',i.contrepartie_id), jsonb_build_object('a','47931','c',-diff)) END
      END);
    n := n+1;
  END LOOP;
  INSERT INTO exchange_rates(currency,rate_date,rate) VALUES (_currency,_date,_rate) ON CONFLICT (currency,rate_date) DO UPDATE SET rate=excluded.rate;
  RETURN n;
END $$;

-- STOCKS : valeur au CMUP et variation de clôture
CREATE OR REPLACE VIEW public.stock_valuation WITH (security_invoker = true) AS
WITH mv AS (
  SELECT m.*, sum(CASE WHEN kind='entree' THEN quantity WHEN kind='sortie' THEN -quantity ELSE 0 END) OVER w AS qty_run
  FROM stock_moves m WINDOW w AS (PARTITION BY item_id ORDER BY move_date, created_at)
)
SELECT i.id AS item_id, i.code, i.label, i.unit, i.stock_account, i.variation_account,
  coalesce(sum(CASE WHEN m.kind='entree' THEN m.quantity WHEN m.kind='sortie' THEN -m.quantity ELSE 0 END),0) AS quantity,
  CASE WHEN coalesce(sum(CASE WHEN m.kind='entree' THEN m.quantity END),0) > 0
    THEN sum(CASE WHEN m.kind='entree' THEN m.quantity*m.unit_cost END) / sum(CASE WHEN m.kind='entree' THEN m.quantity END) ELSE 0 END AS cmup
FROM stock_items i LEFT JOIN stock_moves m ON m.item_id=i.id
GROUP BY i.id;
GRANT SELECT ON public.stock_valuation TO authenticated;

CREATE OR REPLACE FUNCTION public.acc_stock_variation(_date date) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; book numeric; val numeric; diff numeric; n int := 0;
BEGIN
  IF NOT is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  FOR r IN SELECT stock_account, variation_account, round(sum(quantity*cmup)) v FROM stock_valuation GROUP BY 1,2 LOOP
    SELECT coalesce(sum(l.debit-l.credit),0) INTO book FROM accounting_entry_lines l JOIN accounting_entries e ON e.id=l.entry_id
      WHERE l.account_code=r.stock_account AND e.status<>'annulee' AND e.entry_date <= _date;
    diff := r.v - book;
    IF diff = 0 THEN CONTINUE; END IF;
    PERFORM acc_make_entry(_date,'OD','Variation de stock '||r.stock_account,'STK-'||r.stock_account||'-'||to_char(_date,'YYYY'),'stock_variation',NULL,
      CASE WHEN diff > 0 THEN jsonb_build_array(jsonb_build_object('a',r.stock_account,'d',diff), jsonb_build_object('a',r.variation_account,'c',diff))
           ELSE jsonb_build_array(jsonb_build_object('a',r.variation_account,'d',-diff), jsonb_build_object('a',r.stock_account,'c',-diff)) END);
    n := n+1;
  END LOOP;
  RETURN n;
END $$;

-- TVA mensuelle
CREATE OR REPLACE FUNCTION public.acc_vat_compute(_period date) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s date := date_trunc('month',_period)::date; f date; col numeric; ded numeric; prev numeric; net numeric; id_ uuid;
BEGIN
  IF NOT is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  f := (s + interval '1 month - 1 day')::date;
  SELECT coalesce(sum(CASE WHEN l.account_code LIKE '443%' THEN l.credit-l.debit END),0), coalesce(sum(CASE WHEN l.account_code LIKE '445%' THEN l.debit-l.credit END),0)
    INTO col, ded FROM accounting_entry_lines l JOIN accounting_entries e ON e.id=l.entry_id
    WHERE e.status='validee' AND e.entry_date BETWEEN s AND f AND coalesce(e.source_type,'') <> 'vat_return';
  SELECT coalesce(credit_next,0) INTO prev FROM vat_returns WHERE period < s ORDER BY period DESC LIMIT 1;
  net := col - ded - coalesce(prev,0);
  INSERT INTO vat_returns(period,collected,deductible,credit_previous,due,credit_next)
  VALUES (s,col,ded,coalesce(prev,0),greatest(net,0),greatest(-net,0))
  ON CONFLICT (period) DO UPDATE SET collected=excluded.collected, deductible=excluded.deductible, credit_previous=excluded.credit_previous, due=excluded.due, credit_next=excluded.credit_next, updated_at=now()
  WHERE vat_returns.status='brouillon'
  RETURNING id INTO id_;
  IF id_ IS NULL THEN RAISE EXCEPTION 'Déclaration déjà déposée pour cette période'; END IF;
  RETURN id_;
END $$;

CREATE OR REPLACE FUNCTION public.acc_vat_post(_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v vat_returns; e uuid; f date;
BEGIN
  IF NOT is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO v FROM vat_returns WHERE id=_id; IF v.entry_id IS NOT NULL THEN RAISE EXCEPTION 'Déjà comptabilisée'; END IF;
  f := (v.period + interval '1 month - 1 day')::date;
  e := acc_make_entry(f,'OD','Déclaration TVA '||to_char(v.period,'MM/YYYY'),'TVA-'||to_char(v.period,'YYYYMM'),'vat_return',v.id, jsonb_build_array(
    jsonb_build_object('a','4431','d',v.collected), jsonb_build_object('a','4452','c',v.deductible),
    jsonb_build_object('a','4449','d',v.credit_next), jsonb_build_object('a','4449','c',v.credit_previous),
    jsonb_build_object('a','4441','c',v.due)));
  UPDATE vat_returns SET entry_id=e, status='deposee' WHERE id=_id;
  RETURN e;
END $$;

-- CONTRÔLES DE CLÔTURE
CREATE OR REPLACE FUNCTION public.acc_close_checks(_fy uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'drafts', (SELECT count(*) FROM accounting_entries WHERE fiscal_year_id=_fy AND status='draft'),
    'debit', (SELECT coalesce(sum(l.debit),0) FROM accounting_entry_lines l JOIN accounting_entries e ON e.id=l.entry_id WHERE e.fiscal_year_id=_fy AND e.status='validee'),
    'credit', (SELECT coalesce(sum(l.credit),0) FROM accounting_entry_lines l JOIN accounting_entries e ON e.id=l.entry_id WHERE e.fiscal_year_id=_fy AND e.status='validee'),
    'suspense', (SELECT coalesce(sum(l.debit-l.credit),0) FROM accounting_entry_lines l JOIN accounting_entries e ON e.id=l.entry_id WHERE e.fiscal_year_id=_fy AND e.status='validee' AND l.account_code LIKE '47%' AND l.account_code NOT LIKE '476%' AND l.account_code NOT LIKE '477%' AND l.account_code NOT LIKE '478%' AND l.account_code NOT LIKE '479%'),
    'result', (SELECT coalesce(sum(l.credit-l.debit),0) FROM accounting_entry_lines l JOIN accounting_entries e ON e.id=l.entry_id WHERE e.fiscal_year_id=_fy AND e.status='validee' AND left(l.account_code,1) IN ('6','7','8')),
    'depreciation_done', EXISTS (SELECT 1 FROM accounting_depreciations WHERE fiscal_year_id=_fy) OR NOT EXISTS (SELECT 1 FROM accounting_fixed_assets WHERE status='actif' AND method<>'non_amortissable'),
    'unreconciled', (SELECT count(*) FROM treasury_movements m JOIN accounting_fiscal_years f ON f.id=_fy WHERE m.movement_date BETWEEN f.start_date AND f.end_date AND NOT m.reconciled),
    'vat_missing', (SELECT count(*) FROM generate_series((SELECT start_date FROM accounting_fiscal_years WHERE id=_fy),(SELECT end_date FROM accounting_fiscal_years WHERE id=_fy),interval '1 month') g WHERE g <= now() AND NOT EXISTS (SELECT 1 FROM vat_returns v WHERE v.period=g::date))
  ) WHERE can_view_accounting(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.acc_make_entry(date,text,text,text,text,uuid,jsonb), public.acc_loan_after_insert(), public.acc_accrual_entry(), public.acc_provision_entry() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.acc_pay_loan_installment(uuid,date), public.acc_reverse_accruals(uuid), public.acc_allocate_result(date,numeric,numeric,numeric,numeric,numeric), public.acc_fx_revaluation(date,text,numeric), public.acc_stock_variation(date), public.acc_vat_compute(date), public.acc_vat_post(uuid), public.acc_close_checks(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acc_pay_loan_installment(uuid,date), public.acc_reverse_accruals(uuid), public.acc_allocate_result(date,numeric,numeric,numeric,numeric,numeric), public.acc_fx_revaluation(date,text,numeric), public.acc_stock_variation(date), public.acc_vat_compute(date), public.acc_vat_post(uuid), public.acc_close_checks(uuid) TO authenticated;