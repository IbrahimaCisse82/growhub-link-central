-- 1. Compteurs de numérotation des pièces par journal et exercice
CREATE TABLE public.acc_piece_counters (
  journal_id uuid NOT NULL REFERENCES public.accounting_journals(id) ON DELETE CASCADE,
  fiscal_year_id uuid NOT NULL REFERENCES public.accounting_fiscal_years(id) ON DELETE CASCADE,
  last_seq bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (journal_id, fiscal_year_id)
);
GRANT SELECT ON public.acc_piece_counters TO authenticated;
GRANT ALL ON public.acc_piece_counters TO service_role;
ALTER TABLE public.acc_piece_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture comptables" ON public.acc_piece_counters FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()));

ALTER TABLE public.accounting_entries ADD COLUMN IF NOT EXISTS piece_seq bigint;

CREATE OR REPLACE FUNCTION public.acc_assign_piece_seq()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.piece_seq IS NULL AND NEW.journal_id IS NOT NULL AND NEW.fiscal_year_id IS NOT NULL THEN
    INSERT INTO public.acc_piece_counters (journal_id, fiscal_year_id, last_seq)
    VALUES (NEW.journal_id, NEW.fiscal_year_id, 1)
    ON CONFLICT (journal_id, fiscal_year_id)
    DO UPDATE SET last_seq = public.acc_piece_counters.last_seq + 1
    RETURNING last_seq INTO NEW.piece_seq;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_acc_piece_seq ON public.accounting_entries;
CREATE TRIGGER trg_acc_piece_seq
BEFORE INSERT ON public.accounting_entries
FOR EACH ROW EXECUTE FUNCTION public.acc_assign_piece_seq();

