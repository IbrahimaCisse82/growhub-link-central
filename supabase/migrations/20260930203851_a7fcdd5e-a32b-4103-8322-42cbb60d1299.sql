-- 1. compte archivé refusé
CREATE OR REPLACE FUNCTION public.acc_check_entry_rules() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
    SELECT l.account_code INTO _bad FROM public.accounting_entry_lines l
      JOIN public.accounting_accounts a ON a.code = l.account_code
      WHERE l.entry_id = NEW.id AND a.is_active = false LIMIT 1;
    IF _bad IS NOT NULL THEN RAISE EXCEPTION 'Compte % archivé : imputation interdite', _bad; END IF;
    SELECT allowed_prefixes INTO _prefixes FROM public.accounting_journals WHERE id = NEW.journal_id;
    IF _prefixes IS NOT NULL AND array_length(_prefixes,1) > 0 THEN
      SELECT l.account_code INTO _bad FROM public.accounting_entry_lines l
        WHERE l.entry_id = NEW.id AND NOT EXISTS (SELECT 1 FROM unnest(_prefixes) p WHERE l.account_code LIKE p || '%') LIMIT 1;
      IF _bad IS NOT NULL THEN RAISE EXCEPTION 'Compte % interdit dans ce journal (comptes autorisés : %)', _bad, array_to_string(_prefixes, ', '); END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- 2. suppression d'une écriture validée interdite
CREATE OR REPLACE FUNCTION public.acc_prevent_validated_delete() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status = 'validee' THEN RAISE EXCEPTION 'Écriture validée : suppression interdite, utilisez la contre-passation'; END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS acc_entries_no_delete ON public.accounting_entries;
CREATE TRIGGER acc_entries_no_delete BEFORE DELETE ON public.accounting_entries FOR EACH ROW EXECUTE FUNCTION public.acc_prevent_validated_delete();

-- 3. anti-doublon de pièce (saisies manuelles ; contre-passations et corrections autorisées)
CREATE OR REPLACE FUNCTION public.acc_prevent_duplicate_piece() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.piece_ref IS NULL OR NEW.source_type IS NOT NULL OR NEW.label ILIKE 'Contre-passation%' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM accounting_entries x WHERE x.id <> NEW.id AND x.journal_id IS NOT DISTINCT FROM NEW.journal_id
               AND x.fiscal_year_id IS NOT DISTINCT FROM NEW.fiscal_year_id AND x.piece_ref = NEW.piece_ref AND x.status <> 'annulee')
     AND NOT EXISTS (SELECT 1 FROM accounting_entries x WHERE x.journal_id IS NOT DISTINCT FROM NEW.journal_id
               AND x.fiscal_year_id IS NOT DISTINCT FROM NEW.fiscal_year_id AND x.piece_ref = NEW.piece_ref AND x.label ILIKE 'Contre-passation%') THEN
    RAISE EXCEPTION 'Pièce % déjà utilisée dans ce journal pour cet exercice', NEW.piece_ref;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS acc_entries_dup_piece ON public.accounting_entries;
CREATE TRIGGER acc_entries_dup_piece BEFORE INSERT OR UPDATE OF piece_ref, journal_id ON public.accounting_entries FOR EACH ROW EXECUTE FUNCTION public.acc_prevent_duplicate_piece();

-- 4. surpaiement interdit
CREATE OR REPLACE FUNCTION public.crm_prevent_overpayment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE tot numeric; paid numeric;
BEGIN
  SELECT coalesce(total,0) INTO tot FROM crm_invoices WHERE id = NEW.invoice_id;
  SELECT coalesce(sum(amount),0) INTO paid FROM crm_payments WHERE invoice_id = NEW.invoice_id AND id <> NEW.id;
  IF paid + NEW.amount > tot + 0.01 THEN
    RAISE EXCEPTION 'Règlement supérieur au reste à payer (reste : % )', round(tot - paid);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_payments_no_overpay ON public.crm_payments;
CREATE TRIGGER crm_payments_no_overpay BEFORE INSERT OR UPDATE OF amount ON public.crm_payments FOR EACH ROW EXECUTE FUNCTION public.crm_prevent_overpayment();

