CREATE OR REPLACE FUNCTION public.acc_chain_hash()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _prev text;
BEGIN
  IF NEW.status = 'validee' AND (OLD.status IS DISTINCT FROM 'validee') THEN
    SELECT e.entry_hash INTO _prev FROM public.accounting_entries e
    WHERE e.fiscal_year_id = NEW.fiscal_year_id AND e.status = 'validee' AND e.id <> NEW.id AND e.entry_hash IS NOT NULL
    ORDER BY e.validated_at DESC NULLS LAST, e.created_at DESC LIMIT 1;
    NEW.prev_hash := COALESCE(_prev, 'GENESIS');
    NEW.entry_hash := encode(extensions.digest(
      NEW.id::text || '|' || NEW.entry_date::text || '|' || COALESCE(NEW.piece_ref,'') || '|' ||
      NEW.total_debit::text || '|' || NEW.total_credit::text || '|' || NEW.prev_hash, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.acc_verify_hash_chain(_fy uuid)
 RETURNS TABLE(entry_id uuid, piece_ref text, problem text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r RECORD; _prev text := 'GENESIS'; _expected text;
BEGIN
  FOR r IN SELECT e.id, e.piece_ref, e.entry_date, e.total_debit, e.total_credit, e.prev_hash, e.entry_hash
    FROM public.accounting_entries e
    WHERE e.fiscal_year_id = _fy AND e.status = 'validee' AND e.entry_hash IS NOT NULL
    ORDER BY e.validated_at NULLS LAST, e.created_at
  LOOP
    IF r.prev_hash IS DISTINCT FROM _prev THEN entry_id := r.id; piece_ref := r.piece_ref; problem := 'chaine_rompue'; RETURN NEXT; END IF;
    _expected := encode(extensions.digest(r.id::text || '|' || r.entry_date::text || '|' || COALESCE(r.piece_ref,'') || '|' ||
      r.total_debit::text || '|' || r.total_credit::text || '|' || r.prev_hash, 'sha256'), 'hex');
    IF r.entry_hash IS DISTINCT FROM _expected THEN entry_id := r.id; piece_ref := r.piece_ref; problem := 'contenu_modifie'; RETURN NEXT; END IF;
    _prev := r.entry_hash;
  END LOOP;
END $function$;

REVOKE EXECUTE ON FUNCTION public.acc_chain_hash() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.acc_verify_hash_chain(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acc_verify_hash_chain(uuid) TO authenticated;