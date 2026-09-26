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
      VALUES (f.end_date,_fy,j,'Dotations aux amortissements '||f.label,'DOT-'||to_char(f.end_date,'YYYY'),'depreciation','draft','XOF',auth.uid()) RETURNING id INTO e;
    END IF;
    n := n + 1;
    INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,project_id) VALUES
      (e,n*2-1,a.dotation_account,amt,0,'Dotation '||a.label,a.project_id),
      (e,n*2,a.amort_account,0,amt,'Amortissement '||a.label,a.project_id);
    INSERT INTO accounting_depreciations(asset_id,fiscal_year_id,amount,entry_id) VALUES (a.id,_fy,amt,e);
  END LOOP;
  RETURN n;
END $$;