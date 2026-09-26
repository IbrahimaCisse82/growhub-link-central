CREATE OR REPLACE FUNCTION public.acc_auto_payroll_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e uuid; j uuid; fy uuid; d date; ret numeric;
BEGIN
  IF NEW.status <> 'validated' OR OLD.status = 'validated' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_entries WHERE source_type='payroll_run' AND source_id=NEW.id) THEN RETURN NEW; END IF;
  d := (make_date(NEW.annee, NEW.mois, 1) + interval '1 month - 1 day')::date;
  fy := public.acc_open_fy(d);
  IF fy IS NULL OR COALESCE(NEW.total_brut,0) <= 0 THEN RETURN NEW; END IF;
  ret := GREATEST(NEW.total_brut - NEW.total_net, 0);
  SELECT id INTO j FROM public.accounting_journals WHERE code='PA';
  INSERT INTO public.accounting_entries(entry_date, fiscal_year_id, journal_id, label, piece_ref, source_type, source_id, status, currency, created_by)
  VALUES (d, fy, j, 'Paie ' || lpad(NEW.mois::text,2,'0') || '/' || NEW.annee, 'PAIE-' || NEW.annee || lpad(NEW.mois::text,2,'0'), 'payroll_run', NEW.id, 'draft', 'XOF', NEW.validated_by)
  RETURNING id INTO e;
  INSERT INTO public.accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label) VALUES
    (e,1,'6611',NEW.total_brut,0,'Salaires bruts'),
    (e,2,'422',0,NEW.total_net,'Salaires nets à payer');
  IF ret > 0 THEN INSERT INTO public.accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label) VALUES (e,3,'431',0,ret,'Retenues salariales (IPRES, CSS, IR à ventiler vers 447)'); END IF;
  IF COALESCE(NEW.total_charges,0) > 0 THEN
    INSERT INTO public.accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label) VALUES
      (e,4,'6641',NEW.total_charges,0,'Charges patronales'),
      (e,5,'431',0,NEW.total_charges,'Organismes sociaux — part patronale');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.acc_auto_payroll_entry() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_acc_auto_payroll AFTER UPDATE OF status ON public.hr_payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.acc_auto_payroll_entry();