
-- ============================================
-- 1) ORG SETTINGS (paramètres société)
-- ============================================
CREATE TABLE IF NOT EXISTS public.org_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identité
  company_name text NOT NULL DEFAULT 'GROWHUB SARL',
  legal_form text,
  logo_url text,
  stamp_url text,
  ninea text,
  rccm text,
  tax_id text,
  -- Coordonnées
  address text,
  postal_box text,
  city text,
  country text DEFAULT 'Sénégal',
  phone text,
  email text,
  website text,
  -- PDF defaults
  default_currency text DEFAULT 'XOF',
  default_tax_rate numeric DEFAULT 18,
  default_payment_terms text DEFAULT 'Paiement à 30 jours',
  default_quote_terms text DEFAULT 'Devis valable 30 jours',
  default_po_terms text DEFAULT 'Livraison sous 15 jours après confirmation',
  legal_mentions text,
  bank_details text,
  -- Signataire
  signatory_name text DEFAULT 'La Direction',
  signatory_role text,
  signatory_city text DEFAULT 'Dakar',
  -- Footer libre (utilisé en pied de tous PDF)
  pdf_footer text,
  -- Couleurs marque PDF (hex)
  brand_primary_hex text DEFAULT '#0D1F2E',
  brand_accent_hex text DEFAULT '#2563EB',
  -- Singleton flag
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Singleton: une seule ligne active
CREATE UNIQUE INDEX IF NOT EXISTS org_settings_singleton ON public.org_settings (is_active) WHERE is_active = true;

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

-- Lecture: tout utilisateur authentifié (besoin pour PDFs)
CREATE POLICY "Authenticated can read org settings"
  ON public.org_settings FOR SELECT
  TO authenticated
  USING (true);

-- Écriture: super_admin uniquement
CREATE POLICY "Super admins manage org settings"
  ON public.org_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_org_settings_updated_at
  BEFORE UPDATE ON public.org_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert ligne par défaut
INSERT INTO public.org_settings (company_name, address, postal_box, city, phone, email, website, ninea, rccm, pdf_footer)
VALUES (
  'GROWHUB SARL',
  'N°563317 Ngor – Almadies Dakar',
  'BP: 11837 DAKAR PEYTAVIN',
  'Dakar',
  '+221 78 475 28 58',
  'contact@growhubsenegal.com',
  'http://growhubsenegal.com',
  '006485181 2V2',
  'SN DKR 2017 B 20723',
  'Adresse : N°563317 Ngor – Almadies Dakar – SENEGAL  •  BP: 11837 DAKAR PEYTAVIN'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2) PURCHASE ORDERS (bons de commande fournisseur)
-- ============================================
CREATE TYPE public.purchase_order_status AS ENUM (
  'brouillon', 'envoye', 'confirme', 'recu_partiel', 'recu', 'annule'
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES public.crm_contreparties(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  grant_id uuid REFERENCES public.grants(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.crm_invoices(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  delivery_address text,
  delivery_contact text,
  reference text,
  currency text NOT NULL DEFAULT 'XOF',
  tax_rate numeric DEFAULT 18,
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  status public.purchase_order_status NOT NULL DEFAULT 'brouillon',
  payment_terms text,
  notes text,
  created_by uuid,
  sent_at timestamptz,
  confirmed_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text,
  unit_price numeric NOT NULL DEFAULT 0,
  tax_rate numeric DEFAULT 18,
  line_total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_po_project ON public.purchase_orders(project_id);
CREATE INDEX idx_po_status ON public.purchase_orders(status);
CREATE INDEX idx_po_lines_po ON public.purchase_order_lines(purchase_order_id);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;

-- Policies PO : admins/coordinators full ; autres lecture seulement
CREATE POLICY "Admins manage POs"
  ON public.purchase_orders FOR ALL
  TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid()))
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Authenticated read POs"
  ON public.purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage PO lines"
  ON public.purchase_order_lines FOR ALL
  TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid()))
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Authenticated read PO lines"
  ON public.purchase_order_lines FOR SELECT
  TO authenticated
  USING (true);

-- Trigger numéro auto
CREATE OR REPLACE FUNCTION public.po_generate_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_part text;
  next_num int;
BEGIN
  IF NEW.po_number IS NOT NULL AND NEW.po_number != '' THEN RETURN NEW; END IF;
  year_part := to_char(NEW.issue_date, 'YYYY');
  SELECT COALESCE(MAX(CAST(split_part(po_number, '-', 3) AS INT)), 0) + 1
    INTO next_num FROM public.purchase_orders
    WHERE po_number LIKE 'BC-' || year_part || '-%';
  NEW.po_number := 'BC-' || year_part || '-' || lpad(next_num::text, 4, '0');
  RETURN NEW;
END $$;

CREATE TRIGGER trg_po_generate_number
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.po_generate_number();

CREATE TRIGGER trg_po_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recalcul totaux PO
CREATE OR REPLACE FUNCTION public.po_recalculate_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  po_id uuid;
  sub numeric;
  tax_total numeric;
BEGIN
  po_id := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  SELECT COALESCE(SUM(line_total), 0),
         COALESCE(SUM(line_total * COALESCE(tax_rate, 0) / 100), 0)
    INTO sub, tax_total
    FROM public.purchase_order_lines WHERE purchase_order_id = po_id;
  UPDATE public.purchase_orders
    SET subtotal = sub,
        tax_amount = ROUND(tax_total, 2),
        total = sub + ROUND(tax_total, 2),
        updated_at = now()
    WHERE id = po_id;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_po_lines_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.po_recalculate_totals();

-- Audit log
CREATE TRIGGER trg_po_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
