
-- ===== TYPES ENUM =====
CREATE TYPE public.crm_party_type AS ENUM ('client', 'bailleur', 'fournisseur', 'partenaire');
CREATE TYPE public.crm_invoice_direction AS ENUM ('emise', 'recue');
CREATE TYPE public.crm_invoice_status AS ENUM ('brouillon', 'envoyee', 'payee_partiel', 'payee', 'en_retard', 'annulee');
CREATE TYPE public.crm_subscription_frequency AS ENUM ('mensuel', 'trimestriel', 'semestriel', 'annuel');
CREATE TYPE public.crm_subscription_status AS ENUM ('actif', 'suspendu', 'termine');

-- ===== CONTREPARTIES =====
CREATE TABLE public.crm_contreparties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  party_type public.crm_party_type NOT NULL,
  is_client BOOLEAN DEFAULT false,
  is_supplier BOOLEAN DEFAULT false,
  is_funder BOOLEAN DEFAULT false,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Sénégal',
  tax_id TEXT,
  ninea TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  startup_id UUID REFERENCES public.startups(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_contreparties_type ON public.crm_contreparties(party_type);
CREATE INDEX idx_crm_contreparties_active ON public.crm_contreparties(is_active);

-- ===== FACTURES =====
CREATE TABLE public.crm_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  direction public.crm_invoice_direction NOT NULL DEFAULT 'emise',
  contrepartie_id UUID NOT NULL REFERENCES public.crm_contreparties(id) ON DELETE RESTRICT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'XOF',
  exchange_rate NUMERIC(12,6) DEFAULT 1,
  subtotal NUMERIC(14,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 18,
  tax_amount NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) DEFAULT 0,
  amount_paid NUMERIC(14,2) DEFAULT 0,
  status public.crm_invoice_status NOT NULL DEFAULT 'brouillon',
  reference TEXT,
  notes TEXT,
  payment_terms TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  grant_id UUID REFERENCES public.grants(id) ON DELETE SET NULL,
  subscription_id UUID,
  pdf_url TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_invoices_contrepartie ON public.crm_invoices(contrepartie_id);
CREATE INDEX idx_crm_invoices_status ON public.crm_invoices(status);
CREATE INDEX idx_crm_invoices_direction ON public.crm_invoices(direction);
CREATE INDEX idx_crm_invoices_due_date ON public.crm_invoices(due_date);

-- ===== LIGNES DE FACTURE =====
CREATE TABLE public.crm_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.crm_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 18,
  line_total NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_invoice_lines_invoice ON public.crm_invoice_lines(invoice_id);

-- ===== PAIEMENTS =====
CREATE TABLE public.crm_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.crm_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_payments_invoice ON public.crm_payments(invoice_id);

-- ===== ABONNEMENTS =====
CREATE TABLE public.crm_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contrepartie_id UUID NOT NULL REFERENCES public.crm_contreparties(id) ON DELETE RESTRICT,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  frequency public.crm_subscription_frequency NOT NULL DEFAULT 'mensuel',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  auto_invoice BOOLEAN DEFAULT true,
  status public.crm_subscription_status NOT NULL DEFAULT 'actif',
  category TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_subscriptions_contrepartie ON public.crm_subscriptions(contrepartie_id);
CREATE INDEX idx_crm_subscriptions_status ON public.crm_subscriptions(status);
CREATE INDEX idx_crm_subscriptions_next_due ON public.crm_subscriptions(next_due_date);

-- ===== ÉCHÉANCES D'ABONNEMENT =====
CREATE TABLE public.crm_subscription_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.crm_subscriptions(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  invoice_id UUID REFERENCES public.crm_invoices(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_sub_occurrences_subscription ON public.crm_subscription_occurrences(subscription_id);
CREATE INDEX idx_crm_sub_occurrences_due ON public.crm_subscription_occurrences(due_date);

-- FK retour facture -> abonnement
ALTER TABLE public.crm_invoices ADD CONSTRAINT crm_invoices_subscription_fk
  FOREIGN KEY (subscription_id) REFERENCES public.crm_subscriptions(id) ON DELETE SET NULL;

-- ===== TRIGGERS =====

-- Numérotation auto des factures
CREATE OR REPLACE FUNCTION public.crm_generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prefix TEXT;
  year_part TEXT;
  next_num INT;
BEGIN
  IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number != '' THEN
    RETURN NEW;
  END IF;
  prefix := CASE WHEN NEW.direction = 'emise' THEN 'FAC' ELSE 'ACH' END;
  year_part := to_char(NEW.issue_date, 'YYYY');
  SELECT COALESCE(MAX(CAST(split_part(invoice_number, '-', 3) AS INT)), 0) + 1
    INTO next_num
    FROM public.crm_invoices
    WHERE invoice_number LIKE prefix || '-' || year_part || '-%';
  NEW.invoice_number := prefix || '-' || year_part || '-' || lpad(next_num::text, 4, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_crm_invoice_number
  BEFORE INSERT ON public.crm_invoices
  FOR EACH ROW EXECUTE FUNCTION public.crm_generate_invoice_number();

-- Recalcul des totaux quand les lignes changent
CREATE OR REPLACE FUNCTION public.crm_recalculate_invoice_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv_id UUID;
  sub NUMERIC;
  tax_r NUMERIC;
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(line_total), 0) INTO sub FROM public.crm_invoice_lines WHERE invoice_id = inv_id;
  SELECT tax_rate INTO tax_r FROM public.crm_invoices WHERE id = inv_id;
  UPDATE public.crm_invoices
    SET subtotal = sub,
        tax_amount = ROUND(sub * COALESCE(tax_r, 0) / 100, 2),
        total = sub + ROUND(sub * COALESCE(tax_r, 0) / 100, 2),
        updated_at = now()
    WHERE id = inv_id;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_crm_recalc_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_invoice_lines
  FOR EACH ROW EXECUTE FUNCTION public.crm_recalculate_invoice_totals();

-- Mise à jour du montant payé et du statut
CREATE OR REPLACE FUNCTION public.crm_update_invoice_payments()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv_id UUID;
  total_paid NUMERIC;
  inv_total NUMERIC;
  inv_due DATE;
  cur_status crm_invoice_status;
  new_status crm_invoice_status;
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(amount), 0) INTO total_paid FROM public.crm_payments WHERE invoice_id = inv_id;
  SELECT total, due_date, status INTO inv_total, inv_due, cur_status FROM public.crm_invoices WHERE id = inv_id;

  IF cur_status = 'annulee' OR cur_status = 'brouillon' THEN
    new_status := cur_status;
  ELSIF total_paid >= inv_total AND inv_total > 0 THEN
    new_status := 'payee';
  ELSIF total_paid > 0 THEN
    new_status := 'payee_partiel';
  ELSIF inv_due IS NOT NULL AND inv_due < CURRENT_DATE THEN
    new_status := 'en_retard';
  ELSE
    new_status := 'envoyee';
  END IF;

  UPDATE public.crm_invoices
    SET amount_paid = total_paid,
        status = new_status,
        paid_at = CASE WHEN new_status = 'payee' THEN now() ELSE NULL END,
        updated_at = now()
    WHERE id = inv_id;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_crm_update_invoice_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_payments
  FOR EACH ROW EXECUTE FUNCTION public.crm_update_invoice_payments();

-- Génération automatique des échéances à la création d'un abonnement
CREATE OR REPLACE FUNCTION public.crm_generate_subscription_occurrences()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  occ_date DATE;
  end_d DATE;
  step_interval INTERVAL;
  max_iter INT := 60;
  i INT := 0;
BEGIN
  step_interval := CASE NEW.frequency
    WHEN 'mensuel' THEN INTERVAL '1 month'
    WHEN 'trimestriel' THEN INTERVAL '3 months'
    WHEN 'semestriel' THEN INTERVAL '6 months'
    WHEN 'annuel' THEN INTERVAL '1 year'
  END;
  end_d := COALESCE(NEW.end_date, NEW.start_date + INTERVAL '2 years');
  occ_date := NEW.start_date;
  WHILE occ_date <= end_d AND i < max_iter LOOP
    INSERT INTO public.crm_subscription_occurrences (subscription_id, due_date, amount, currency)
      VALUES (NEW.id, occ_date, NEW.amount, NEW.currency);
    occ_date := occ_date + step_interval;
    i := i + 1;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_crm_generate_occurrences
  AFTER INSERT ON public.crm_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.crm_generate_subscription_occurrences();

-- updated_at triggers
CREATE TRIGGER trg_crm_contreparties_updated BEFORE UPDATE ON public.crm_contreparties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_invoices_updated BEFORE UPDATE ON public.crm_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_subscriptions_updated BEFORE UPDATE ON public.crm_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== RLS =====
ALTER TABLE public.crm_contreparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_subscription_occurrences ENABLE ROW LEVEL SECURITY;

-- Politique : Admins / Coordinators / Project Managers ont tous les droits
CREATE POLICY "crm_contreparties_admin_all" ON public.crm_contreparties FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'project_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'project_manager'));

CREATE POLICY "crm_invoices_admin_all" ON public.crm_invoices FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'project_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'project_manager'));

CREATE POLICY "crm_invoice_lines_admin_all" ON public.crm_invoice_lines FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'project_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'project_manager'));

CREATE POLICY "crm_payments_admin_all" ON public.crm_payments FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'project_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'project_manager'));

CREATE POLICY "crm_subscriptions_admin_all" ON public.crm_subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'project_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'project_manager'));

CREATE POLICY "crm_sub_occurrences_admin_all" ON public.crm_subscription_occurrences FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'project_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'project_manager'));