-- 5 & 6. caisse négative et période close refusées
CREATE OR REPLACE FUNCTION public.treasury_guard_movement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ta treasury_accounts; bal numeric;
BEGIN
  IF acc_open_fy(NEW.movement_date) IS NULL THEN
    RAISE EXCEPTION 'Aucun exercice ouvert au % : règlement impossible (période clôturée ou absente)', NEW.movement_date;
  END IF;
  SELECT * INTO ta FROM treasury_accounts WHERE id = NEW.treasury_account_id;
  IF ta.kind = 'caisse' AND NEW.direction IN ('decaissement','virement') THEN
    SELECT coalesce(sum(CASE WHEN direction='encaissement' AND treasury_account_id=ta.id THEN amount
                             WHEN direction='virement' AND target_account_id=ta.id THEN amount
                             WHEN treasury_account_id=ta.id THEN -amount ELSE 0 END),0)
      INTO bal FROM treasury_movements WHERE (treasury_account_id=ta.id OR target_account_id=ta.id) AND id <> NEW.id;
    IF bal - NEW.amount < 0 THEN RAISE EXCEPTION 'Solde de caisse insuffisant (disponible : % XOF)', round(bal); END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tm_guard ON public.treasury_movements;
CREATE TRIGGER tm_guard BEFORE INSERT ON public.treasury_movements FOR EACH ROW EXECUTE FUNCTION public.treasury_guard_movement();

-- 7. piste d'audit
DROP TRIGGER IF EXISTS log_fixed_assets ON public.accounting_fixed_assets;
CREATE TRIGGER log_fixed_assets AFTER INSERT OR UPDATE OR DELETE ON public.accounting_fixed_assets FOR EACH ROW EXECUTE FUNCTION public.log_activity();
DROP TRIGGER IF EXISTS log_treasury_accounts ON public.treasury_accounts;
CREATE TRIGGER log_treasury_accounts AFTER INSERT OR UPDATE OR DELETE ON public.treasury_accounts FOR EACH ROW EXECUTE FUNCTION public.log_activity();
DROP TRIGGER IF EXISTS log_treasury_movements ON public.treasury_movements;
CREATE TRIGGER log_treasury_movements AFTER INSERT OR UPDATE OR DELETE ON public.treasury_movements FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- 8. biens non amortissables
ALTER TABLE public.accounting_fixed_assets DROP CONSTRAINT accounting_fixed_assets_duration_years_check;
ALTER TABLE public.accounting_fixed_assets ADD CONSTRAINT accounting_fixed_assets_duration_years_check CHECK (method = 'non_amortissable' OR duration_years > 0);

-- 9. prorata au mois (option au jour)
ALTER TABLE public.accounting_fixed_assets ADD COLUMN IF NOT EXISTS prorata_mode text NOT NULL DEFAULT 'mois' CHECK (prorata_mode IN ('mois','jour'));
CREATE OR REPLACE FUNCTION public.acc_asset_dotation(_a accounting_fixed_assets, _start date, _end date) RETURNS numeric
LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE base numeric; s date; e date; fin date; already numeric; months int; total_months int;
BEGIN
  IF _a.method = 'non_amortissable' OR coalesce(_a.duration_years,0) <= 0 THEN RETURN 0; END IF;
  base := _a.cost - coalesce(_a.residual_value,0);
  SELECT coalesce(sum(amount),0) INTO already FROM accounting_depreciations d JOIN accounting_fiscal_years f ON f.id=d.fiscal_year_id
    WHERE d.asset_id=_a.id AND f.end_date < _start;
  IF _a.prorata_mode = 'jour' THEN
    fin := (_a.service_date + (_a.duration_years * 365)::int);
    s := greatest(_start, _a.service_date);
    e := least(_end, fin - 1, coalesce(_a.disposal_date, _end));
    IF e < s THEN RETURN 0; END IF;
    RETURN round(least(base - already, base * ((e - s + 1)::numeric / (_a.duration_years * 365))));
  END IF;
  total_months := round(_a.duration_years * 12)::int;
  s := date_trunc('month', greatest(_start, _a.service_date))::date;
  e := least(_end, coalesce(_a.disposal_date, _end));
  IF e < s THEN RETURN 0; END IF;
  months := (extract(year from e)::int - extract(year from s)::int) * 12 + extract(month from e)::int - extract(month from s)::int + 1;
  RETURN greatest(0, round(least(base - already, base * months::numeric / total_months)));
END $function$;