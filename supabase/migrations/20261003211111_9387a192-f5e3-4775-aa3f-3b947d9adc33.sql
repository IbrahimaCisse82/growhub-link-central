CREATE UNIQUE INDEX IF NOT EXISTS uq_acc_entries_auto_source
  ON public.accounting_entries (source_type, source_id)
  WHERE source_id IS NOT NULL AND source_type IN ('crm_invoice','crm_payment','purchase_order','payroll_run');

CREATE OR REPLACE FUNCTION public.acc_guard_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'validee' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Écriture validée : retour en brouillon interdit (utilisez la contre-passation)';
    END IF;
    IF NEW.label IS DISTINCT FROM OLD.label OR NEW.entry_date IS DISTINCT FROM OLD.entry_date
       OR NEW.journal_id IS DISTINCT FROM OLD.journal_id OR NEW.piece_ref IS DISTINCT FROM OLD.piece_ref
       OR NEW.fiscal_year_id IS DISTINCT FROM OLD.fiscal_year_id OR NEW.currency IS DISTINCT FROM OLD.currency
       OR ROUND(COALESCE(NEW.total_debit,0),2) IS DISTINCT FROM ROUND(COALESCE(OLD.total_debit,0),2)
       OR ROUND(COALESCE(NEW.total_credit,0),2) IS DISTINCT FROM ROUND(COALESCE(OLD.total_credit,0),2) THEN
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
END; $function$;

CREATE OR REPLACE FUNCTION public.acc_guard_closed_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _fy uuid; _closed boolean;
BEGIN
  IF TG_TABLE_NAME = 'accounting_entries' THEN
    _fy := COALESCE(NEW.fiscal_year_id, OLD.fiscal_year_id);
    IF TG_OP = 'UPDATE' AND OLD.fiscal_year_id IS DISTINCT FROM NEW.fiscal_year_id THEN
      SELECT status = 'closed' INTO _closed FROM accounting_fiscal_years WHERE id = OLD.fiscal_year_id;
      IF _closed THEN RAISE EXCEPTION 'Exercice clôturé : opération interdite'; END IF;
    END IF;
  ELSE
    SELECT fiscal_year_id INTO _fy FROM accounting_entries WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
  END IF;
  IF _fy IS NOT NULL THEN
    SELECT status = 'closed' INTO _closed FROM accounting_fiscal_years WHERE id = _fy;
    IF _closed THEN RAISE EXCEPTION 'Exercice clôturé : opération interdite'; END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $function$;

DROP TRIGGER IF EXISTS acc_entries_closed_period ON public.accounting_entries;
CREATE TRIGGER acc_entries_closed_period BEFORE INSERT OR UPDATE OR DELETE ON public.accounting_entries
  FOR EACH ROW EXECUTE FUNCTION public.acc_guard_closed_period();
DROP TRIGGER IF EXISTS acc_lines_closed_period ON public.accounting_entry_lines;
CREATE TRIGGER acc_lines_closed_period BEFORE INSERT OR UPDATE OR DELETE ON public.accounting_entry_lines
  FOR EACH ROW EXECUTE FUNCTION public.acc_guard_closed_period();

CREATE OR REPLACE FUNCTION public.crm_payment_checks()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _d date;
BEGIN
  IF COALESCE(NEW.amount,0) <= 0 THEN RAISE EXCEPTION 'Montant du règlement invalide'; END IF;
  SELECT issue_date INTO _d FROM crm_invoices WHERE id = NEW.invoice_id;
  IF _d IS NOT NULL AND NEW.payment_date < _d THEN
    RAISE EXCEPTION 'Règlement du % antérieur à la facture du %', NEW.payment_date, _d;
  END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS crm_payments_checks ON public.crm_payments;
CREATE TRIGGER crm_payments_checks BEFORE INSERT OR UPDATE ON public.crm_payments
  FOR EACH ROW EXECUTE FUNCTION public.crm_payment_checks();

CREATE OR REPLACE FUNCTION public.acc_integrity_checks()
RETURNS TABLE(check_code text, label text, issues bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  SELECT 'unbalanced', 'Écritures déséquilibrées',
    (SELECT count(*) FROM accounting_entries WHERE ROUND(total_debit,2) <> ROUND(total_credit,2))
  UNION ALL SELECT 'drafts', 'Brouillons en attente de validation',
    (SELECT count(*) FROM accounting_entries WHERE status <> 'validee')
  UNION ALL SELECT 'out_of_fy', 'Écritures hors des dates de l''exercice',
    (SELECT count(*) FROM accounting_entries e JOIN accounting_fiscal_years f ON f.id = e.fiscal_year_id
      WHERE e.entry_date NOT BETWEEN f.start_date AND f.end_date)
  UNION ALL SELECT 'payment_before_invoice', 'Règlements antérieurs à leur facture',
    (SELECT count(*) FROM crm_payments p JOIN crm_invoices i ON i.id = p.invoice_id WHERE p.payment_date < i.issue_date)
  UNION ALL SELECT 'po_and_invoice', 'Achats possiblement comptés deux fois (bon de commande + facture fournisseur)',
    (SELECT count(*) FROM purchase_orders po JOIN crm_invoices i ON i.purchase_order_id = po.id
      WHERE EXISTS (SELECT 1 FROM accounting_entries a WHERE a.source_type='purchase_order' AND a.source_id=po.id)
        AND EXISTS (SELECT 1 FROM accounting_entries a WHERE a.source_type='crm_invoice' AND a.source_id=i.id));
END; $function$;
REVOKE ALL ON FUNCTION public.acc_integrity_checks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acc_integrity_checks() TO authenticated;