CREATE OR REPLACE FUNCTION public.acc_close_checks(_fy uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH f AS (SELECT start_date, end_date FROM accounting_fiscal_years WHERE id=_fy)
  SELECT jsonb_build_object(
    'drafts', (SELECT count(*) FROM accounting_entries e, f WHERE e.status='draft' AND (e.fiscal_year_id=_fy OR e.entry_date BETWEEN f.start_date AND f.end_date)),
    'debit', (SELECT coalesce(sum(l.debit),0) FROM accounting_entry_lines l JOIN accounting_entries e ON e.id=l.entry_id WHERE e.fiscal_year_id=_fy AND e.status='validee'),
    'credit', (SELECT coalesce(sum(l.credit),0) FROM accounting_entry_lines l JOIN accounting_entries e ON e.id=l.entry_id WHERE e.fiscal_year_id=_fy AND e.status='validee'),
    'suspense', (SELECT coalesce(sum(l.debit-l.credit),0) FROM accounting_entry_lines l JOIN accounting_entries e ON e.id=l.entry_id WHERE e.fiscal_year_id=_fy AND e.status='validee' AND l.account_code LIKE '47%' AND l.account_code NOT LIKE '476%' AND l.account_code NOT LIKE '477%' AND l.account_code NOT LIKE '478%' AND l.account_code NOT LIKE '479%'),
    'result', (SELECT coalesce(sum(l.credit-l.debit),0) FROM accounting_entry_lines l JOIN accounting_entries e ON e.id=l.entry_id WHERE e.fiscal_year_id=_fy AND e.status='validee' AND left(l.account_code,1) IN ('6','7','8')),
    'depreciation_done', EXISTS (SELECT 1 FROM accounting_depreciations WHERE fiscal_year_id=_fy) OR NOT EXISTS (SELECT 1 FROM accounting_fixed_assets WHERE status='actif' AND method<>'non_amortissable'),
    'unreconciled', (SELECT count(*) FROM treasury_movements m, f WHERE m.movement_date BETWEEN f.start_date AND f.end_date AND NOT m.reconciled),
    'vat_missing', (SELECT count(*) FROM f, generate_series(f.start_date, f.end_date, interval '1 month') g WHERE g <= now() AND NOT EXISTS (SELECT 1 FROM vat_returns v WHERE v.period=g::date))
  ) WHERE can_view_accounting(auth.uid());
$function$;