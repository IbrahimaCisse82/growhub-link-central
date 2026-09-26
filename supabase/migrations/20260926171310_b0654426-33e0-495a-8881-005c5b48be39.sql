CREATE TABLE public.accounting_account_guides (
  code text PRIMARY KEY,
  title text NOT NULL,
  contenu text, subdivisions text, commentaires text, fonctionnement text, exclusions text, controle text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.accounting_account_guides TO authenticated;
GRANT ALL ON public.accounting_account_guides TO service_role;
ALTER TABLE public.accounting_account_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guides lisibles par la comptabilité" ON public.accounting_account_guides FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()));

ALTER TABLE public.accounting_entry_lines ADD COLUMN IF NOT EXISTS lettrage text, ADD COLUMN IF NOT EXISTS lettered_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_acc_lines_lettrage ON public.accounting_entry_lines(account_code, lettrage);
ALTER TABLE public.accounting_journals ADD COLUMN IF NOT EXISTS allowed_prefixes text[];
ALTER TABLE public.accounting_entries ADD COLUMN IF NOT EXISTS is_opening boolean NOT NULL DEFAULT false;

-- Lettrage autorisé sur écritures validées ; tout autre changement bloqué
CREATE OR REPLACE FUNCTION public.acc_guard_lines() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _status text;
BEGIN
  SELECT status INTO _status FROM public.accounting_entries WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
  IF _status = 'validee' THEN
    IF TG_OP = 'UPDATE'
       AND NEW.account_code IS NOT DISTINCT FROM OLD.account_code
       AND NEW.debit IS NOT DISTINCT FROM OLD.debit
       AND NEW.credit IS NOT DISTINCT FROM OLD.credit
       AND NEW.label IS NOT DISTINCT FROM OLD.label
       AND NEW.entry_id IS NOT DISTINCT FROM OLD.entry_id THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Écriture validée : lignes non modifiables';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

-- Contrôles SYSCOHADA à la validation
CREATE OR REPLACE FUNCTION public.acc_check_entry_rules() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _prefixes text[]; _bad text; _fy record;
BEGIN
  IF NEW.status = 'validee' AND (TG_OP = 'INSERT' OR OLD.status <> 'validee') THEN
    IF NEW.fiscal_year_id IS NOT NULL THEN
      SELECT * INTO _fy FROM public.accounting_fiscal_years WHERE id = NEW.fiscal_year_id;
      IF _fy.status = 'closed' THEN RAISE EXCEPTION 'Exercice clôturé : validation impossible'; END IF;
      IF NEW.entry_date < _fy.start_date OR NEW.entry_date > _fy.end_date THEN
        RAISE EXCEPTION 'Date % hors de l''exercice (% → %)', NEW.entry_date, _fy.start_date, _fy.end_date;
      END IF;
    END IF;
    SELECT l.account_code INTO _bad FROM public.accounting_entry_lines l
      LEFT JOIN public.accounting_accounts a ON a.code = l.account_code
      WHERE l.entry_id = NEW.id AND (a.id IS NULL OR a.is_detail = false) LIMIT 1;
    IF _bad IS NOT NULL THEN RAISE EXCEPTION 'Compte % inexistant ou non mouvementable (compte de regroupement)', _bad; END IF;
    SELECT allowed_prefixes INTO _prefixes FROM public.accounting_journals WHERE id = NEW.journal_id;
    IF _prefixes IS NOT NULL AND array_length(_prefixes,1) > 0 THEN
      SELECT l.account_code INTO _bad FROM public.accounting_entry_lines l
        WHERE l.entry_id = NEW.id AND NOT EXISTS (SELECT 1 FROM unnest(_prefixes) p WHERE l.account_code LIKE p || '%') LIMIT 1;
      IF _bad IS NOT NULL THEN RAISE EXCEPTION 'Compte % interdit dans ce journal (comptes autorisés : %)', _bad, array_to_string(_prefixes, ', '); END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.acc_check_entry_rules() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_acc_check_entry_rules ON public.accounting_entries;
CREATE TRIGGER trg_acc_check_entry_rules BEFORE INSERT OR UPDATE ON public.accounting_entries FOR EACH ROW EXECUTE FUNCTION public.acc_check_entry_rules();