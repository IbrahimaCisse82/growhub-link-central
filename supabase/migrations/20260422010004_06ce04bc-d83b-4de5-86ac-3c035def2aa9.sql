
-- Statuts des devis
DO $$ BEGIN
  CREATE TYPE public.crm_quote_status AS ENUM ('brouillon', 'envoye', 'accepte', 'refuse', 'expire', 'converti');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Table devis
CREATE TABLE IF NOT EXISTS public.crm_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  contrepartie_id UUID NOT NULL REFERENCES public.crm_contreparties(id) ON DELETE RESTRICT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  currency TEXT NOT NULL DEFAULT 'XOF',
  tax_rate NUMERIC DEFAULT 18,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status public.crm_quote_status NOT NULL DEFAULT 'brouillon',
  notes TEXT,
  payment_terms TEXT,
  reference TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  grant_id UUID REFERENCES public.grants(id) ON DELETE SET NULL,
  converted_invoice_id UUID REFERENCES public.crm_invoices(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.crm_quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  line_total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Avoirs / notes de crédit
ALTER TABLE public.crm_invoices ADD COLUMN IF NOT EXISTS is_credit_note BOOLEAN DEFAULT false;
ALTER TABLE public.crm_invoices ADD COLUMN IF NOT EXISTS credit_note_for UUID REFERENCES public.crm_invoices(id) ON DELETE SET NULL;

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_crm_quotes_contrepartie ON public.crm_quotes(contrepartie_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_status ON public.crm_quotes(status);
CREATE INDEX IF NOT EXISTS idx_crm_quote_lines_quote ON public.crm_quote_lines(quote_id);

-- RLS
ALTER TABLE public.crm_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_quote_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotes_admin_all" ON public.crm_quotes;
CREATE POLICY "quotes_admin_all" ON public.crm_quotes FOR ALL TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid()))
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "quotes_user_read" ON public.crm_quotes;
CREATE POLICY "quotes_user_read" ON public.crm_quotes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "quotes_user_insert" ON public.crm_quotes;
CREATE POLICY "quotes_user_insert" ON public.crm_quotes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "quote_lines_all" ON public.crm_quote_lines;
CREATE POLICY "quote_lines_all" ON public.crm_quote_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crm_quotes q WHERE q.id = quote_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.crm_quotes q WHERE q.id = quote_id));

-- Numérotation auto des devis
CREATE OR REPLACE FUNCTION public.crm_generate_quote_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  year_part TEXT;
  next_num INT;
BEGIN
  IF NEW.quote_number IS NOT NULL AND NEW.quote_number != '' THEN
    RETURN NEW;
  END IF;
  year_part := to_char(NEW.issue_date, 'YYYY');
  SELECT COALESCE(MAX(CAST(split_part(quote_number, '-', 3) AS INT)), 0) + 1
    INTO next_num FROM public.crm_quotes
    WHERE quote_number LIKE 'DEV-' || year_part || '-%';
  NEW.quote_number := 'DEV-' || year_part || '-' || lpad(next_num::text, 4, '0');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_crm_quote_number ON public.crm_quotes;
CREATE TRIGGER trg_crm_quote_number BEFORE INSERT ON public.crm_quotes
  FOR EACH ROW EXECUTE FUNCTION public.crm_generate_quote_number();

-- Recalcul auto des totaux du devis
CREATE OR REPLACE FUNCTION public.crm_recalculate_quote_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q_id UUID;
  sub NUMERIC;
  tax_total NUMERIC;
BEGIN
  q_id := COALESCE(NEW.quote_id, OLD.quote_id);
  -- Multi-TVA par ligne : calcule le TVA somme par ligne
  SELECT COALESCE(SUM(line_total), 0),
         COALESCE(SUM(line_total * COALESCE(tax_rate, 0) / 100), 0)
    INTO sub, tax_total
    FROM public.crm_quote_lines WHERE quote_id = q_id;
  UPDATE public.crm_quotes
    SET subtotal = sub,
        tax_amount = ROUND(tax_total, 2),
        total = sub + ROUND(tax_total, 2),
        updated_at = now()
    WHERE id = q_id;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_crm_quote_lines_recalc ON public.crm_quote_lines;
CREATE TRIGGER trg_crm_quote_lines_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_quote_lines
  FOR EACH ROW EXECUTE FUNCTION public.crm_recalculate_quote_totals();

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_crm_quotes_updated ON public.crm_quotes;
CREATE TRIGGER trg_crm_quotes_updated BEFORE UPDATE ON public.crm_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
