
-- ============================================================
-- PHASE 1 : Templates de projet réutilisables (canevas PAERID)
-- ============================================================

CREATE TABLE public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  source_document TEXT,
  version TEXT DEFAULT 'v1.0',
  section_count INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.project_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  section_number TEXT NOT NULL,        -- "0", "1", "2.1", "5.3", etc.
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  section_type TEXT NOT NULL DEFAULT 'text',  -- intro, context, objectives, logframe, budget, me, risks, annex, text
  sort_order INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  default_content JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, section_number)
);

CREATE TABLE public.project_template_budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  code TEXT NOT NULL,                  -- WP1, WP1.1, WP2, etc.
  parent_code TEXT,                    -- WP1 for WP1.1
  label TEXT NOT NULL,
  category TEXT,
  year1 NUMERIC DEFAULT 0,
  year2 NUMERIC DEFAULT 0,
  year3 NUMERIC DEFAULT 0,
  year4 NUMERIC DEFAULT 0,
  year5 NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (COALESCE(year1,0)+COALESCE(year2,0)+COALESCE(year3,0)+COALESCE(year4,0)+COALESCE(year5,0)) STORED,
  marqueur_genre TEXT,                 -- ✓, ✓✓, ○
  marqueur_climat TEXT,
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.project_template_budget_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  work_package TEXT NOT NULL,
  activity TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  year_1 NUMERIC DEFAULT 0,
  year_2 NUMERIC DEFAULT 0,
  year_3 NUMERIC DEFAULT 0,
  year_4 NUMERIC DEFAULT 0,
  year_5 NUMERIC DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (COALESCE(year_1,0)+COALESCE(year_2,0)+COALESCE(year_3,0)+COALESCE(year_4,0)+COALESCE(year_5,0)) STORED,
  nomenclature_code TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.project_template_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  category TEXT NOT NULL,              -- Période, Géographie, Bénéficiaires, Taux, Marqueurs, etc.
  label TEXT NOT NULL,
  value TEXT,
  unit TEXT,
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_template_sections_template ON public.project_template_sections(template_id, sort_order);
CREATE INDEX idx_template_budget_lines_template ON public.project_template_budget_lines(template_id, sort_order);
CREATE INDEX idx_template_budget_details_template ON public.project_template_budget_details(template_id, work_package, sort_order);
CREATE INDEX idx_template_assumptions_template ON public.project_template_assumptions(template_id, category, sort_order);

-- Triggers updated_at
CREATE TRIGGER trg_project_templates_updated BEFORE UPDATE ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_project_template_sections_updated BEFORE UPDATE ON public.project_template_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS ============
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_budget_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_assumptions ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur authentifié
CREATE POLICY "Templates readable by authenticated" ON public.project_templates
  FOR SELECT TO authenticated USING (is_active = true OR public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "Template sections readable by authenticated" ON public.project_template_sections
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Template budget lines readable by authenticated" ON public.project_template_budget_lines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Template budget details readable by authenticated" ON public.project_template_budget_details
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Template assumptions readable by authenticated" ON public.project_template_assumptions
  FOR SELECT TO authenticated USING (true);

-- Écriture : admins/coordinateurs uniquement
CREATE POLICY "Admins manage templates" ON public.project_templates
  FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "Admins manage template sections" ON public.project_template_sections
  FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "Admins manage template budget lines" ON public.project_template_budget_lines
  FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "Admins manage template budget details" ON public.project_template_budget_details
  FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "Admins manage template assumptions" ON public.project_template_assumptions
  FOR ALL TO authenticated USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

-- Activity log
CREATE TRIGGER trg_log_project_templates AFTER INSERT OR UPDATE OR DELETE ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();
