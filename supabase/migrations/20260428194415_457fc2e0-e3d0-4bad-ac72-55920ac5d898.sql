UPDATE projects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{abreviations}',
  '[
    {"sigle":"PAERID","signification":"Projet d''Appui à l''Entrepreneuriat Rural Innovant et Durable"},
    {"sigle":"TPE/PME","signification":"Très Petites Entreprises / Petites et Moyennes Entreprises"},
    {"sigle":"NINEA","signification":"Numéro d''Identification National des Entreprises et Associations"},
    {"sigle":"RCCM","signification":"Registre du Commerce et du Crédit Mobilier"},
    {"sigle":"ODD","signification":"Objectifs de Développement Durable"},
    {"sigle":"ENR","signification":"Énergies Renouvelables"},
    {"sigle":"SFD","signification":"Systèmes Financiers Décentralisés (microfinance)"},
    {"sigle":"WP","signification":"Work Package (Lot de travaux)"},
    {"sigle":"OS","signification":"Objectif Spécifique"},
    {"sigle":"KPI","signification":"Key Performance Indicator (Indicateur clé de performance)"},
    {"sigle":"M&E / S&E","signification":"Monitoring & Evaluation / Suivi & Évaluation"},
    {"sigle":"MEAL","signification":"Monitoring, Evaluation, Accountability & Learning"},
    {"sigle":"AFD","signification":"Agence Française de Développement"},
    {"sigle":"BAD","signification":"Banque Africaine de Développement"},
    {"sigle":"UE","signification":"Union Européenne"},
    {"sigle":"NDC","signification":"Nationally Determined Contributions (Contributions nationales climat)"},
    {"sigle":"FCFA / XOF","signification":"Franc CFA d''Afrique de l''Ouest"},
    {"sigle":"USD","signification":"Dollar des États-Unis"},
    {"sigle":"R&D","signification":"Recherche et Développement"},
    {"sigle":"B2B","signification":"Business-to-Business"},
    {"sigle":"OECD-DAC","signification":"Comité d''Aide au Développement de l''OCDE"}
  ]'::jsonb,
  true
)
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';