-- ════════════════════════════════════════════════════════════════
-- HR Step 6: Congés / Absences / Contrats / Documents RH
-- ════════════════════════════════════════════════════════════════

-- Type de congé
DO $$ BEGIN
  CREATE TYPE public.hr_leave_type AS ENUM ('annuel', 'maladie', 'maternite', 'paternite', 'permission', 'sans_solde', 'autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Statut workflow
DO $$ BEGIN
  CREATE TYPE public.hr_leave_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Type de contrat
DO $$ BEGIN
  CREATE TYPE public.hr_contract_type AS ENUM ('CDI', 'CDD', 'stage', 'consultance', 'apprentissage', 'autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ════════════════════════════════════════════════════════════════
-- TABLE: hr_leave_requests
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type public.hr_leave_type NOT NULL DEFAULT 'annuel',
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count numeric(6,2) NOT NULL DEFAULT 0,
  reason text,
  status public.hr_leave_status NOT NULL DEFAULT 'pending',
  requested_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_hr_leaves_employee ON public.hr_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_status ON public.hr_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_period ON public.hr_leave_requests(start_date, end_date);

ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH admins gèrent tous les congés" ON public.hr_leave_requests
  FOR ALL USING (public.is_admin_or_coordinator(auth.uid()))
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Employé voit ses propres congés" ON public.hr_leave_requests
  FOR SELECT USING (
    employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Employé peut créer ses propres demandes" ON public.hr_leave_requests
  FOR INSERT WITH CHECK (
    employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
    AND status IN ('draft', 'pending')
  );

CREATE POLICY "Employé peut annuler ses demandes en attente" ON public.hr_leave_requests
  FOR UPDATE USING (
    employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
    AND status IN ('draft', 'pending')
  );

CREATE TRIGGER trg_hr_leaves_updated_at
  BEFORE UPDATE ON public.hr_leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ════════════════════════════════════════════════════════════════
-- TABLE: hr_leave_balances (solde par employé/année)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.hr_leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  annee int NOT NULL,
  leave_type public.hr_leave_type NOT NULL DEFAULT 'annuel',
  initial_days numeric(6,2) NOT NULL DEFAULT 24,
  carried_over numeric(6,2) NOT NULL DEFAULT 0,
  used_days numeric(6,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, annee, leave_type)
);

ALTER TABLE public.hr_leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH admins gèrent les soldes" ON public.hr_leave_balances
  FOR ALL USING (public.is_admin_or_coordinator(auth.uid()))
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Employé voit ses propres soldes" ON public.hr_leave_balances
  FOR SELECT USING (
    employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
  );

CREATE TRIGGER trg_hr_balances_updated_at
  BEFORE UPDATE ON public.hr_leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger : met à jour le solde quand un congé est approuvé
CREATE OR REPLACE FUNCTION public.hr_update_leave_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _annee int;
BEGIN
  -- Approbation : ajoute les jours
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    _annee := EXTRACT(YEAR FROM NEW.start_date);
    
    IF NEW.status = 'approved' THEN
      INSERT INTO public.hr_leave_balances (employee_id, annee, leave_type, used_days)
      VALUES (NEW.employee_id, _annee, NEW.leave_type, NEW.days_count)
      ON CONFLICT (employee_id, annee, leave_type)
      DO UPDATE SET used_days = hr_leave_balances.used_days + NEW.days_count, updated_at = now();
    
    -- Annulation après approbation : retire les jours
    ELSIF OLD.status = 'approved' AND NEW.status IN ('cancelled', 'rejected') THEN
      UPDATE public.hr_leave_balances
        SET used_days = GREATEST(0, used_days - OLD.days_count), updated_at = now()
        WHERE employee_id = NEW.employee_id AND annee = _annee AND leave_type = NEW.leave_type;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_hr_leave_balance_sync
  AFTER UPDATE ON public.hr_leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.hr_update_leave_balance();

-- ════════════════════════════════════════════════════════════════
-- TABLE: hr_contracts (historique des contrats)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.hr_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  contract_type public.hr_contract_type NOT NULL DEFAULT 'CDI',
  reference text,
  start_date date NOT NULL,
  end_date date,
  trial_end_date date,
  fonction text,
  salaire_base numeric(14,2) NOT NULL DEFAULT 0,
  sursalaire numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  signed_at date,
  document_url text,
  notes text,
  renewal_of uuid REFERENCES public.hr_contracts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_contracts_employee ON public.hr_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_active ON public.hr_contracts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_hr_contracts_end_date ON public.hr_contracts(end_date) WHERE end_date IS NOT NULL;

ALTER TABLE public.hr_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH admins gèrent les contrats" ON public.hr_contracts
  FOR ALL USING (public.is_admin_or_coordinator(auth.uid()))
  WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Employé voit ses propres contrats" ON public.hr_contracts
  FOR SELECT USING (
    employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
  );

CREATE TRIGGER trg_hr_contracts_updated_at
  BEFORE UPDATE ON public.hr_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ════════════════════════════════════════════════════════════════
-- VIEW : alertes contrats expirant bientôt (≤ 60 jours)
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.hr_contract_alerts AS
SELECT 
  c.id AS contract_id,
  c.employee_id,
  e.matricule,
  e.prenom,
  e.nom,
  c.contract_type,
  c.end_date,
  c.trial_end_date,
  CASE 
    WHEN c.end_date IS NOT NULL AND c.end_date <= CURRENT_DATE THEN 'expired'
    WHEN c.end_date IS NOT NULL AND c.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'critical'
    WHEN c.end_date IS NOT NULL AND c.end_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'warning'
    WHEN c.trial_end_date IS NOT NULL AND c.trial_end_date <= CURRENT_DATE + INTERVAL '15 days' AND c.trial_end_date > CURRENT_DATE THEN 'trial_ending'
    ELSE 'ok'
  END AS alert_level,
  CASE 
    WHEN c.end_date IS NOT NULL THEN c.end_date - CURRENT_DATE
    ELSE NULL
  END AS days_remaining
FROM public.hr_contracts c
JOIN public.hr_employees e ON e.id = c.employee_id
WHERE c.is_active = true AND e.archived_at IS NULL;
