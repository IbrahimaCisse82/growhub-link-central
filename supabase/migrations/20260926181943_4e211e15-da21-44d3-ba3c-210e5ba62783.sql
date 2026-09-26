revoke execute on function public.acc_guard_entry() from public, anon, authenticated;
revoke execute on function public.acc_guard_lines() from public, anon, authenticated;
revoke execute on function public.acc_recalc_entry_totals() from public, anon, authenticated;

create or replace function public.acc_auto_po_entry() returns trigger
language plpgsql security definer set search_path = public as $$
declare e uuid; j uuid; fy uuid; ht numeric; tva numeric; ttc numeric;
begin
  if new.status <> 'recu' or coalesce(new.is_demo,false) then return new; end if;
  if tg_op='UPDATE' and old.status = 'recu' then return new; end if;
  if new.invoice_id is not null then return new; end if;
  if exists (select 1 from accounting_entries where source_type='purchase_order' and source_id=new.id) then return new; end if;
  fy := acc_open_fy(coalesce(new.received_at::date, current_date));
  if fy is null then return new; end if;
  ttc := coalesce(new.total,0); tva := coalesce(new.tax_amount,0); ht := ttc - tva;
  if ttc <= 0 then return new; end if;
  select id into j from accounting_journals where code='AC';
  insert into accounting_entries(entry_date, fiscal_year_id, journal_id, label, piece_ref, project_id, grant_id, source_type, source_id, status, currency, created_by)
  values (coalesce(new.received_at::date, current_date), fy, j, 'Réception bon de commande ' || new.po_number, new.po_number,
          new.project_id, new.grant_id, 'purchase_order', new.id, 'draft', 'XOF', new.created_by)
  returning id into e;
  insert into accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,project_id) values
    (e,1,'604',ht,0,'Achats (compte à préciser)',new.project_id);
  if tva > 0 then insert into accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label) values (e,2,'4452',tva,0,'TVA récupérable'); end if;
  insert into accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,third_party_id,project_id) values
    (e,3,'408',0,ttc,'Fournisseur, facture non parvenue',new.supplier_id,new.project_id);
  return new;
end $$;
revoke execute on function public.acc_auto_po_entry() from public, anon, authenticated;
drop trigger if exists trg_acc_auto_po on public.purchase_orders;
create trigger trg_acc_auto_po after insert or update of status on public.purchase_orders
for each row execute function public.acc_auto_po_entry();