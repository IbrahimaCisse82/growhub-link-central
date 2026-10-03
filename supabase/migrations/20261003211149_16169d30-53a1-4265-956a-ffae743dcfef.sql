CREATE OR REPLACE FUNCTION public.acc_integrity_checks()
RETURNS TABLE(check_code text, label text, issues bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  SELECT 'unbalanced'::text, 'Écritures déséquilibrées'::text,
    (SELECT count(*) FROM accounting_entries WHERE ROUND(total_debit,2) <> ROUND(total_credit,2))
  UNION ALL SELECT 'drafts', 'Brouillons en attente de validation',
    (SELECT count(*) FROM accounting_entries WHERE status <> 'validee')
  UNION ALL SELECT 'out_of_fy', 'Écritures hors des dates de l''exercice',
    (SELECT count(*) FROM accounting_entries e JOIN accounting_fiscal_years f ON f.id = e.fiscal_year_id
      WHERE e.entry_date NOT BETWEEN f.start_date AND f.end_date)
  UNION ALL SELECT 'payment_before_invoice', 'Règlements antérieurs à leur facture',
    (SELECT count(*) FROM crm_payments p JOIN crm_invoices i ON i.id = p.invoice_id WHERE p.payment_date < i.issue_date)
  UNION ALL SELECT 'po_and_invoice', 'Achats possiblement comptés deux fois (bon de commande + facture fournisseur)',
    (SELECT count(*) FROM purchase_orders po JOIN crm_invoices i
       ON (i.id = po.invoice_id) OR (i.contrepartie_id = po.supplier_id AND i.total = po.total AND i.issue_date = po.issue_date)
      WHERE EXISTS (SELECT 1 FROM accounting_entries a WHERE a.source_type='purchase_order' AND a.source_id=po.id)
        AND EXISTS (SELECT 1 FROM accounting_entries a WHERE a.source_type='crm_invoice' AND a.source_id=i.id));
END; $function$;
REVOKE ALL ON FUNCTION public.acc_integrity_checks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acc_integrity_checks() TO authenticated;