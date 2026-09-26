CREATE TABLE public.accounting_fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  asset_account text NOT NULL,
  amort_account text NOT NULL,
  dotation_account text NOT NULL DEFAULT '6813',
  acquisition_date date NOT NULL,
  service_date date NOT NULL,
  cost numeric NOT NULL CHECK (cost > 0),
  residual_value numeric NOT NULL DEFAULT 0,
  duration_years numeric NOT NULL CHECK (duration_years > 0),
  method text NOT NULL DEFAULT 'lineaire' CHECK (method IN ('lineaire','non_amortissable')),
  supplier_id uuid,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  grant_id uuid REFERENCES public.grants(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'actif' CHECK (status IN ('actif','cede','rebut')),
  disposal_date date, disposal_price numeric,
  acquisition_entry_id uuid, disposal_entry_id uuid,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.accounting_depreciations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.accounting_fixed_assets(id) ON DELETE CASCADE,
  fiscal_year_id uuid NOT NULL REFERENCES public.accounting_fiscal_years(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  entry_id uuid REFERENCES public.accounting_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, fiscal_year_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_fixed_assets TO authenticated;
GRANT SELECT ON public.accounting_depreciations TO authenticated;
GRANT ALL ON public.accounting_fixed_assets, public.accounting_depreciations TO service_role;
ALTER TABLE public.accounting_fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_depreciations ENABLE ROW LEVEL SECURITY;
CREATE POLICY fa_select ON public.accounting_fixed_assets FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()));
CREATE POLICY fa_write ON public.accounting_fixed_assets FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY dep_select ON public.accounting_depreciations FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()));
CREATE TRIGGER fa_updated BEFORE UPDATE ON public.accounting_fixed_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Dotation linéaire prorata temporis (jours) pour une période
CREATE OR REPLACE FUNCTION public.acc_asset_dotation(_a public.accounting_fixed_assets, _start date, _end date)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE base numeric; s date; e date; fin date; already numeric;
BEGIN
  IF _a.method = 'non_amortissable' THEN RETURN 0; END IF;
  base := _a.cost - _a.residual_value;
  fin := (_a.service_date + (_a.duration_years * 365)::int);
  s := greatest(_start, _a.service_date);
  e := least(_end, fin - 1, coalesce(_a.disposal_date, _end));
  IF e < s THEN RETURN 0; END IF;
  SELECT coalesce(sum(amount),0) INTO already FROM accounting_depreciations d JOIN accounting_fiscal_years f ON f.id=d.fiscal_year_id
    WHERE d.asset_id=_a.id AND f.end_date < _start;
  RETURN round(least(base - already, base * ((e - s + 1)::numeric / (_a.duration_years * 365))));
END $$;

-- Écriture d'acquisition automatique (brouillon)
CREATE OR REPLACE FUNCTION public.acc_auto_asset_entry() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e uuid; fy uuid; j uuid;
BEGIN
  fy := acc_open_fy(new.acquisition_date);
  IF fy IS NULL THEN RETURN new; END IF;
  SELECT id INTO j FROM accounting_journals WHERE code='OD';
  INSERT INTO accounting_entries(entry_date,fiscal_year_id,journal_id,label,piece_ref,project_id,grant_id,source_type,source_id,status,currency,created_by)
  VALUES (new.acquisition_date,fy,j,'Acquisition immobilisation '||new.label,new.code,new.project_id,new.grant_id,'fixed_asset',new.id,'draft','XOF',new.created_by) RETURNING id INTO e;
  INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,project_id) VALUES
    (e,1,new.asset_account,new.cost,0,new.label,new.project_id),
    (e,2,'4812',0,new.cost,'Fournisseur d''immobilisations',new.project_id);
  UPDATE accounting_fixed_assets SET acquisition_entry_id=e WHERE id=new.id;
  RETURN new;
END $$;
CREATE TRIGGER fa_auto_entry AFTER INSERT ON public.accounting_fixed_assets FOR EACH ROW EXECUTE FUNCTION public.acc_auto_asset_entry();

