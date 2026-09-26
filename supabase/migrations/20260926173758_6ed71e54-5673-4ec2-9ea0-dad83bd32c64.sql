CREATE OR REPLACE FUNCTION public.acc_open_fy(_d date)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.accounting_fiscal_years WHERE _d BETWEEN start_date AND end_date AND status = 'open' ORDER BY start_date LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.acc_open_fy(date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.acc_auto_invoice_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e uuid; j uuid; fy uuid; ht numeric; tva numeric; ttc numeric;
BEGIN
  IF NEW.status IN ('brouillon','annulee') OR COALESCE(NEW.is_demo,false) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status NOT IN ('brouillon') THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_entries WHERE source_type='crm_invoice' AND source_id=NEW.id) THEN RETURN NEW; END IF;
  fy := public.acc_open_fy(NEW.issue_date);
  IF fy IS NULL THEN RETURN NEW; END IF;
  ttc := COALESCE(NEW.total,0) * COALESCE(NEW.exchange_rate,1);
  tva := COALESCE(NEW.tax_amount,0) * COALESCE(NEW.exchange_rate,1);
  ht := ttc - tva;
  IF ttc <= 0 THEN RETURN NEW; END IF;
  SELECT id INTO j FROM public.accounting_journals WHERE code = CASE WHEN NEW.direction='emise' THEN 'VE' ELSE 'AC' END;
  INSERT INTO public.accounting_entries(entry_date, fiscal_year_id, journal_id, label, piece_ref, project_id, grant_id, source_type, source_id, status, currency, created_by)
  VALUES (NEW.issue_date, fy, j, CASE WHEN NEW.direction='emise' THEN 'Facture client ' ELSE 'Facture fournisseur ' END || NEW.invoice_number,
          NEW.invoice_number, NEW.project_id, NEW.grant_id, 'crm_invoice', NEW.id, 'draft', 'XOF', NEW.created_by)
  RETURNING id INTO e;
  IF NEW.direction = 'emise' THEN
    INSERT INTO public.accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,third_party_id,project_id) VALUES
      (e,1,'411',ttc,0,'Client',NEW.contrepartie_id,NEW.project_id),
      (e,2,'706',0,ht,'Prestations de services',NULL,NEW.project_id);
    IF tva > 0 THEN INSERT INTO public.accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label) VALUES (e,3,'4431',0,tva,'TVA facturée'); END IF;
  ELSE
    INSERT INTO public.accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,third_party_id,project_id) VALUES
      (e,1,'604',ht,0,'Achats (compte à préciser)',NULL,NEW.project_id),
      (e,3,'401',0,ttc,'Fournisseur',NEW.contrepartie_id,NEW.project_id);
    IF tva > 0 THEN INSERT INTO public.accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label) VALUES (e,2,'4452',tva,0,'TVA récupérable'); END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.acc_auto_invoice_entry() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_acc_auto_invoice AFTER INSERT OR UPDATE OF status ON public.crm_invoices
  FOR EACH ROW EXECUTE FUNCTION public.acc_auto_invoice_entry();

CREATE OR REPLACE FUNCTION public.acc_auto_payment_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.crm_invoices; e uuid; j uuid; fy uuid; amt numeric;
BEGIN
  IF COALESCE(NEW.is_demo,false) THEN RETURN NEW; END IF;
  SELECT * INTO inv FROM public.crm_invoices WHERE id = NEW.invoice_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  fy := public.acc_open_fy(NEW.payment_date);
  IF fy IS NULL THEN RETURN NEW; END IF;
  amt := NEW.amount * COALESCE(inv.exchange_rate,1);
  IF amt <= 0 THEN RETURN NEW; END IF;
  SELECT id INTO j FROM public.accounting_journals WHERE code = CASE WHEN NEW.payment_method IN ('especes','cash','caisse') THEN 'CA' ELSE 'BQ' END;
  INSERT INTO public.accounting_entries(entry_date, fiscal_year_id, journal_id, label, piece_ref, project_id, grant_id, source_type, source_id, status, currency, created_by)
  VALUES (NEW.payment_date, fy, j, 'Règlement ' || inv.invoice_number, COALESCE(NEW.reference, inv.invoice_number), inv.project_id, inv.grant_id, 'crm_payment', NEW.id, 'draft', 'XOF', NEW.recorded_by)
  RETURNING id INTO e;
  IF inv.direction = 'emise' THEN
    INSERT INTO public.accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,third_party_id) VALUES
      (e,1,CASE WHEN NEW.payment_method IN ('especes','cash','caisse') THEN '571' ELSE '521' END,amt,0,'Encaissement',NULL),
      (e,2,'411',0,amt,'Client',inv.contrepartie_id);
  ELSE
    INSERT INTO public.accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,third_party_id) VALUES
      (e,1,'401',amt,0,'Fournisseur',inv.contrepartie_id),
      (e,2,CASE WHEN NEW.payment_method IN ('especes','cash','caisse') THEN '571' ELSE '521' END,0,amt,'Décaissement',NULL);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.acc_auto_payment_entry() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_acc_auto_payment AFTER INSERT ON public.crm_payments
  FOR EACH ROW EXECUTE FUNCTION public.acc_auto_payment_entry();