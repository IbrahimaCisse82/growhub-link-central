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
  IF EXISTS (SELECT 1 FROM public.project_pmo WHERE project_id = _project_id) THEN RETURN; END IF;

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
  );

  INSERT INTO public.pmo_members (project_id, full_name, role_title, responsibilities, reports_to, is_steering_committee, sort_order) VALUES
    (_project_id, 'À désigner', 'Coordonnateur du projet', 'Pilotage global, représentation, arbitrages, relation bailleurs', 'Comité de pilotage', true, 1),
    (_project_id, 'À désigner', 'Responsable administratif et financier', 'Budget, trésorerie, comptabilité, rapports financiers, audit', 'Coordonnateur du projet', true, 2),
    (_project_id, 'À désigner', 'Responsable suivi-évaluation', 'Cadre logique, indicateurs, collecte de données, rapports de performance', 'Coordonnateur du projet', false, 3),
    (_project_id, 'À désigner', 'Responsable passation de marchés', 'Plan de passation, appels d''offres, contrats, conformité', 'Coordonnateur du projet', false, 4),
    (_project_id, 'À désigner', 'Responsable technique / opérations', 'Mise en oeuvre des activités, supervision terrain', 'Coordonnateur du projet', false, 5),
    (_project_id, 'À désigner', 'Chargé de communication', 'Visibilité, communication bailleur, capitalisation', 'Coordonnateur du projet', false, 6),
    (_project_id, 'À désigner', 'Assistant(e) administratif(ve)', 'Gestion documentaire, logistique, secrétariat des instances', 'Responsable administratif et financier', false, 7);

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

  INSERT INTO public.pmo_stakeholders (project_id, name, category, influence, interest, engagement_strategy, sort_order) VALUES
    (_project_id, 'Bailleur(s) de fonds', 'bailleur', 'high', 'high', 'Rapportage périodique, missions de supervision, participation au COPIL', 1),
    (_project_id, 'Ministère de tutelle', 'institution', 'high', 'high', 'Présidence du COPIL, validation des orientations', 2),
    (_project_id, 'Bénéficiaires directs', 'beneficiaire', 'low', 'high', 'Consultations, enquêtes de satisfaction, restitutions', 3),
    (_project_id, 'Partenaires de mise en oeuvre', 'partenaire', 'medium', 'high', 'Conventions, réunions techniques trimestrielles', 4),
    (_project_id, 'Autorités locales', 'institution', 'medium', 'medium', 'Information, implication dans les activités terrain', 5);

  INSERT INTO public.pmo_meetings (project_id, title, meeting_type, frequency, scheduled_at, agenda, status) VALUES
    (_project_id, 'Réunion hebdomadaire de l''équipe PMO', 'equipe', 'hebdomadaire', (_start + interval '7 days')::timestamptz, 'Avancement des activités, points de blocage, actions de la semaine', 'planned'),
    (_project_id, 'Comité technique (COTECH)', 'cotech', 'trimestrielle', (_start + interval '3 months')::timestamptz, 'Revue technique, exécution budgétaire, indicateurs, risques', 'planned'),
    (_project_id, 'Comité de pilotage (COPIL)', 'copil', 'semestrielle', (_start + interval '6 months')::timestamptz, 'Validation du PTBA, revue stratégique, décisions d''orientation', 'planned');

  FOR i IN 1..12 LOOP
    INSERT INTO public.pmo_report_schedule (project_id, title, report_type, period_label, due_date, owner_role, template_key, sort_order)
    VALUES (_project_id,
      'Rapport mensuel d''activités — ' || to_char(_start + ((i-1) || ' months')::interval, 'MM/YYYY'),
      'mensuel',
      to_char(_start + ((i-1) || ' months')::interval, 'MM/YYYY'),
      (date_trunc('month', _start + (i || ' months')::interval) + interval '9 days')::date,
      'Responsable suivi-évaluation', 'monthly_activity', i);
  END LOOP;
  INSERT INTO public.pmo_report_schedule (project_id, title, report_type, period_label, due_date, owner_role, template_key, sort_order) VALUES
    (_project_id, 'Rapport financier trimestriel — T1', 'trimestriel', 'T1', (_start + interval '3 months' + interval '15 days')::date, 'Responsable administratif et financier', 'quarterly_finance', 20),
    (_project_id, 'Rapport annuel bailleur', 'annuel', 'Année 1', (_start + interval '12 months' + interval '30 days')::date, 'Coordonnateur du projet', 'annual_donor', 30);

  INSERT INTO public.dataroom_folders (project_id, code, name, description, sort_order) VALUES
    (_project_id, '01', '01 — Contractuel', 'Convention de financement, avenants, accords de partenariat', 1),
    (_project_id, '02', '02 — Budget & Finance', 'Budget approuvé, PTBA, états financiers, relevés bancaires', 2),
    (_project_id, '03', '03 — Passation de marchés', 'Plan de passation, DAO, contrats, PV d''attribution', 3),
    (_project_id, '04', '04 — Rapports', 'Rapports mensuels, trimestriels, annuels et rapports bailleurs', 4),
    (_project_id, '05', '05 — Suivi & Évaluation', 'Cadre logique, plan S&E, données de collecte, évaluations', 5),
    (_project_id, '06', '06 — Ressources humaines', 'Contrats, TDR, fiches de poste, feuilles de temps', 6),
    (_project_id, '07', '07 — Audit & Conformité', 'Rapports d''audit, lettres de management, conformité', 7)
  ON CONFLICT (project_id, code) DO NOTHING;

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