-- Détection des trous de numérotation
CREATE OR REPLACE FUNCTION public.acc_piece_gaps(_fy uuid)
RETURNS TABLE(journal_code text, missing_seq bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.code, s.seq
  FROM public.accounting_entries e
  JOIN public.accounting_journals j ON j.id = e.journal_id
  JOIN LATERAL generate_series(1, (SELECT max(e2.piece_seq) FROM public.accounting_entries e2 WHERE e2.journal_id = e.journal_id AND e2.fiscal_year_id = _fy)) AS s(seq) ON true
  WHERE e.fiscal_year_id = _fy AND e.piece_seq IS NOT NULL
  GROUP BY j.code, e.journal_id, s.seq
  HAVING NOT EXISTS (
    SELECT 1 FROM public.accounting_entries e3
    WHERE e3.journal_id = e.journal_id AND e3.fiscal_year_id = _fy AND e3.piece_seq = s.seq
  )
  ORDER BY j.code, s.seq;
$$;

-- 2. Piste d'audit chaînée (hash)
ALTER TABLE public.accounting_entries
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS entry_hash text;

CREATE OR REPLACE FUNCTION public.acc_chain_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prev text;
BEGIN
  IF NEW.status = 'validated' AND (OLD.status IS DISTINCT FROM 'validated') THEN
    SELECT e.entry_hash INTO _prev
    FROM public.accounting_entries e
    WHERE e.fiscal_year_id = NEW.fiscal_year_id
      AND e.status = 'validated'
      AND e.id <> NEW.id
      AND e.entry_hash IS NOT NULL
    ORDER BY e.validated_at DESC NULLS LAST, e.created_at DESC
    LIMIT 1;
    NEW.prev_hash := COALESCE(_prev, 'GENESIS');
    NEW.entry_hash := encode(extensions.digest(
      NEW.id::text || '|' || NEW.entry_date::text || '|' || COALESCE(NEW.piece_ref,'') || '|' ||
      NEW.total_debit::text || '|' || NEW.total_credit::text || '|' || NEW.prev_hash,
      'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_acc_chain_hash ON public.accounting_entries;
CREATE TRIGGER trg_acc_chain_hash
BEFORE UPDATE OF status ON public.accounting_entries
FOR EACH ROW EXECUTE FUNCTION public.acc_chain_hash();

-- Vérification de la chaîne : détecte toute écriture validée modifiée ou supprimée
CREATE OR REPLACE FUNCTION public.acc_verify_hash_chain(_fy uuid)
RETURNS TABLE(entry_id uuid, piece_ref text, problem text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  _prev text := 'GENESIS';
  _expected text;
BEGIN
  FOR r IN
    SELECT e.id, e.piece_ref, e.entry_date, e.total_debit, e.total_credit, e.prev_hash, e.entry_hash
    FROM public.accounting_entries e
    WHERE e.fiscal_year_id = _fy AND e.status = 'validated' AND e.entry_hash IS NOT NULL
    ORDER BY e.validated_at NULLS LAST, e.created_at
  LOOP
    IF r.prev_hash IS DISTINCT FROM _prev THEN
      entry_id := r.id; piece_ref := r.piece_ref; problem := 'chaine_rompue';
      RETURN NEXT;
    END IF;
    _expected := encode(extensions.digest(
      r.id::text || '|' || r.entry_date::text || '|' || COALESCE(r.piece_ref,'') || '|' ||
      r.total_debit::text || '|' || r.total_credit::text || '|' || r.prev_hash,
      'sha256'), 'hex');
    IF r.entry_hash IS DISTINCT FROM _expected THEN
      entry_id := r.id; piece_ref := r.piece_ref; problem := 'contenu_modifie';
      RETURN NEXT;
    END IF;
    _prev := r.entry_hash;
  END LOOP;
END;
$$;

-- 3. Taux de change historisé : taux en vigueur à la date donnée
CREATE OR REPLACE FUNCTION public.acc_fx_rate(_currency text, _date date)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.rate
  FROM public.exchange_rates r
  WHERE r.currency = upper(_currency) AND r.rate_date <= _date
  ORDER BY r.rate_date DESC
  LIMIT 1;
$$;

-- 4. Périodes mensuelles et clôture de période
CREATE TABLE public.acc_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year_id uuid NOT NULL REFERENCES public.accounting_fiscal_years(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fiscal_year_id, period_start)
);
GRANT SELECT ON public.acc_periods TO authenticated;
GRANT INSERT, UPDATE ON public.acc_periods TO authenticated;
GRANT ALL ON public.acc_periods TO service_role;
ALTER TABLE public.acc_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture comptables" ON public.acc_periods FOR SELECT TO authenticated USING (public.can_view_accounting(auth.uid()));
CREATE POLICY "Gestion admin coordinateur" ON public.acc_periods FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "Modification admin coordinateur" ON public.acc_periods FOR UPDATE TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

-- Génère les 12 périodes mensuelles d'un exercice
CREATE OR REPLACE FUNCTION public.acc_seed_periods(_fy uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start date; _end date; _d date; _n integer := 0;
BEGIN
  SELECT start_date, end_date INTO _start, _end FROM public.accounting_fiscal_years WHERE id = _fy;
  IF _start IS NULL THEN RAISE EXCEPTION 'Exercice introuvable'; END IF;
  _d := date_trunc('month', _start)::date;
  WHILE _d <= _end LOOP
    INSERT INTO public.acc_periods (fiscal_year_id, period_start, period_end)
    VALUES (_fy, _d, LEAST((_d + interval '1 month - 1 day')::date, _end))
    ON CONFLICT (fiscal_year_id, period_start) DO NOTHING;
    _n := _n + 1;
    _d := (_d + interval '1 month')::date;
  END LOOP;
  RETURN _n;
END;
$$;

-- Blocage de toute écriture sur une période clôturée
CREATE OR REPLACE FUNCTION public.acc_guard_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.acc_periods p
    WHERE p.fiscal_year_id = COALESCE(NEW.fiscal_year_id, OLD.fiscal_year_id)
      AND COALESCE(NEW.entry_date, OLD.entry_date) BETWEEN p.period_start AND p.period_end
      AND p.status = 'closed'
  ) THEN
    RAISE EXCEPTION 'Periode cloturee : ecriture interdite';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_acc_guard_period ON public.accounting_entries;
CREATE TRIGGER trg_acc_guard_period
BEFORE INSERT OR UPDATE OR DELETE ON public.accounting_entries
FOR EACH ROW EXECUTE FUNCTION public.acc_guard_period();

-- Périodes pour les exercices existants
DO $$
DECLARE f RECORD;
BEGIN
  FOR f IN SELECT id FROM public.accounting_fiscal_years LOOP
    PERFORM public.acc_seed_periods(f.id);
  END LOOP;
END;
$$;