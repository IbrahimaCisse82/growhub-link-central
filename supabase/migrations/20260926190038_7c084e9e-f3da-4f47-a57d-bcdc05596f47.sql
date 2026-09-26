CREATE TABLE public.treasury_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'banque' CHECK (kind IN ('banque','caisse','mobile_money','autre')),
  account_code text NOT NULL,
  bank_name text, iban text,
  currency text NOT NULL DEFAULT 'XOF',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.treasury_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_date date NOT NULL DEFAULT current_date,
  direction text NOT NULL CHECK (direction IN ('encaissement','decaissement','virement')),
  category text NOT NULL,
  label text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'virement' CHECK (method IN ('especes','virement','cheque','mobile_money','carte','prelevement','autre')),
  treasury_account_id uuid NOT NULL REFERENCES public.treasury_accounts(id),
  target_account_id uuid REFERENCES public.treasury_accounts(id),
  counterpart_account text,
  third_party_id uuid REFERENCES public.crm_contreparties(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.crm_invoices(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  grant_id uuid REFERENCES public.grants(id) ON DELETE SET NULL,
  reference text,
  reconciled boolean NOT NULL DEFAULT false,
  reconciled_at timestamptz,
  entry_id uuid, payment_id uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (direction <> 'virement' OR (target_account_id IS NOT NULL AND target_account_id <> treasury_account_id)),
  CHECK (direction = 'virement' OR invoice_id IS NOT NULL OR counterpart_account IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasury_accounts, public.treasury_movements TO authenticated;
GRANT ALL ON public.treasury_accounts, public.treasury_movements TO service_role;
ALTER TABLE public.treasury_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ta_select ON public.treasury_accounts FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()));
CREATE POLICY ta_write ON public.treasury_accounts FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY tm_select ON public.treasury_movements FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()));
CREATE POLICY tm_write ON public.treasury_movements FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE TRIGGER ta_updated BEFORE UPDATE ON public.treasury_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tm_updated BEFORE UPDATE ON public.treasury_movements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.treasury_accounts(name,kind,account_code) VALUES
 ('Banque principale','banque','5211'),('Caisse siège','caisse','5711'),('Mobile money (Wave / Orange Money)','mobile_money','552');

-- Écriture automatique à l'enregistrement d'un règlement
CREATE OR REPLACE FUNCTION public.treasury_auto_entry() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ta treasury_accounts; tb treasury_accounts; inv crm_invoices; fy uuid; j uuid; e uuid; p uuid;
BEGIN
  SELECT * INTO ta FROM treasury_accounts WHERE id = new.treasury_account_id;
  -- Règlement d'une facture : passe par les paiements CRM (statut facture + écriture existants)
  IF new.invoice_id IS NOT NULL THEN
    SELECT * INTO inv FROM crm_invoices WHERE id = new.invoice_id;
    INSERT INTO crm_payments(invoice_id,amount,currency,payment_date,payment_method,reference,notes,recorded_by)
    VALUES (new.invoice_id,new.amount,coalesce(inv.currency,'XOF'),new.movement_date,
            CASE WHEN ta.kind='caisse' THEN 'especes' ELSE new.method END,new.reference,new.label,new.created_by)
    RETURNING id INTO p;
    -- ajuster le compte de trésorerie de l'écriture générée si ce n'est pas la banque/caisse par défaut
    SELECT id INTO e FROM accounting_entries WHERE source_type='crm_payment' AND source_id=p;
    IF e IS NOT NULL THEN
      UPDATE accounting_entry_lines SET account_code = ta.account_code WHERE entry_id=e AND account_code IN ('5211','5711');
      IF ta.kind <> 'caisse' THEN UPDATE accounting_entries SET journal_id=(SELECT id FROM accounting_journals WHERE code='BQ') WHERE id=e; END IF;
    END IF;
    UPDATE treasury_movements SET payment_id=p, entry_id=e WHERE id=new.id;
    RETURN new;
  END IF;
  fy := acc_open_fy(new.movement_date);
  IF fy IS NULL THEN RETURN new; END IF;
  SELECT id INTO j FROM accounting_journals WHERE code = CASE WHEN ta.kind='caisse' THEN 'CA' ELSE 'BQ' END;
  INSERT INTO accounting_entries(entry_date,fiscal_year_id,journal_id,label,piece_ref,project_id,grant_id,source_type,source_id,status,currency,created_by)
  VALUES (new.movement_date,fy,j,new.label,coalesce(new.reference,'TR-'||left(new.id::text,8)),new.project_id,new.grant_id,'treasury_movement',new.id,'draft','XOF',new.created_by)
  RETURNING id INTO e;
  IF new.direction='encaissement' THEN
    INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,third_party_id,project_id) VALUES
      (e,1,ta.account_code,new.amount,0,new.label,NULL,new.project_id),
      (e,2,new.counterpart_account,0,new.amount,new.label,new.third_party_id,new.project_id);
  ELSIF new.direction='decaissement' THEN
    INSERT INTO accounting_entry_lines(entry_id,line_no,account_code,debit,credit,label,third_party_id,project_id) VALUES
      (e,1,new.counterpart_account,new.amount,0,new.label,new.third_party_id,new.project_id),
      (e,2,ta.account_code,0,new.amount,new.label,NULL,new.project_id);
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
CREATE TRIGGER tm_auto_entry AFTER INSERT ON public.treasury_movements FOR EACH ROW EXECUTE FUNCTION public.treasury_auto_entry();
REVOKE ALL ON FUNCTION public.treasury_auto_entry() FROM PUBLIC, anon, authenticated;