// Liste centralisée des secteurs d'activité utilisés dans toute la plateforme
export const SECTORS = [
  "Agriculture",
  "Agritech",
  "Agroalimentaire",
  "Artisanat",
  "Cleantech",
  "Commerce",
  "Construction",
  "Consulting",
  "Édition / Médias",
  "Éducation / EdTech",
  "Énergie",
  "Environnement",
  "Finance / Fintech",
  "Industrie",
  "Logistique / Transport",
  "Mode / Textile",
  "Numérique / IT",
  "Restauration",
  "Santé / HealthTech",
  "Services aux entreprises",
  "Tourisme",
  "Eau & Assainissement",
  "Autre",
] as const;

export type SectorValue = (typeof SECTORS)[number];

export const STARTUP_STAGES = [
  { value: "ideation", label: "Idéation" },
  { value: "prototype", label: "Prototype" },
  { value: "mvp", label: "MVP" },
  { value: "incubation", label: "Incubation" },
  { value: "accélération", label: "Accélération" },
  { value: "croissance", label: "Croissance" },
  { value: "scale", label: "Scale-up" },
] as const;