-- Génération des dotations d'un exercice (une écriture brouillon)
CREATE OR REPLACE FUNCTION public.acc_generate_depreciation(_fy uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f accounting_fiscal_years; a accounting_fixed_assets; amt numeric; e uuid; n int := 0; j uuid;
BEGIN
  IF NOT is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO f FROM accounting_fiscal_years WHERE id=_fy;
  IF f.status='closed' THEN RAISE EXCEPTION 'Exercice clôturé'; END IF;
  SELECT id INTO j FROM accounting_journals WHERE code='OD';
  FOR a IN SELECT * FROM accounting_fixed_assets WHERE status='actif' OR disposal_date >= f.start_date LOOP
    IF EXISTS (SELECT 1 FROM accounting_depreciations WHERE asset_id=a.id AND fiscal_year_id=_fy) THEN CONTINUE; END IF;
    amt := acc_asset_dotation(a, f.start_date, f.end_date);
    IF amt <= 0 THEN CONTINUE; END IF;
    IF e IS NULL THEN
      INSERT INTO accounting_entries(entry_date,fiscal_year_id,journal_id,label,piece_ref,source_type,status,currency,created_by)
      VALUES (f.end_date,_fy,j,'Dotations aux amortissements '||f.code,'DOT-'||f.code,'depreciation','draft','XOF',auth.uid()) RETURNING id INTO e;
    END IF;
    n := n + 1;
    INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,project_id) VALUES
      (e,n*2-1,a.dotation_account,amt,0,'Dotation '||a.label,a.project_id),
      (e,n*2,a.amort_account,0,amt,'Amortissement '||a.label,a.project_id);
    INSERT INTO accounting_depreciations(asset_id,fiscal_year_id,amount,entry_id) VALUES (a.id,_fy,amt,e);
  END LOOP;
  RETURN n;
END $$;

-- Cession / mise au rebut (écriture brouillon)
CREATE OR REPLACE FUNCTION public.acc_dispose_asset(_id uuid, _date date, _price numeric) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a accounting_fixed_assets; fy uuid; j uuid; e uuid; cum numeric; vnc numeric; f accounting_fiscal_years; extra numeric;
BEGIN
  IF NOT is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO a FROM accounting_fixed_assets WHERE id=_id;
  IF a.status <> 'actif' THEN RAISE EXCEPTION 'Immobilisation déjà sortie'; END IF;
  fy := acc_open_fy(_date); SELECT * INTO f FROM accounting_fiscal_years WHERE id=fy;
  SELECT coalesce(sum(amount),0) INTO cum FROM accounting_depreciations WHERE asset_id=a.id AND fiscal_year_id<>fy;
  a.disposal_date := _date;
  extra := CASE WHEN EXISTS(SELECT 1 FROM accounting_depreciations WHERE asset_id=a.id AND fiscal_year_id=fy)
    THEN (SELECT amount FROM accounting_depreciations WHERE asset_id=a.id AND fiscal_year_id=fy) ELSE acc_asset_dotation(a, f.start_date, _date) END;
  cum := cum + extra; vnc := a.cost - cum;
  SELECT id INTO j FROM accounting_journals WHERE code='OD';
  INSERT INTO accounting_entries(entry_date,fiscal_year_id,journal_id,label,piece_ref,source_type,source_id,status,currency,created_by,project_id)
  VALUES (_date,fy,j,'Sortie immobilisation '||a.label,a.code,'fixed_asset_disposal',a.id,'draft','XOF',auth.uid(),a.project_id) RETURNING id INTO e;
  INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label) VALUES (e,1,a.amort_account,cum,0,'Annulation amortissements cumulés');
  IF vnc > 0 THEN INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label) VALUES (e,2,CASE WHEN a.asset_account LIKE '21%' THEN '811' ELSE '812' END,vnc,0,'Valeur comptable de cession'); END IF;
  INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label) VALUES (e,3,a.asset_account,0,a.cost,'Sortie du bien');
  IF coalesce(_price,0) > 0 THEN
    INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label) VALUES (e,4,'4852',_price,0,'Créance sur cession'),(e,5,'822',0,_price,'Produit de cession');
  END IF;
  IF extra > 0 AND NOT EXISTS(SELECT 1 FROM accounting_depreciations WHERE asset_id=a.id AND fiscal_year_id=fy) THEN
    INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label) VALUES (e,6,a.dotation_account,extra,0,'Dotation complémentaire'),(e,7,a.amort_account,0,extra,'Amortissement complémentaire');
    INSERT INTO accounting_depreciations(asset_id,fiscal_year_id,amount,entry_id) VALUES (a.id,fy,extra,e);
  END IF;
  UPDATE accounting_fixed_assets SET status=CASE WHEN coalesce(_price,0)>0 THEN 'cede' ELSE 'rebut' END, disposal_date=_date, disposal_price=_price, disposal_entry_id=e WHERE id=_id;
  RETURN e;
END $$;
REVOKE ALL ON FUNCTION public.acc_auto_asset_entry() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.acc_generate_depreciation(uuid), public.acc_dispose_asset(uuid,date,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acc_generate_depreciation(uuid), public.acc_dispose_asset(uuid,date,numeric) TO authenticated;