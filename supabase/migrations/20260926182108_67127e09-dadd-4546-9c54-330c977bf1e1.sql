do $$
declare f text; d text; m text[][] := array[['''411''','''4111'''],['''706''','''7061'''],['''401''','''4011'''],['''408''','''4081'''],['''604''','''6041'''],['''521''','''5211'''],['''571''','''5711'''],['''431''','''4311''']];
i int;
begin
  foreach f in array array['acc_auto_invoice_entry','acc_auto_payment_entry','acc_auto_payroll_entry','acc_auto_po_entry'] loop
    d := pg_get_functiondef(('public.'||f)::regproc);
    for i in 1..array_length(m,1) loop d := replace(d, m[i][1], m[i][2]); end loop;
    execute d;
  end loop;
end $$;
revoke execute on function public.acc_auto_invoice_entry(), public.acc_auto_payment_entry(), public.acc_auto_payroll_entry(), public.acc_auto_po_entry() from public, anon, authenticated;