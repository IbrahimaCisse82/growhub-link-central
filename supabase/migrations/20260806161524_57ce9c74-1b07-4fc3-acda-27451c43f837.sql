-- ============ PMO CORE ============
CREATE TABLE public.project_pmo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  charter_mission text,
  charter_objectives text,
  charter_scope text,
  charter_out_of_scope text,
  governance_manual text,
  doc_management_procedure text,
  deliverable_validation_procedure text,
  meeting_cadence text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_pmo TO authenticated;
GRANT ALL ON public.project_pmo TO service_role;
ALTER TABLE public.project_pmo ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pmo_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid,
  full_name text NOT NULL,
  role_title text NOT NULL,
  organization text,
  responsibilities text,
  reports_to text,
  email text,
  phone text,
  is_steering_committee boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pmo_members TO authenticated;
GRANT ALL ON public.pmo_members TO service_role;
ALTER TABLE public.pmo_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pmo_raci (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  activity text NOT NULL,
  role_title text NOT NULL,
  raci text NOT NULL DEFAULT 'R',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pmo_raci TO authenticated;
GRANT ALL ON public.pmo_raci TO service_role;
ALTER TABLE public.pmo_raci ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pmo_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reference text,
  decision_date date NOT NULL DEFAULT CURRENT_DATE,
  subject text NOT NULL,
  decision text,
  taken_by text,
  impact text,
  follow_up text,
  status text NOT NULL DEFAULT 'open',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pmo_decisions TO authenticated;
GRANT ALL ON public.pmo_decisions TO service_role;
ALTER TABLE public.pmo_decisions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pmo_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  organization text,
  category text NOT NULL DEFAULT 'partenaire',
  influence text NOT NULL DEFAULT 'medium',
  interest text NOT NULL DEFAULT 'medium',
  engagement_strategy text,
  contact text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pmo_stakeholders TO authenticated;
GRANT ALL ON public.pmo_stakeholders TO service_role;
ALTER TABLE public.pmo_stakeholders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pmo_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  meeting_type text NOT NULL DEFAULT 'equipe',
  frequency text,
  scheduled_at timestamptz,
  location text,
  attendees text,
  agenda text,
  minutes text,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pmo_meetings TO authenticated;
GRANT ALL ON public.pmo_meetings TO service_role;
ALTER TABLE public.pmo_meetings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pmo_report_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  report_type text NOT NULL DEFAULT 'mensuel',
  period_label text,
  due_date date,
  owner_role text,
  template_key text,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pmo_report_schedule TO authenticated;
GRANT ALL ON public.pmo_report_schedule TO service_role;
ALTER TABLE public.pmo_report_schedule ENABLE ROW LEVEL SECURITY;

-- ============ DATAROOM ============
CREATE TABLE public.dataroom_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  parent_code text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dataroom_folders TO authenticated;
GRANT ALL ON public.dataroom_folders TO service_role;
ALTER TABLE public.dataroom_folders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.dataroom_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_code text NOT NULL,
  item text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'missing',
  document_id uuid,
  due_date date,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dataroom_checklist TO authenticated;
GRANT ALL ON public.dataroom_checklist TO service_role;
ALTER TABLE public.dataroom_checklist ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['project_pmo','pmo_members','pmo_raci','pmo_decisions','pmo_stakeholders','pmo_meetings','pmo_report_schedule','dataroom_folders','dataroom_checklist']
  LOOP
    EXECUTE format($f$
      CREATE POLICY "%1$s_select" ON public.%1$I FOR SELECT TO authenticated
        USING (project_id IN (SELECT public.user_accessible_projects(auth.uid())));
      CREATE POLICY "%1$s_write" ON public.%1$I FOR ALL TO authenticated
        USING (public.is_admin_or_coordinator(auth.uid()) OR project_id IN (SELECT public.user_accessible_projects(auth.uid())))
        WITH CHECK (public.is_admin_or_coordinator(auth.uid()) OR project_id IN (SELECT public.user_accessible_projects(auth.uid())));
    $f$, t);
    EXECUTE format('CREATE TRIGGER update_%1$s_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
    EXECUTE format('CREATE INDEX idx_%1$s_project ON public.%1$I (project_id)', t);
  END LOOP;
END $$;

-- ============ SEEDING FUNCTION ============
CREATE OR REPLACE FUNCTION public.seed_project_pmo(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
  _start date;
  i integer;
BEGIN
  SELECT name, COALESCE(start_date, CURRENT_DATE) INTO _name, _start FROM public.projects WHERE id = _project_id;
  IF _name IS NULL THEN RETURN; END IF;

  INSERT INTO public.project_pmo (project_id, charter_mission, charter_objectives, charter_scope, governance_manual, doc_management_procedure, deliverable_validation_procedure, meeting_cadence)
  VALUES (
    _project_id,
    'Piloter la mise en oeuvre du projet ' || _name || ' dans le respect des délais, du budget, de la qualité et des engagements contractuels vis-à-vis des bailleurs.',
    E'1. Assurer la planification et le suivi de l''exécution technique et financière.\n2. Garantir la conformité aux procédures bailleurs et nationales.\n3. Assurer la gestion des risques, des changements et des décisions.\n4. Produire le reporting périodique et capitaliser les acquis.',
    E'Coordination générale, planification (PTBA), gestion budgétaire et financière, passation de marchés, suivi-évaluation, gestion documentaire, communication et rapportage.',
    E'Instances de gouvernance :\n- Comité de pilotage (COPIL) : orientation stratégique, validation du PTBA et des rapports annuels — semestriel.\n- Comité technique (COTECH) : arbitrages techniques et suivi de l''avancement — trimestriel.\n- Équipe PMO : gestion opérationnelle quotidienne — réunion hebdomadaire.\nLes décisions du COPIL sont consignées au registre des décisions et notifiées sous 5 jours ouvrés.',
    E'1. Tout document est déposé dans la dataroom du projet, dans le dossier correspondant.\n2. Nomenclature : [CODE PROJET]_[DOSSIER]_[OBJET]_[AAAAMMJJ]_[Vx].\n3. Toute version validée est marquée « validé » dans la checklist.\n4. Les documents contractuels et financiers sont conservés 10 ans.',
    E'1. Rédaction du livrable par le responsable désigné (R).\n2. Revue qualité par le responsable S&E ou technique (C).\n3. Approbation par le coordonnateur du projet (A).\n4. Transmission au bailleur et archivage en dataroom.\nDélai standard de revue : 5 jours ouvrés.',
    'Hebdomadaire (équipe PMO) · Trimestriel (COTECH) · Semestriel (COPIL)'
  ) ON CONFLICT (project_id) DO NOTHING;

  -- Organigramme / membres types
  INSERT INTO public.pmo_members (project_id, full_name, role_title, responsibilities, reports_to, is_steering_committee, sort_order) VALUES
    (_project_id, 'À désigner', 'Coordonnateur du projet', 'Pilotage global, représentation, arbitrages, relation bailleurs', 'Comité de pilotage', true, 1),
    (_project_id, 'À désigner', 'Responsable administratif et financier', 'Budget, trésorerie, comptabilité, rapports financiers, audit', 'Coordonnateur du projet', true, 2),
    (_project_id, 'À désigner', 'Responsable suivi-évaluation', 'Cadre logique, indicateurs, collecte de données, rapports de performance', 'Coordonnateur du projet', false, 3),
    (_project_id, 'À désigner', 'Responsable passation de marchés', 'Plan de passation, appels d''offres, contrats, conformité', 'Coordonnateur du projet', false, 4),
    (_project_id, 'À désigner', 'Responsable technique / opérations', 'Mise en oeuvre des activités, supervision terrain', 'Coordonnateur du projet', false, 5),
    (_project_id, 'À désigner', 'Chargé de communication', 'Visibilité, communication bailleur, capitalisation', 'Coordonnateur du projet', false, 6),
    (_project_id, 'À désigner', 'Assistant(e) administratif(ve)', 'Gestion documentaire, logistique, secrétariat des instances', 'Responsable administratif et financier', false, 7);

  -- Matrice RACI
  INSERT INTO public.pmo_raci (project_id, activity, role_title, raci, sort_order) VALUES
    (_project_id, 'Élaboration du PTBA', 'Coordonnateur du projet', 'A', 1),
    (_project_id, 'Élaboration du PTBA', 'Responsable administratif et financier', 'R', 2),
    (_project_id, 'Élaboration du PTBA', 'Comité de pilotage', 'I', 3),
    (_project_id, 'Exécution budgétaire et paiements', 'Responsable administratif et financier', 'R', 4),
    (_project_id, 'Exécution budgétaire et paiements', 'Coordonnateur du projet', 'A', 5),
    (_project_id, 'Passation de marchés', 'Responsable passation de marchés', 'R', 6),
    (_project_id, 'Passation de marchés', 'Coordonnateur du projet', 'A', 7),
    (_project_id, 'Collecte et analyse des indicateurs', 'Responsable suivi-évaluation', 'R', 8),
    (_project_id, 'Collecte et analyse des indicateurs', 'Responsable technique / opérations', 'C', 9),
    (_project_id, 'Rapport mensuel d''activités', 'Responsable suivi-évaluation', 'R', 10),
    (_project_id, 'Rapport mensuel d''activités', 'Coordonnateur du projet', 'A', 11),
    (_project_id, 'Gestion des risques', 'Coordonnateur du projet', 'A', 12),
    (_project_id, 'Gestion des risques', 'Responsable suivi-évaluation', 'R', 13),
    (_project_id, 'Gestion documentaire / dataroom', 'Assistant(e) administratif(ve)', 'R', 14),
    (_project_id, 'Communication et visibilité', 'Chargé de communication', 'R', 15);

  -- Parties prenantes types
  INSERT INTO public.pmo_stakeholders (project_id, name, category, influence, interest, engagement_strategy, sort_order) VALUES
    (_project_id, 'Bailleur(s) de fonds', 'bailleur', 'high', 'high', 'Rapportage périodique, missions de supervision, participation au COPIL', 1),
    (_project_id, 'Ministère de tutelle', 'institution', 'high', 'high', 'Présidence du COPIL, validation des orientations', 2),
    (_project_id, 'Bénéficiaires directs', 'beneficiaire', 'low', 'high', 'Consultations, enquêtes de satisfaction, restitutions', 3),
    (_project_id, 'Partenaires de mise en oeuvre', 'partenaire', 'medium', 'high', 'Conventions, réunions techniques trimestrielles', 4),
    (_project_id, 'Autorités locales', 'institution', 'medium', 'medium', 'Information, implication dans les activités terrain', 5);

  -- Calendrier des réunions
  INSERT INTO public.pmo_meetings (project_id, title, meeting_type, frequency, scheduled_at, agenda, status) VALUES
    (_project_id, 'Réunion hebdomadaire de l''équipe PMO', 'equipe', 'hebdomadaire', (_start + interval '7 days')::timestamptz, 'Avancement des activités, points de blocage, actions de la semaine', 'planned'),
    (_project_id, 'Comité technique (COTECH)', 'cotech', 'trimestrielle', (_start + interval '3 months')::timestamptz, 'Revue technique, exécution budgétaire, indicateurs, risques', 'planned'),
    (_project_id, 'Comité de pilotage (COPIL)', 'copil', 'semestrielle', (_start + interval '6 months')::timestamptz, 'Validation du PTBA, revue stratégique, décisions d''orientation', 'planned');

  -- Calendrier de reporting (12 rapports mensuels + trimestriels + annuel)
  FOR i IN 1..12 LOOP
    INSERT INTO public.pmo_report_schedule (project_id, title, report_type, period_label, due_date, owner_role, template_key, sort_order)
    VALUES (_project_id,
      'Rapport mensuel d''activités — ' || to_char(_start + ((i-1) || ' months')::interval, 'TMMonth YYYY'),
      'mensuel',
      to_char(_start + ((i-1) || ' months')::interval, 'MM/YYYY'),
      (date_trunc('month', _start + (i || ' months')::interval) + interval '9 days')::date,
      'Responsable suivi-évaluation', 'monthly_activity', i);
  END LOOP;
  INSERT INTO public.pmo_report_schedule (project_id, title, report_type, period_label, due_date, owner_role, template_key, sort_order) VALUES
    (_project_id, 'Rapport financier trimestriel — T1', 'trimestriel', 'T1', (_start + interval '3 months' + interval '15 days')::date, 'Responsable administratif et financier', 'quarterly_finance', 20),
    (_project_id, 'Rapport annuel bailleur', 'annuel', 'Année 1', (_start + interval '12 months' + interval '30 days')::date, 'Coordonnateur du projet', 'annual_donor', 30);

  -- Dataroom : arborescence standard bailleur
  INSERT INTO public.dataroom_folders (project_id, code, name, description, sort_order) VALUES
    (_project_id, '01', '01 — Contractuel', 'Convention de financement, avenants, accords de partenariat', 1),
    (_project_id, '02', '02 — Budget & Finance', 'Budget approuvé, PTBA, états financiers, relevés bancaires', 2),
    (_project_id, '03', '03 — Passation de marchés', 'Plan de passation, DAO, contrats, PV d''attribution', 3),
    (_project_id, '04', '04 — Rapports', 'Rapports mensuels, trimestriels, annuels et rapports bailleurs', 4),
    (_project_id, '05', '05 — Suivi & Évaluation', 'Cadre logique, plan S&E, données de collecte, évaluations', 5),
    (_project_id, '06', '06 — Ressources humaines', 'Contrats, TDR, fiches de poste, feuilles de temps', 6),
    (_project_id, '07', '07 — Audit & Conformité', 'Rapports d''audit, lettres de management, conformité');

  -- Checklist des pièces obligatoires
  INSERT INTO public.dataroom_checklist (project_id, folder_code, item, is_required, sort_order) VALUES
    (_project_id, '01', 'Convention de financement signée', true, 1),
    (_project_id, '01', 'Accords de partenariat / conventions de mise en oeuvre', true, 2),
    (_project_id, '01', 'Avenants éventuels', false, 3),
    (_project_id, '02', 'Budget détaillé approuvé', true, 4),
    (_project_id, '02', 'Plan de travail et budget annuel (PTBA)', true, 5),
    (_project_id, '02', 'Plan de trésorerie', true, 6),
    (_project_id, '02', 'États financiers périodiques', true, 7),
    (_project_id, '03', 'Plan de passation de marchés', true, 8),
    (_project_id, '03', 'Manuel de procédures de passation', true, 9),
    (_project_id, '03', 'Contrats fournisseurs et PV d''attribution', true, 10),
    (_project_id, '04', 'Rapport de démarrage', true, 11),
    (_project_id, '04', 'Rapports mensuels d''activités', true, 12),
    (_project_id, '04', 'Rapports annuels bailleurs', true, 13),
    (_project_id, '05', 'Cadre logique validé', true, 14),
    (_project_id, '05', 'Plan de suivi-évaluation (PMP)', true, 15),
    (_project_id, '05', 'Étude de référence (baseline)', true, 16),
    (_project_id, '05', 'Théorie du changement', false, 17),
    (_project_id, '06', 'Organigramme du projet', true, 18),
    (_project_id, '06', 'Contrats de travail de l''équipe PMO', true, 19),
    (_project_id, '06', 'Fiches de poste et TDR', true, 20),
    (_project_id, '07', 'Manuel de procédures administratives et financières', true, 21),
    (_project_id, '07', 'Rapport d''audit annuel', true, 22),
    (_project_id, '07', 'Registre des risques à jour', true, 23),
    (_project_id, '07', 'Charte du PMO signée', true, 24);
END $$;

CREATE OR REPLACE FUNCTION public.tg_seed_project_pmo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_project_pmo(NEW.id);
  RETURN NEW;
END $$;

CREATE TRIGGER seed_pmo_on_project_insert
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.tg_seed_project_pmo();