import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePrograms } from "@/hooks/usePrograms";
import { useGrants } from "@/hooks/useGrants";
import { toast } from "sonner";
import GhButton from "@/components/shared/GhButton";
import { ChevronDown, ChevronRight, Plus, Trash2, FileText, Target, Layers, Lightbulb, Users, RefreshCw, BarChart3, Activity, DollarSign, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";

const inputCls = "flex h-10 w-full rounded-lg border border-input bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";
const textareaCls = inputCls + " h-24 resize-none";
const textareaLgCls = inputCls + " h-36 resize-none";
const labelCls = "text-sm font-medium text-foreground";
const helpCls = "text-[11px] text-muted-foreground mt-1";
const sectionTitleCls = "text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-3";

const STEPS = [
  { key: "identification", label: "1. Identification", icon: FileText },
  { key: "contexte", label: "2. Contexte & Justification", icon: FileText },
  { key: "toc", label: "3. Théorie du changement", icon: RefreshCw },
  { key: "logframe", label: "4. Objectifs & Work Packages", icon: Target },
  { key: "resultats", label: "5. Résultats attendus & KPIs", icon: BarChart3 },
  { key: "strategie", label: "6. Stratégie & Méthodologie", icon: Lightbulb },
  { key: "beneficiaires", label: "7. Bénéficiaires & Partenaires", icon: Users },
  { key: "suivi", label: "8. Suivi-Évaluation & Durabilité", icon: Activity },
  { key: "risques", label: "9. Risques", icon: AlertTriangle },
  { key: "budget", label: "10. Budget prévisionnel", icon: DollarSign },
  { key: "validate", label: "11. Validation", icon: CheckCircle2 },
];

// --- Work Package Draft ---
interface WpDraft { title: string; objective: string; activities: string[]; results: string[]; osMapping: string }
const emptyWp = (): WpDraft => ({ title: "", objective: "", activities: [""], results: [""], osMapping: "" });

// --- KPI per WP ---
interface KpiRow { name: string; category: string; unit: string; baseline: number; target: number; frequency: string; source: string; responsible: string; wpIndex: number; regionalTargets: { kedougou: number; kolda: number; ziguinchor: number } }
const emptyKpi = (wpIndex: number): KpiRow => ({ name: "", category: "output", unit: "", baseline: 0, target: 0, frequency: "quarterly", source: "", responsible: "", wpIndex, regionalTargets: { kedougou: 0, kolda: 0, ziguinchor: 0 } });

// --- Milestone per WP ---
interface MilestoneDraft { title: string; dueDate: string; wpIndex: number }
const emptyMilestone = (wpIndex: number): MilestoneDraft => ({ title: "", dueDate: "", wpIndex });

// --- Risk ---
interface RiskDraft { category: string; description: string; probability: string; impact: string; mitigation: string }
const emptyRisk = (): RiskDraft => ({ category: "", description: "", probability: "moyen", impact: "moyen", mitigation: "" });

// --- Budget Activity (PAERID format) ---
interface BudgetActivity {
  code: string; description: string; category: string; unit: string;
  qty: number; unitCost: number;
  year1: number; year2: number; year3: number; year4: number; year5: number;
  markerGender: string; markerClimate: string; notes: string;
  wpCode: string; // WP1, WP2, ..., GC, SE
}

const emptyBudgetActivity = (wpCode: string, idx: number): BudgetActivity => ({
  code: wpCode === "GC" ? `GC.${idx}` : wpCode === "SE" ? `SE.${idx}` : `A${wpCode.replace("WP","")}.${idx}`,
  description: "", category: "", unit: "", qty: 0, unitCost: 0,
  year1: 0, year2: 0, year3: 0, year4: 0, year5: 0,
  markerGender: "○", markerClimate: "○", notes: "", wpCode,
});

const activityTotal = (a: BudgetActivity) => a.year1 + a.year2 + a.year3 + a.year4 + a.year5;
const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

// --- Metadata interface ---
interface ProjectMetadata {
  introduction?: string; resume_executif?: string;
  abreviations?: { sigle: string; signification: string }[];
  contexte_justification?: string; contexte_territorial?: string;
  contraintes?: string; alignement_strategique?: string; justification?: string;
  strategie_objectif?: string; strategie_axes?: string[];
  strategie_modalites?: string; methodologie?: string;
  population_cible?: string; estimation_beneficiaires?: string;
  personnel_cle?: { role: string; profil: string }[];
  partenaires?: { categorie: string; description: string }[];
  suivi_outils?: string; suivi_evaluation?: string; suivi_rapports?: string;
  plan_sortie?: string;
  secteurs_prioritaires?: string; porteur?: string; alignement_odd?: string;
  version_document?: string; budget_total_label?: string;
  risques?: RiskDraft[];
  contingency_pct?: number; currency?: string;
  mecanismes_apprentissage?: string;
  os_mappings?: string[]; // index aligned with WPs
  wp_details?: Record<string, { title: string; os_mapping: string; objective: string; activities: string; results: string; indicators: string; milestones: string }>;
}

// --- Array Editor ---
function ArrayEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const add = () => onChange([...items, ""]);
  const update = (i: number, v: string) => { const n = [...items]; n[i] = v; onChange(n); };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input value={item} onChange={e => update(i, e.target.value)} placeholder={`${placeholder} ${i + 1}`} className={inputCls} />
          <button type="button" onClick={() => remove(i)} className="text-destructive text-xs px-2 hover:bg-destructive/10 rounded-lg transition-colors">✕</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs text-primary font-semibold hover:underline">+ Ajouter</button>
    </div>
  );
}

// --- WP prefix helpers ---
function flattenWpActivities(wps: WpDraft[]): string[] {
  return wps.flatMap((wp, i) => wp.activities.filter(Boolean).map((a, j) => `A${i + 1}.${j + 1} ${a}`));
}
function flattenWpResults(wps: WpDraft[]): string[] {
  return wps.flatMap((wp, i) => wp.results.filter(Boolean).map((r, j) => `R${i + 1}.${j + 1} ${r}`));
}
function flattenWpObjectives(wps: WpDraft[]): string[] {
  return wps.map(wp => wp.title ? `${wp.title}: ${wp.objective}` : wp.objective);
}

function parseWpsFromLogframe(logframe: { specific_objectives?: unknown; activities?: unknown; expected_results?: unknown; assumptions?: unknown }): WpDraft[] {
  const objectives = toArr(logframe.specific_objectives);
  if (objectives.length === 0) return [emptyWp()];
  // os_mappings stored as JSON in assumptions field via metadata fallback - handled in parent
  return objectives.map((obj, idx) => {
    const wpNum = idx + 1;
    let title = "";
    let objective = obj;
    const colonIdx = obj.indexOf(":");
    if (colonIdx > 0 && colonIdx < 80) { title = obj.substring(0, colonIdx).trim(); objective = obj.substring(colonIdx + 1).trim(); }
    const activities = toArr(logframe.activities).filter(a => new RegExp(`^A${wpNum}\\.\\d`, "i").test(a.trim())).map(a => a.replace(/^A\d+\.\d+\s*/i, "").trim());
    const results = toArr(logframe.expected_results).filter(r => new RegExp(`^R${wpNum}\\.\\d`, "i").test(r.trim())).map(r => r.replace(/^R\d+\.\d+\s*/i, "").trim());
    return { title, objective, activities: activities.length > 0 ? activities : [""], results: results.length > 0 ? results : [""], osMapping: "" };
  });
}

function toArr(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map(v => typeof v === "string" ? v : JSON.stringify(v));
}

const wpColors = ["from-primary/80 to-primary", "from-accent/80 to-accent", "from-emerald-500/80 to-emerald-600", "from-amber-500/80 to-amber-600", "from-violet-500/80 to-violet-600", "from-rose-500/80 to-rose-600"];

// --- Budget default template lines (PAERID structure) ---
function buildDefaultBudgetFromWps(wps: WpDraft[]): BudgetActivity[] {
  const lines: BudgetActivity[] = [];
  wps.forEach((_wp, i) => {
    const wpCode = `WP${i + 1}`;
    lines.push({ ...emptyBudgetActivity(wpCode, 1), description: `Personnel ${wpCode}`, category: "Ressources Humaines", unit: "ETP/an" });
    lines.push({ ...emptyBudgetActivity(wpCode, 2), description: `Activités opérationnelles ${wpCode}`, category: "Formation/Animation", unit: "session" });
  });
  // GC
  lines.push({ ...emptyBudgetActivity("GC", 1), description: "Chef de projet & équipe de coordination", category: "Ressources Humaines", unit: "ETP/an" });
  lines.push({ ...emptyBudgetActivity("GC", 2), description: "Frais de fonctionnement & logistique", category: "Fonctionnement", unit: "forfait/an" });
  lines.push({ ...emptyBudgetActivity("GC", 3), description: "Déplacements & transport terrain", category: "Transport/Logistique", unit: "véhicule/an" });
  lines.push({ ...emptyBudgetActivity("GC", 4), description: "Communication & visibilité projet", category: "Communication", unit: "forfait/an" });
  lines.push({ ...emptyBudgetActivity("GC", 5), description: "Audits financiers annuels", category: "Audit/Contrôle", unit: "audit/an" });
  // SE
  lines.push({ ...emptyBudgetActivity("SE", 1), description: "Système de suivi-évaluation", category: "Consultants/Études", unit: "forfait" });
  lines.push({ ...emptyBudgetActivity("SE", 2), description: "Évaluation à mi-parcours", category: "Évaluation Externe", unit: "mission" });
  lines.push({ ...emptyBudgetActivity("SE", 3), description: "Évaluation finale", category: "Évaluation Externe", unit: "mission" });
  lines.push({ ...emptyBudgetActivity("SE", 4), description: "Études de base & enquêtes endline", category: "Consultants/Études", unit: "étude" });
  lines.push({ ...emptyBudgetActivity("SE", 5), description: "Rapports & publications résultats", category: "Communication", unit: "rapport/an" });
  return lines;
}

const BUDGET_CATEGORIES = [
  "Ressources Humaines", "Formation/Animation", "Consultants/Études", "Prestations-Experts",
  "Subventions/Fonds", "Équipements/TIC", "Infrastructures", "Événementiel",
  "Transport/Logistique", "Fonctionnement", "Communication", "Audit/Contrôle",
  "Évaluation Externe", "R&D Appliquée", "Actions Genre", "Appui Juridique",
  "Certification/Normes", "Appui Technique", "Animation/Réseaux", "Infrastructure TIC",
];

export default function ProjectWizardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(searchParams.get("id"));
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: programs } = usePrograms();
  const { data: grants } = useGrants();
  const qc = useQueryClient();

  // Step 0: Identification (PAERID fiche)
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [programId, setProgramId] = useState("");
  const [grantId, setGrantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [country, setCountry] = useState("");
  const [locations, setLocations] = useState<string[]>([""]);
  const [durationMonths, setDurationMonths] = useState("");
  const [secteurs, setSecteurs] = useState("");
  const [porteur, setPorteur] = useState("");
  const [alignementOdd, setAlignementOdd] = useState("");
  const [versionDoc, setVersionDoc] = useState("");
  const [currency, setCurrency] = useState("USD");

  // Step 1: Contexte & Justification
  const [introduction, setIntroduction] = useState("");
  const [contexteJustification, setContexteJustification] = useState("");
  const [contexteT, setContexteT] = useState("");
  const [contraintes, setContraintes] = useState("");
  const [alignement, setAlignement] = useState("");
  const [justification, setJustification] = useState("");
  const [abreviations, setAbreviations] = useState<{ sigle: string; signification: string }[]>([{ sigle: "", signification: "" }]);

  // Step 2: Théorie du changement
  const [tocInputs, setTocInputs] = useState<string[]>([""]);
  const [tocActivities, setTocActivities] = useState<string[]>([""]);
  const [tocOutputs, setTocOutputs] = useState<string[]>([""]);
  const [tocOutcomes, setTocOutcomes] = useState<string[]>([""]);
  const [tocImpact, setTocImpact] = useState("");
  const [tocAssumptions, setTocAssumptions] = useState<string[]>([""]);
  const [tocRisks, setTocRisks] = useState<string[]>([""]);
  const [mecanismesApprentissage, setMecanismesApprentissage] = useState("");

  // Step 3: Objectifs & WPs
  const [overallObjective, setOverallObjective] = useState("");
  const [wps, setWps] = useState<WpDraft[]>([emptyWp()]);
  const [assumptions, setAssumptions] = useState("");
  const [preConditions, setPreConditions] = useState("");

  // Step 4: Résultats & KPIs
  const [kpis, setKpis] = useState<KpiRow[]>([emptyKpi(0)]);
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([emptyMilestone(0)]);

  // Step 5: Stratégie & Méthodologie
  const [strategieObjectif, setStrategieObjectif] = useState("");
  const [strategieAxes, setStrategieAxes] = useState<string[]>([""]);
  const [strategieModalites, setStrategieModalites] = useState("");
  const [methodologie, setMethodologie] = useState("");

  // Step 6: Bénéficiaires & Partenaires
  const [populationCible, setPopulationCible] = useState("");
  const [estimationBeneficiaires, setEstimationBeneficiaires] = useState("");
  const [personnelCle, setPersonnelCle] = useState<{ role: string; profil: string }[]>([{ role: "", profil: "" }]);
  const [partenaires, setPartenaires] = useState<{ categorie: string; description: string }[]>([{ categorie: "", description: "" }]);

  // Step 7: Suivi-Évaluation & Durabilité
  const [suiviOutils, setSuiviOutils] = useState("");
  const [suiviEvaluation, setSuiviEvaluation] = useState("");
  const [suiviRapports, setSuiviRapports] = useState("");
  const [planSortie, setPlanSortie] = useState("");

  // Step 8: Risques
  const [risks, setRisks] = useState<RiskDraft[]>([emptyRisk()]);

  // Step 9: Budget (PAERID format)
  const [budgetActivities, setBudgetActivities] = useState<BudgetActivity[]>([]);
  const [contingencyPct, setContingencyPct] = useState(7);

  // Computed budget
  const getWpCodes = () => {
    const wpCodes = wps.map((_, i) => `WP${i + 1}`);
    return [...wpCodes, "GC", "SE"];
  };
  const wpSubtotal = (wpCode: string) => budgetActivities.filter(a => a.wpCode === wpCode).reduce((s, a) => s + activityTotal(a), 0);
  const totalDirectCosts = getWpCodes().reduce((s, wc) => s + wpSubtotal(wc), 0);
  const contingencyAmount = Math.round(totalDirectCosts * (contingencyPct / 100));
  const totalBudget = totalDirectCosts + contingencyAmount;

  // Year totals
  const yearTotal = (year: 1|2|3|4|5) => budgetActivities.reduce((s, a) => s + a[`year${year}`], 0);

  // --- Load existing draft ---
  const { data: existingProject } = useQuery({
    queryKey: ["project-draft", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: existingLogframe } = useQuery({
    queryKey: ["project-logframe", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase.from("logical_frameworks").select("*").eq("project_id", projectId).maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  const { data: existingToc } = useQuery({
    queryKey: ["project-toc", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase.from("theory_of_change").select("*").eq("project_id", projectId).maybeSingle();
      return data;
    },
    enabled: !!projectId,
  });

  const { data: existingKpis } = useQuery({
    queryKey: ["project-kpis", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase.from("project_indicators").select("*").eq("project_id", projectId);
      return data;
    },
    enabled: !!projectId,
  });

  const { data: existingMilestones } = useQuery({
    queryKey: ["project-milestones-draft", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase.from("milestones").select("*").eq("project_id", projectId).order("due_date");
      return data;
    },
    enabled: !!projectId,
  });

  const { data: existingBudgetLines } = useQuery({
    queryKey: ["project-budget-lines", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase.from("project_budget_lines").select("*").eq("project_id", projectId);
      return data;
    },
    enabled: !!projectId,
  });

  // Hydrate from existing project
  useEffect(() => {
    if (existingProject) {
      setName(existingProject.name || "");
      setCode(existingProject.code || "");
      setDescription(existingProject.description || "");
      setProgramId(existingProject.program_id || "");
      setStartDate(existingProject.start_date || "");
      setEndDate(existingProject.end_date || "");
      const p = existingProject as any;
      setCountry(p.country || "");
      setLocations(p.locations?.length > 0 ? p.locations : [""]);
      setDurationMonths(p.duration_months ? String(p.duration_months) : "");
      const meta: ProjectMetadata = (p.metadata as ProjectMetadata) || {};
      setIntroduction(meta.introduction || "");
      setContexteJustification(meta.contexte_justification || "");
      setContexteT(meta.contexte_territorial || "");
      setContraintes(meta.contraintes || "");
      setAlignement(meta.alignement_strategique || "");
      setJustification(meta.justification || "");
      setStrategieObjectif(meta.strategie_objectif || "");
      setStrategieAxes(meta.strategie_axes?.length ? meta.strategie_axes : [""]);
      setStrategieModalites(meta.strategie_modalites || "");
      setMethodologie(meta.methodologie || "");
      setPopulationCible(meta.population_cible || "");
      setEstimationBeneficiaires(meta.estimation_beneficiaires || "");
      setPersonnelCle(meta.personnel_cle?.length ? meta.personnel_cle : [{ role: "", profil: "" }]);
      setPartenaires(meta.partenaires?.length ? meta.partenaires : [{ categorie: "", description: "" }]);
      setSuiviOutils(meta.suivi_outils || "");
      setSuiviEvaluation(meta.suivi_evaluation || "");
      setSuiviRapports(meta.suivi_rapports || "");
      setPlanSortie(meta.plan_sortie || "");
      setSecteurs(meta.secteurs_prioritaires || "");
      setPorteur(meta.porteur || "");
      setAlignementOdd(meta.alignement_odd || "");
      setVersionDoc(meta.version_document || "");
      setCurrency(meta.currency || "USD");
      setContingencyPct(meta.contingency_pct ?? 7);
      if (meta.risques?.length) setRisks(meta.risques);
      if (meta.abreviations?.length) setAbreviations(meta.abreviations);
      setMecanismesApprentissage(meta.mecanismes_apprentissage || "");
    }
  }, [existingProject]);

  useEffect(() => {
    if (existingLogframe) {
      setOverallObjective(existingLogframe.overall_objective || "");
      setAssumptions(existingLogframe.assumptions || "");
      setPreConditions(existingLogframe.pre_conditions || "");
      const parsed = parseWpsFromLogframe(existingLogframe);
      // Hydrate osMapping from project metadata
      const meta: ProjectMetadata = ((existingProject as any)?.metadata as ProjectMetadata) || {};
      const osMappings = meta.os_mappings || [];
      setWps(parsed.map((wp, i) => ({ ...wp, osMapping: osMappings[i] || "" })));
    }
  }, [existingLogframe, existingProject]);

  useEffect(() => {
    if (existingToc) {
      setTocInputs((existingToc.inputs as string[] | null)?.length ? (existingToc.inputs as string[]) : [""]);
      setTocActivities((existingToc.activities as string[] | null)?.length ? (existingToc.activities as string[]) : [""]);
      setTocOutputs((existingToc.outputs as string[] | null)?.length ? (existingToc.outputs as string[]) : [""]);
      setTocOutcomes((existingToc.outcomes as string[] | null)?.length ? (existingToc.outcomes as string[]) : [""]);
      setTocImpact(existingToc.impact || "");
      setTocAssumptions((existingToc.assumptions as string[] | null)?.length ? (existingToc.assumptions as string[]) : [""]);
      setTocRisks((existingToc.risks as string[] | null)?.length ? (existingToc.risks as string[]) : [""]);
    }
  }, [existingToc]);

  useEffect(() => {
    if (existingKpis && existingKpis.length > 0) {
      setKpis(existingKpis.map(k => {
        const match = k.name.match(/^I(\d+)\.\d+\s*/i);
        const wpIdx = match ? parseInt(match[1]) - 1 : 0;
        const meta = (k as any).metadata || {};
        const rt = meta.regional_targets || {};
        return { name: k.name.replace(/^I\d+\.\d+\s*/i, "").trim(), category: k.category || "output", unit: k.unit || "", baseline: Number(k.baseline_value) || 0, target: Number(k.target_value) || 0, frequency: k.frequency || "quarterly", source: k.data_source || "", responsible: k.responsible || "", wpIndex: wpIdx, regionalTargets: { kedougou: Number(rt.kedougou) || 0, kolda: Number(rt.kolda) || 0, ziguinchor: Number(rt.ziguinchor) || 0 } };
      }));
    }
  }, [existingKpis]);

  useEffect(() => {
    if (existingMilestones && existingMilestones.length > 0) {
      setMilestones(existingMilestones.map(m => {
        const match = m.title.match(/^M(\d+)\.\d+\s*/i);
        const wpIdx = match ? parseInt(match[1]) - 1 : 0;
        return { title: m.title.replace(/^M\d+\.\d+\s*/i, "").trim(), dueDate: m.due_date || "", wpIndex: wpIdx };
      }));
    }
  }, [existingMilestones]);

  useEffect(() => {
    if (existingBudgetLines && existingBudgetLines.length > 0) {
      setBudgetActivities(existingBudgetLines.map(b => ({
        code: b.code || "", description: b.label, category: (b as any).budget_category || "",
        unit: b.unit || "", qty: Number(b.quantity) || 0, unitCost: Number(b.unit_cost) || 0,
        year1: (b as any).year1 || 0, year2: (b as any).year2 || 0, year3: (b as any).year3 || 0,
        year4: (b as any).year4 || 0, year5: (b as any).year5 || 0,
        markerGender: (b as any).marker_gender || "○", markerClimate: (b as any).marker_climate || "○",
        notes: (b as any).notes || "", wpCode: b.section || "WP1",
      })));
    }
  }, [existingBudgetLines]);

  // Initialize budget when reaching budget step if empty
  useEffect(() => {
    if (step === 9 && budgetActivities.length === 0) {
      setBudgetActivities(buildDefaultBudgetFromWps(wps));
    }
  }, [step]);

  // Resume step
  useEffect(() => {
    if (!projectId || !existingProject) return;
    let resumeStep = 1;
    const p = existingProject as any;
    const meta: ProjectMetadata = (p.metadata as ProjectMetadata) || {};
    if (meta.introduction || meta.justification) resumeStep = 2;
    if (existingToc) resumeStep = 3;
    if (existingLogframe) resumeStep = 4;
    if (existingKpis && existingKpis.length > 0) resumeStep = 5;
    if (meta.strategie_objectif || meta.methodologie) resumeStep = 6;
    if (meta.population_cible) resumeStep = 7;
    if (meta.suivi_outils || meta.plan_sortie) resumeStep = 8;
    if (meta.risques?.length) resumeStep = 9;
    if (existingBudgetLines && existingBudgetLines.length > 0) resumeStep = 10;
    setStep(resumeStep);
  }, [projectId, existingProject, existingLogframe, existingToc, existingKpis, existingBudgetLines]);

  const canNext = () => {
    if (step === 0) return name && programId;
    if (step === 2) return tocImpact;
    if (step === 3) return overallObjective && wps.some(wp => wp.objective);
    if (step === 4) return kpis.some(k => k.name);
    if (step === 9) return budgetActivities.some(b => b.description && activityTotal(b) > 0);
    return true;
  };

  // WP helpers
  const updateWp = (idx: number, partial: Partial<WpDraft>) => { const n = [...wps]; n[idx] = { ...n[idx], ...partial }; setWps(n); };
  const addWp = () => setWps([...wps, emptyWp()]);
  const removeWp = (idx: number) => {
    if (wps.length <= 1) return;
    setWps(wps.filter((_, i) => i !== idx));
    setKpis(kpis.filter(k => k.wpIndex !== idx).map(k => ({ ...k, wpIndex: k.wpIndex > idx ? k.wpIndex - 1 : k.wpIndex })));
    setMilestones(milestones.filter(m => m.wpIndex !== idx).map(m => ({ ...m, wpIndex: m.wpIndex > idx ? m.wpIndex - 1 : m.wpIndex })));
  };

  // --- Build metadata ---
  const buildMetadata = (): ProjectMetadata => ({
    introduction, contexte_justification: contexteJustification, contexte_territorial: contexteT, contraintes, alignement_strategique: alignement, justification,
    abreviations: abreviations.filter(a => a.sigle),
    strategie_objectif: strategieObjectif, strategie_axes: strategieAxes.filter(Boolean), strategie_modalites: strategieModalites,
    methodologie, population_cible: populationCible, estimation_beneficiaires: estimationBeneficiaires,
    personnel_cle: personnelCle.filter(p => p.role), partenaires: partenaires.filter(p => p.categorie),
    suivi_outils: suiviOutils, suivi_evaluation: suiviEvaluation, suivi_rapports: suiviRapports, plan_sortie: planSortie,
    secteurs_prioritaires: secteurs, porteur, alignement_odd: alignementOdd, version_document: versionDoc,
    risques: risks.filter(r => r.description), contingency_pct: contingencyPct, currency,
    mecanismes_apprentissage: mecanismesApprentissage,
    os_mappings: wps.map(wp => wp.osMapping || ""),
  });

  // --- Save functions ---
  const saveStep0 = async () => {
    const meta = buildMetadata();
    if (projectId) {
      await supabase.from("projects").update({
        name, code: code || null, description: description || null,
        program_id: programId, start_date: startDate || null, end_date: endDate || null,
        country: country || null, locations: locations.filter(Boolean).length > 0 ? locations.filter(Boolean) : null,
        duration_months: durationMonths ? parseInt(durationMonths) : null, metadata: meta as any,
      } as any).eq("id", projectId).throwOnError();
      return projectId;
    } else {
      const { data } = await supabase.from("projects").insert({
        name, code: code || null, description: description || null,
        program_id: programId, owner_id: user?.id,
        start_date: startDate || null, end_date: endDate || null,
        status: "draft", validation_status: "draft",
        country: country || null, locations: locations.filter(Boolean).length > 0 ? locations.filter(Boolean) : null,
        duration_months: durationMonths ? parseInt(durationMonths) : null, metadata: meta as any,
      } as any).select("id").single().throwOnError();
      return data.id;
    }
  };

  const saveMetadata = async (pid: string) => {
    const meta = buildMetadata();
    await supabase.from("projects").update({ metadata: meta as any } as any).eq("id", pid).throwOnError();
  };

  const saveLogframe = async (pid: string) => {
    await supabase.from("logical_frameworks").upsert({
      project_id: pid, overall_objective: overallObjective,
      specific_objectives: flattenWpObjectives(wps), expected_results: flattenWpResults(wps),
      activities: flattenWpActivities(wps), assumptions: assumptions || null, pre_conditions: preConditions || null,
    }, { onConflict: "project_id" }).throwOnError();
  };

  const saveToc = async (pid: string) => {
    await supabase.from("theory_of_change").upsert({
      project_id: pid, inputs: tocInputs.filter(Boolean), activities: tocActivities.filter(Boolean),
      outputs: tocOutputs.filter(Boolean), outcomes: tocOutcomes.filter(Boolean),
      impact: tocImpact, assumptions: tocAssumptions.filter(Boolean), risks: tocRisks.filter(Boolean),
    }, { onConflict: "project_id" }).throwOnError();
  };

  const saveKpisMilestones = async (pid: string) => {
    await supabase.from("project_indicators").delete().eq("project_id", pid);
    const validKpis = kpis.filter(k => k.name);
    if (validKpis.length > 0) {
      const kpiCounters: Record<number, number> = {};
      await supabase.from("project_indicators").insert(
        validKpis.map(k => {
          kpiCounters[k.wpIndex] = (kpiCounters[k.wpIndex] || 0) + 1;
          return { project_id: pid, name: `I${k.wpIndex + 1}.${kpiCounters[k.wpIndex]} ${k.name}`, category: k.category, unit: k.unit || null, baseline_value: k.baseline, target_value: k.target, frequency: k.frequency, data_source: k.source || null, responsible: k.responsible || null, metadata: { regional_targets: k.regionalTargets } as any };
        })
      ).throwOnError();
    }
    await supabase.from("milestones").delete().eq("project_id", pid);
    const validMilestones = milestones.filter(m => m.title);
    if (validMilestones.length > 0) {
      const mCounters: Record<number, number> = {};
      await supabase.from("milestones").insert(
        validMilestones.map(m => {
          mCounters[m.wpIndex] = (mCounters[m.wpIndex] || 0) + 1;
          return { project_id: pid, title: `M${m.wpIndex + 1}.${mCounters[m.wpIndex]} ${m.title}`, due_date: m.dueDate || null, status: "pending" };
        })
      ).throwOnError();
    }
  };

  const saveBudget = async (pid: string) => {
    await supabase.from("project_budget_lines").delete().eq("project_id", pid);
    const validBudget = budgetActivities.filter(b => b.description);
    if (validBudget.length > 0) {
      await supabase.from("project_budget_lines").insert(
        validBudget.map(b => ({
          project_id: pid, category: b.wpCode.startsWith("WP") ? "operational" : b.wpCode === "GC" ? "management" : "monitoring",
          label: b.description, code: b.code, section: b.wpCode,
          unit: b.unit || null, quantity: b.qty, unit_cost: b.unitCost, allocation_pct: 100, funding_source: null,
          year1: b.year1, year2: b.year2, year3: b.year3, year4: b.year4, year5: b.year5,
          marker_gender: b.markerGender, marker_climate: b.markerClimate,
          budget_category: b.category, notes: b.notes || null,
        } as any))
      ).throwOnError();
    }
    await supabase.from("projects").update({ budget: totalBudget }).eq("id", pid);
    if (grantId) {
      const { data: eb } = await supabase.from("budgets").select("id").eq("project_id", pid).eq("grant_id", grantId).maybeSingle();
      if (!eb) {
        await supabase.from("budgets").insert({ project_id: pid, grant_id: grantId, category: "projet", label: `Budget ${name}`, amount_planned: totalBudget, amount_spent: 0 });
      } else {
        await supabase.from("budgets").update({ amount_planned: totalBudget }).eq("id", eb.id);
      }
    }
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      let pid = projectId;
      if (step === 0) {
        pid = await saveStep0();
        setProjectId(pid); setSearchParams({ id: pid });
        qc.invalidateQueries({ queryKey: ["project-draft", pid] });
      } else if (step === 1 && pid) { await saveMetadata(pid); }
      else if (step === 2 && pid) { await saveToc(pid); qc.invalidateQueries({ queryKey: ["project-toc", pid] }); }
      else if (step === 3 && pid) { await saveLogframe(pid); qc.invalidateQueries({ queryKey: ["project-logframe", pid] }); }
      else if (step === 4 && pid) { await saveKpisMilestones(pid); qc.invalidateQueries({ queryKey: ["project-kpis", pid] }); qc.invalidateQueries({ queryKey: ["project-milestones-draft", pid] }); }
      else if (step === 5 && pid) { await saveMetadata(pid); }
      else if (step === 6 && pid) { await saveMetadata(pid); }
      else if (step === 7 && pid) { await saveMetadata(pid); }
      else if (step === 8 && pid) { await saveMetadata(pid); }
      else if (step === 9 && pid) { await saveBudget(pid); qc.invalidateQueries({ queryKey: ["project-budget-lines", pid] }); }
      toast.success("Données enregistrées ✓");
      setStep(step + 1);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const submitProject = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("Projet introuvable");
      await supabase.from("projects").update({ validation_status: "pending_review", budget: totalBudget }).eq("id", projectId).throwOnError();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Projet soumis pour validation !"); navigate("/app/projets"); },
    onError: (e) => toast.error((e as Error).message),
  });

  // Compute start year from startDate
  const startYear = startDate ? parseInt(startDate.split("-")[0]) : new Date().getFullYear();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-display font-bold text-foreground">Document de projet</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Parcours structuré — Standard bailleurs de fonds (AFD, UE, Enabel, BAD)
          {projectId && <span className="ml-2 text-primary font-mono text-[10px]">Brouillon enregistré</span>}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-8 bg-card border border-border rounded-xl p-2 overflow-x-auto">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <button key={s.key} onClick={() => i <= step && setStep(i)}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                i === step ? "bg-primary text-primary-foreground shadow-sm" :
                i < step ? "bg-surface-2 text-foreground cursor-pointer hover:bg-surface-3" :
                "text-muted-foreground cursor-default"
              }`}>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden 2xl:inline whitespace-nowrap">{s.label}</span>
              <span className="2xl:hidden">{i + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="bg-card border border-border rounded-xl p-6">

          {/* ── STEP 0: Identification (Fiche PAERID) ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">1. Identification du projet</h2>
                <p className={helpCls}>Fiche signalétique du projet : intitulé, rattachement, zone d'intervention, durée, budget et alignement stratégique.</p>
              </div>
              <div className="space-y-2 col-span-2"><label className={labelCls}>Intitulé du projet *</label><input value={name} onChange={e => setName(e.target.value)} required className={inputCls} placeholder="Ex: Projet d'Appui à l'Entrepreneuriat Rural Innovant et Durable (PAERID)" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className={labelCls}>Code</label><input value={code} onChange={e => setCode(e.target.value)} className={inputCls} placeholder="PRJ-2026-001" /></div>
                <div className="space-y-2"><label className={labelCls}>Version du document</label><input value={versionDoc} onChange={e => setVersionDoc(e.target.value)} className={inputCls} placeholder="Version finale — 2025" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className={labelCls}>Pays *</label><input value={country} onChange={e => setCountry(e.target.value)} className={inputCls} placeholder="République du Sénégal" /></div>
                <div className="space-y-2"><label className={labelCls}>Porteur du projet</label><input value={porteur} onChange={e => setPorteur(e.target.value)} className={inputCls} placeholder="Ex: GROW HUB SARL" /></div>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Zones d'intervention</label>
                <ArrayEditor items={locations} onChange={setLocations} placeholder="Région / Ville" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className={labelCls}>Secteurs prioritaires</label><input value={secteurs} onChange={e => setSecteurs(e.target.value)} className={inputCls} placeholder="Élevage, agro-industrie, chaînes de valeur rurales" /></div>
                <div className="space-y-2"><label className={labelCls}>Alignement ODD</label><input value={alignementOdd} onChange={e => setAlignementOdd(e.target.value)} className={inputCls} placeholder="ODD 1, 2, 5, 8, 9, 13" /></div>
              </div>
              <div className="space-y-2"><label className={labelCls}>Programme de rattachement *</label>
                <select value={programId} onChange={e => setProgramId(e.target.value)} required className={inputCls}>
                  <option value="">Sélectionner…</option>
                  {programs?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
              </div>
              <div className="space-y-2"><label className={labelCls}>Grant / Subvention associée</label>
                <select value={grantId} onChange={e => setGrantId(e.target.value)} className={inputCls}>
                  <option value="">Aucune (optionnel)</option>
                  {grants?.map(g => <option key={g.id} value={g.id}>{g.name} — {g.code}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2"><label className={labelCls}>Date de début</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} /></div>
                <div className="space-y-2"><label className={labelCls}>Date de fin</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} /></div>
                <div className="space-y-2"><label className={labelCls}>Durée (mois)</label><input type="number" value={durationMonths} onChange={e => setDurationMonths(e.target.value)} className={inputCls} placeholder="60" /></div>
                <div className="space-y-2"><label className={labelCls}>Devise</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls}>
                    <option value="USD">USD</option><option value="EUR">EUR</option><option value="XOF">XOF (FCFA)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2"><label className={labelCls}>Résumé exécutif</label><textarea value={description} onChange={e => setDescription(e.target.value)} className={textareaLgCls} placeholder="Le Projet … est un projet de développement économique intégré d'une durée de…" /></div>
            </div>
          )}

          {/* ── STEP 1: Contexte et justification ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">2. Contexte et justification</h2>
                <p className={helpCls}>Sections 2 et 3 du document de projet — Introduction, contexte territorial, contraintes, alignement et justification.</p>
              </div>
              <div className="space-y-2"><label className={labelCls}>2. Introduction</label><textarea value={introduction} onChange={e => setIntroduction(e.target.value)} className={textareaLgCls} placeholder="Présentation générale du contexte et de la problématique…" /></div>
              <div className="space-y-2"><label className={labelCls}>3. Contexte et justification du projet</label><textarea value={contexteJustification} onChange={e => setContexteJustification(e.target.value)} className={textareaLgCls} placeholder="Contexte global et justification du projet…" /></div>
              <div className="space-y-2"><label className={labelCls}>3.1 Contexte territorial</label><textarea value={contexteT} onChange={e => setContexteT(e.target.value)} className={textareaLgCls} placeholder="Description du contexte géographique, socio-économique et institutionnel…" /></div>
              <div className="space-y-2"><label className={labelCls}>3.2 Contraintes structurelles et vulnérabilités</label><textarea value={contraintes} onChange={e => setContraintes(e.target.value)} className={textareaLgCls} placeholder="Contraintes identifiées : accès limité aux financements, faible productivité…" /></div>
              <div className="space-y-2"><label className={labelCls}>3.3 Alignement avec les orientations stratégiques</label><textarea value={alignement} onChange={e => setAlignement(e.target.value)} className={textareaCls} placeholder="Cohérence avec les politiques nationales, ODD, NDC…" /></div>
              <div className="space-y-2"><label className={labelCls}>3.4 Justification de l'intervention</label><textarea value={justification} onChange={e => setJustification(e.target.value)} className={textareaLgCls} placeholder="Pourquoi ce projet est nécessaire et comment il répond aux problèmes…" /></div>
            </div>
          )}

          {/* ── STEP 2: Théorie du changement ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">4. Théorie du changement</h2>
                <p className={helpCls}>Section 4 — Cheminement du changement, hypothèses clés et mécanismes d'adaptation.</p>
              </div>
              <div className="flex items-center gap-2 py-3 overflow-x-auto">
                {["Intrants", "Activités", "Extrants", "Effets", "Impact"].map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    {i > 0 && <span className="text-muted-foreground">→</span>}
                    <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs font-semibold text-foreground whitespace-nowrap">{label}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2"><label className={labelCls}>Intrants</label><ArrayEditor items={tocInputs} onChange={setTocInputs} placeholder="Intrant" /></div>
              <div className="space-y-2"><label className={labelCls}>Activités</label><ArrayEditor items={tocActivities} onChange={setTocActivities} placeholder="Activité" /></div>
              <div className="space-y-2"><label className={labelCls}>Extrants (Outputs)</label><ArrayEditor items={tocOutputs} onChange={setTocOutputs} placeholder="Extrant" /></div>
              <div className="space-y-2"><label className={labelCls}>Effets (Outcomes)</label><ArrayEditor items={tocOutcomes} onChange={setTocOutcomes} placeholder="Effet" /></div>
              <div className="space-y-2"><label className={labelCls}>Impact *</label><textarea value={tocImpact} onChange={e => setTocImpact(e.target.value)} required className={textareaCls} placeholder="Le changement transformationnel à long terme…" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className={labelCls}>Hypothèses clés</label><ArrayEditor items={tocAssumptions} onChange={setTocAssumptions} placeholder="Hypothèse" /></div>
                <div className="space-y-2"><label className={labelCls}>Risques</label><ArrayEditor items={tocRisks} onChange={setTocRisks} placeholder="Risque" /></div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Objectifs & Work Packages ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">5. Objectifs & Work Packages</h2>
                <p className={helpCls}>Section 5 & 7 — Objectif général, objectifs spécifiques et architecture opérationnelle par Work Packages.</p>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Objectif général du projet *</label>
                <textarea value={overallObjective} onChange={e => setOverallObjective(e.target.value)} required className={textareaCls} placeholder="Contribuer à la transformation durable des économies rurales…" />
              </div>
              <div className="space-y-4">
                {wps.map((wp, i) => (
                  <WpEditor key={i} wp={wp} index={i} total={wps.length} onChange={partial => updateWp(i, partial)} onRemove={() => removeWp(i)} />
                ))}
                <button type="button" onClick={addWp} className="w-full py-3 border-2 border-dashed border-primary/30 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Ajouter un Work Package
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className={labelCls}>Hypothèses / Assumptions</label><textarea value={assumptions} onChange={e => setAssumptions(e.target.value)} className={textareaCls} placeholder="Hypothèses sous-jacentes au cadre logique…" /></div>
                <div className="space-y-2"><label className={labelCls}>Pré-conditions</label><textarea value={preConditions} onChange={e => setPreConditions(e.target.value)} className={textareaCls} placeholder="Conditions préalables à la mise en œuvre…" /></div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Résultats attendus & KPIs ── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">6. Résultats attendus & Indicateurs KPIs</h2>
                <p className={helpCls}>Section 6 — Définissez les indicateurs SMART et jalons pour chaque Work Package.</p>
              </div>
              {wps.map((wp, wpIdx) => (
                <div key={wpIdx} className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${wpColors[wpIdx % wpColors.length]} flex items-center justify-center text-white font-bold text-xs shrink-0`}>WP{wpIdx + 1}</div>
                    <div className="text-sm font-bold text-foreground truncate">{wp.title || `Work Package ${wpIdx + 1}`}</div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-foreground uppercase tracking-wider">Indicateurs</label>
                      <div className="space-y-3 mt-2">
                        {kpis.filter(k => k.wpIndex === wpIdx).map((kpi, i) => {
                          const globalIdx = kpis.indexOf(kpi);
                          return (
                            <div key={globalIdx} className="border border-border rounded-lg p-3 bg-surface-2 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-mono text-muted-foreground">I{wpIdx + 1}.{i + 1}</span>
                                <button type="button" onClick={() => setKpis(kpis.filter((_, j) => j !== globalIdx))} className="text-destructive text-xs hover:underline">Supprimer</button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2"><input value={kpi.name} onChange={e => { const n = [...kpis]; n[globalIdx] = { ...n[globalIdx], name: e.target.value }; setKpis(n); }} className={inputCls} placeholder="Nom de l'indicateur *" /></div>
                                <select value={kpi.category} onChange={e => { const n = [...kpis]; n[globalIdx] = { ...n[globalIdx], category: e.target.value }; setKpis(n); }} className={inputCls}>
                                  <option value="input">Intrant</option><option value="activity">Activité</option><option value="output">Extrant</option><option value="outcome">Effet</option><option value="impact">Impact</option>
                                </select>
                                <input value={kpi.unit} onChange={e => { const n = [...kpis]; n[globalIdx] = { ...n[globalIdx], unit: e.target.value }; setKpis(n); }} className={inputCls} placeholder="Unité" />
                                <input type="number" value={kpi.baseline} onChange={e => { const n = [...kpis]; n[globalIdx] = { ...n[globalIdx], baseline: Number(e.target.value) }; setKpis(n); }} className={inputCls} placeholder="Réf." />
                                <input type="number" value={kpi.target} onChange={e => { const n = [...kpis]; n[globalIdx] = { ...n[globalIdx], target: Number(e.target.value) }; setKpis(n); }} className={inputCls} placeholder="Cible" />
                                <select value={kpi.frequency} onChange={e => { const n = [...kpis]; n[globalIdx] = { ...n[globalIdx], frequency: e.target.value }; setKpis(n); }} className={inputCls}>
                                  <option value="monthly">Mensuelle</option><option value="quarterly">Trimestrielle</option><option value="biannual">Semestrielle</option><option value="annual">Annuelle</option>
                                </select>
                                <input value={kpi.responsible} onChange={e => { const n = [...kpis]; n[globalIdx] = { ...n[globalIdx], responsible: e.target.value }; setKpis(n); }} className={inputCls} placeholder="Responsable" />
                              </div>
                            </div>
                          );
                        })}
                        <button type="button" onClick={() => setKpis([...kpis, emptyKpi(wpIdx)])} className="text-xs text-primary font-semibold hover:underline">+ Ajouter un indicateur</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground uppercase tracking-wider">Jalons</label>
                      <div className="space-y-2 mt-2">
                        {milestones.filter(m => m.wpIndex === wpIdx).map((m, i) => {
                          const globalIdx = milestones.indexOf(m);
                          return (
                            <div key={globalIdx} className="flex gap-2 items-center">
                              <span className="text-[11px] font-mono text-muted-foreground shrink-0 w-8">M{wpIdx + 1}.{i + 1}</span>
                              <input value={m.title} onChange={e => { const n = [...milestones]; n[globalIdx] = { ...n[globalIdx], title: e.target.value }; setMilestones(n); }} className={inputCls} placeholder="Titre du jalon" />
                              <input type="date" value={m.dueDate} onChange={e => { const n = [...milestones]; n[globalIdx] = { ...n[globalIdx], dueDate: e.target.value }; setMilestones(n); }} className={inputCls + " w-40 shrink-0"} />
                              <button type="button" onClick={() => setMilestones(milestones.filter((_, j) => j !== globalIdx))} className="text-destructive text-xs px-2 hover:bg-destructive/10 rounded-lg">✕</button>
                            </div>
                          );
                        })}
                        <button type="button" onClick={() => setMilestones([...milestones, emptyMilestone(wpIdx)])} className="text-xs text-primary font-semibold hover:underline">+ Ajouter un jalon</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── STEP 5: Stratégie & Méthodologie ── */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">7. Stratégie d'implémentation & Méthodologie</h2>
                <p className={helpCls}>Sections 7 & 8 — Objectif de la stratégie, axes d'action, modalités de mise en œuvre et méthodologie.</p>
              </div>
              <div className="space-y-2"><label className={labelCls}>7.1 Objectif de la stratégie</label><textarea value={strategieObjectif} onChange={e => setStrategieObjectif(e.target.value)} className={textareaCls} placeholder="Objectif global de la stratégie d'implémentation…" /></div>
              <div className="space-y-2"><label className={labelCls}>7.2 Principaux axes d'action</label><ArrayEditor items={strategieAxes} onChange={setStrategieAxes} placeholder="Axe stratégique" /></div>
              <div className="space-y-2"><label className={labelCls}>7.3 Modalités de mise en œuvre</label><textarea value={strategieModalites} onChange={e => setStrategieModalites(e.target.value)} className={textareaLgCls} placeholder="Dispositif organisationnel, approche participative, mécanismes de gouvernance…" /></div>
              <div className={sectionTitleCls + " mt-4"}>8. Méthodologie</div>
              <div className="space-y-2"><label className={labelCls}>Approches méthodologiques</label><textarea value={methodologie} onChange={e => setMethodologie(e.target.value)} className={textareaLgCls} placeholder="Approche participative, coaching, intégration du numérique, promotion de l'innovation…" /></div>
            </div>
          )}

          {/* ── STEP 6: Bénéficiaires & Partenaires ── */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">9–13. Bénéficiaires, Personnel & Partenaires</h2>
                <p className={helpCls}>Sections 9-13 — Durée, lieux, population cible, personnel clé et partenaires.</p>
              </div>
              <div className={sectionTitleCls}>11. Population cible / Bénéficiaires</div>
              <div className="space-y-2"><label className={labelCls}>Population cible</label><textarea value={populationCible} onChange={e => setPopulationCible(e.target.value)} className={textareaCls} placeholder="TPE/PME rurales, femmes entrepreneures, jeunes 18-35 ans…" /></div>
              <div className="space-y-2"><label className={labelCls}>Estimation des bénéficiaires</label><textarea value={estimationBeneficiaires} onChange={e => setEstimationBeneficiaires(e.target.value)} className={textareaCls} placeholder="500+ TPE/PME directement accompagnées, 5000 emplois créés…" /></div>

              <div className={sectionTitleCls}>12. Personnel clé</div>
              {personnelCle.map((p, i) => (
                <div key={i} className="border border-border rounded-lg p-3 bg-surface-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono text-muted-foreground">Poste {i + 1}</span>
                    {personnelCle.length > 1 && <button type="button" onClick={() => setPersonnelCle(personnelCle.filter((_, j) => j !== i))} className="text-destructive text-xs hover:underline">Supprimer</button>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={p.role} onChange={e => { const n = [...personnelCle]; n[i] = { ...n[i], role: e.target.value }; setPersonnelCle(n); }} className={inputCls} placeholder="Fonction / Rôle" />
                    <input value={p.profil} onChange={e => { const n = [...personnelCle]; n[i] = { ...n[i], profil: e.target.value }; setPersonnelCle(n); }} className={inputCls} placeholder="Profil recherché" />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setPersonnelCle([...personnelCle, { role: "", profil: "" }])} className="text-xs text-primary font-semibold hover:underline">+ Ajouter un poste</button>

              <div className={sectionTitleCls}>13. Partenaires cibles</div>
              {partenaires.map((p, i) => (
                <div key={i} className="border border-border rounded-lg p-3 bg-surface-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono text-muted-foreground">Partenaire {i + 1}</span>
                    {partenaires.length > 1 && <button type="button" onClick={() => setPartenaires(partenaires.filter((_, j) => j !== i))} className="text-destructive text-xs hover:underline">Supprimer</button>}
                  </div>
                  <select value={p.categorie} onChange={e => { const n = [...partenaires]; n[i] = { ...n[i], categorie: e.target.value }; setPartenaires(n); }} className={inputCls}>
                    <option value="">Catégorie…</option>
                    <option value="institutionnel">Institutionnel & Gouvernemental</option>
                    <option value="financier">Financier</option>
                    <option value="technique">Technique & Recherche</option>
                    <option value="prive">Secteur Privé</option>
                  </select>
                  <textarea value={p.description} onChange={e => { const n = [...partenaires]; n[i] = { ...n[i], description: e.target.value }; setPartenaires(n); }} className={textareaCls} placeholder="Description, rôle et justification…" />
                </div>
              ))}
              <button type="button" onClick={() => setPartenaires([...partenaires, { categorie: "", description: "" }])} className="text-xs text-primary font-semibold hover:underline">+ Ajouter un partenaire</button>
            </div>
          )}

          {/* ── STEP 7: Suivi-Évaluation & Durabilité ── */}
          {step === 7 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">14–15. Suivi-Évaluation & Durabilité</h2>
                <p className={helpCls}>Sections 14 & 15 — Dispositif de S&E, rapports et stratégie de sortie.</p>
              </div>
              <div className={sectionTitleCls}>14. Suivi et Évaluation</div>
              <div className="space-y-2"><label className={labelCls}>14.1 Outils et méthodes de suivi</label><textarea value={suiviOutils} onChange={e => setSuiviOutils(e.target.value)} className={textareaLgCls} placeholder="Tableau de bord KPIs, base de données, rapports d'activités…" /></div>
              <div className="space-y-2"><label className={labelCls}>14.2 Évaluation</label><textarea value={suiviEvaluation} onChange={e => setSuiviEvaluation(e.target.value)} className={textareaCls} placeholder="Évaluation à mi-parcours, évaluation finale…" /></div>
              <div className="space-y-2"><label className={labelCls}>14.3 Rapports et communication des résultats</label><textarea value={suiviRapports} onChange={e => setSuiviRapports(e.target.value)} className={textareaCls} placeholder="Fréquence des rapports, ateliers de restitution…" /></div>
              <div className={sectionTitleCls + " mt-4"}>15. Plan de sortie / Stratégie de durabilité</div>
              <div className="space-y-2"><label className={labelCls}>Exit Strategy</label><textarea value={planSortie} onChange={e => setPlanSortie(e.target.value)} className={textareaLgCls} placeholder="Institutionnalisation des services, diversification des ressources, autonomie des bénéficiaires…" /></div>
            </div>
          )}

          {/* ── STEP 8: Analyse des risques ── */}
          {step === 8 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">16. Analyse des risques et mesures d'atténuation</h2>
                <p className={helpCls}>Section 16 — Identification des risques, probabilité, impact et stratégies de mitigation.</p>
              </div>
              <div className="space-y-3">
                {risks.map((risk, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 bg-surface-2 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-mono text-muted-foreground">Risque {i + 1}</span>
                      {risks.length > 1 && <button type="button" onClick={() => setRisks(risks.filter((_, j) => j !== i))} className="text-destructive text-xs hover:underline">Supprimer</button>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select value={risk.category} onChange={e => { const n = [...risks]; n[i] = { ...n[i], category: e.target.value }; setRisks(n); }} className={inputCls}>
                        <option value="">Catégorie…</option>
                        <option value="politique">Politique / Institutionnel</option>
                        <option value="operationnel">Opérationnel</option>
                        <option value="financier">Financier</option>
                        <option value="climatique">Climatique / Environnemental</option>
                        <option value="social">Social / Genre</option>
                        <option value="securite">Sécurité</option>
                        <option value="technique">Technique</option>
                      </select>
                      <select value={risk.probability} onChange={e => { const n = [...risks]; n[i] = { ...n[i], probability: e.target.value }; setRisks(n); }} className={inputCls}>
                        <option value="faible">Probabilité : Faible</option>
                        <option value="moyen">Probabilité : Moyen</option>
                        <option value="eleve">Probabilité : Élevé</option>
                      </select>
                      <select value={risk.impact} onChange={e => { const n = [...risks]; n[i] = { ...n[i], impact: e.target.value }; setRisks(n); }} className={inputCls}>
                        <option value="faible">Impact : Faible</option>
                        <option value="moyen">Impact : Moyen</option>
                        <option value="eleve">Impact : Élevé</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <input value={risk.description} onChange={e => { const n = [...risks]; n[i] = { ...n[i], description: e.target.value }; setRisks(n); }} className={inputCls} placeholder="Description du risque" />
                      <textarea value={risk.mitigation} onChange={e => { const n = [...risks]; n[i] = { ...n[i], mitigation: e.target.value }; setRisks(n); }} className={textareaCls} placeholder="Mesures d'atténuation prévues…" />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setRisks([...risks, emptyRisk()])} className="text-xs text-primary font-semibold hover:underline">+ Ajouter un risque</button>
              </div>
            </div>
          )}

          {/* ── STEP 9: Budget prévisionnel (PAERID format) ── */}
          {step === 9 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">17. Budget prévisionnel</h2>
                <p className={helpCls}>Récapitulatif par composante (Work Package) et par année — Montants en {currency}.</p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3">
                {getWpCodes().filter(wc => wpSubtotal(wc) > 0 || wc === "GC" || wc === "SE").slice(0, 3).map(wc => (
                  <div key={wc} className="bg-surface-2 border border-border rounded-lg p-3">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground">{wc}</div>
                    <div className="text-sm font-mono font-bold text-foreground mt-1">{fmt(wpSubtotal(wc))} {currency}</div>
                  </div>
                ))}
                <div className="bg-surface-2 border border-primary/30 rounded-lg p-3">
                  <div className="text-[10px] font-mono uppercase text-primary">Total Général</div>
                  <div className="text-sm font-mono font-bold text-primary mt-1">{fmt(totalBudget)} {currency}</div>
                </div>
              </div>

              {/* Budget table per WP */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-secondary">
                        <th className="px-2 py-2 text-left text-[10px] font-mono uppercase text-muted-foreground w-[60px]">Code</th>
                        <th className="px-2 py-2 text-left text-[10px] font-mono uppercase text-muted-foreground">Activité / Description</th>
                        <th className="px-2 py-2 text-left text-[10px] font-mono uppercase text-muted-foreground w-[100px]">Catégorie</th>
                        <th className="px-2 py-2 text-left text-[10px] font-mono uppercase text-muted-foreground w-[60px]">Unité</th>
                        <th className="px-2 py-2 text-right text-[10px] font-mono uppercase text-muted-foreground w-[40px]">Qté</th>
                        <th className="px-2 py-2 text-right text-[10px] font-mono uppercase text-muted-foreground w-[60px]">C.U.</th>
                        <th className="px-2 py-2 text-right text-[10px] font-mono uppercase text-muted-foreground w-[70px]">An.{1}<br/>{startYear}</th>
                        <th className="px-2 py-2 text-right text-[10px] font-mono uppercase text-muted-foreground w-[70px]">An.{2}<br/>{startYear+1}</th>
                        <th className="px-2 py-2 text-right text-[10px] font-mono uppercase text-muted-foreground w-[70px]">An.{3}<br/>{startYear+2}</th>
                        <th className="px-2 py-2 text-right text-[10px] font-mono uppercase text-muted-foreground w-[70px]">An.{4}<br/>{startYear+3}</th>
                        <th className="px-2 py-2 text-right text-[10px] font-mono uppercase text-muted-foreground w-[70px]">An.{5}<br/>{startYear+4}</th>
                        <th className="px-2 py-2 text-right text-[10px] font-mono uppercase text-muted-foreground w-[80px]">Total</th>
                        <th className="w-[24px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {getWpCodes().map(wpCode => {
                        const wpActivities = budgetActivities.filter(a => a.wpCode === wpCode);
                        const wpLabel = wpCode.startsWith("WP") ? `${wpCode} — ${wps[parseInt(wpCode.replace("WP","")) - 1]?.title || ""}` : wpCode === "GC" ? "Gouvernance, Coordination & Gestion" : "Suivi, Évaluation & Communication";
                        const sub = wpSubtotal(wpCode);
                        return (
                          <React.Fragment key={wpCode}>
                            <tr>
                              <td colSpan={13} className={`px-2 py-2 font-mono text-[10px] font-bold uppercase tracking-wider ${
                                wpCode === "GC" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                                wpCode === "SE" ? "bg-violet-500/10 text-violet-700 dark:text-violet-400" :
                                "bg-primary/10 text-primary"
                              }`}>{wpLabel}</td>
                            </tr>
                            {wpActivities.map((act, i) => {
                              const globalIdx = budgetActivities.indexOf(act);
                              return <BudgetActivityRow key={globalIdx} act={act} idx={globalIdx} activities={budgetActivities} setActivities={setBudgetActivities} currency={currency} />;
                            })}
                            <tr className="border-b border-border">
                              <td colSpan={6} className="px-2 py-1.5 text-right text-[10px] font-bold text-foreground uppercase">Sous-total {wpCode}</td>
                              {[1,2,3,4,5].map(y => {
                                const yt = wpActivities.reduce((s, a) => s + a[`year${y as 1|2|3|4|5}`], 0);
                                return <td key={y} className="px-2 py-1.5 text-right font-mono text-[10px] font-bold text-muted-foreground">{fmt(yt)}</td>;
                              })}
                              <td className="px-2 py-1.5 text-right font-mono text-[11px] font-bold text-foreground">{fmt(sub)}</td>
                              <td></td>
                            </tr>
                            {/* Add activity button */}
                            <tr><td colSpan={13} className="px-2 py-1">
                              <button type="button" onClick={() => {
                                const nextIdx = wpActivities.length + 1;
                                setBudgetActivities([...budgetActivities, emptyBudgetActivity(wpCode, nextIdx)]);
                              }} className="text-[10px] text-primary font-semibold hover:underline">+ Activité</button>
                            </td></tr>
                          </React.Fragment>
                        );
                      })}

                      {/* Totals */}
                      <tr className="bg-secondary/50 border-t-2 border-border">
                        <td colSpan={6} className="px-2 py-2 text-right text-[10px] font-bold text-foreground uppercase">Sous-total coûts directs</td>
                        {[1,2,3,4,5].map(y => <td key={y} className="px-2 py-2 text-right font-mono text-[10px] font-bold text-foreground">{fmt(yearTotal(y as 1|2|3|4|5))}</td>)}
                        <td className="px-2 py-2 text-right font-mono text-[11px] font-bold text-foreground">{fmt(totalDirectCosts)}</td>
                        <td></td>
                      </tr>
                      <tr className="border-b border-border">
                        <td colSpan={5} className="px-2 py-2 text-right text-[10px] font-bold text-foreground uppercase">Imprévus & contingences</td>
                        <td className="px-2 py-2"><input type="number" min={0} max={15} value={contingencyPct} onChange={e => setContingencyPct(Number(e.target.value))} className="w-12 bg-transparent border border-border rounded px-1 py-0.5 text-[10px] text-right font-mono" />%</td>
                        {[1,2,3,4,5].map(y => <td key={y} className="px-2 py-2 text-right font-mono text-[10px] text-muted-foreground">{fmt(Math.round(yearTotal(y as 1|2|3|4|5) * contingencyPct / 100))}</td>)}
                        <td className="px-2 py-2 text-right font-mono text-[11px] text-muted-foreground">{fmt(contingencyAmount)}</td>
                        <td></td>
                      </tr>
                      <tr className="bg-foreground/5">
                        <td colSpan={6} className="px-2 py-2.5 text-right text-xs font-bold text-foreground uppercase">Total général projet</td>
                        {[1,2,3,4,5].map(y => <td key={y} className="px-2 py-2.5 text-right font-mono text-[11px] font-bold text-primary">{fmt(Math.round(yearTotal(y as 1|2|3|4|5) * (1 + contingencyPct / 100)))}</td>)}
                        <td className="px-2 py-2.5 text-right font-mono text-sm font-bold text-primary">{fmt(totalBudget)} {currency}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Legend */}
              <div className="bg-surface-2 border border-border rounded-lg p-3 text-[10px] text-muted-foreground space-y-1">
                <p><strong>Source :</strong> Standard bailleurs (AFD, UE, Enabel) — imprévus fourchette 5-10%</p>
                {grantId && <p className="text-primary">Ce budget est lié à la subvention <strong>{grants?.find(g => g.id === grantId)?.name}</strong>.</p>}
              </div>
            </div>
          )}

          {/* ── STEP 10: Validation ── */}
          {step === 10 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">Récapitulatif et validation</h2>
                <p className={helpCls}>Vérifiez les informations avant de soumettre le document de projet.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-surface-2 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2"><FileText className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[10px] font-mono uppercase text-muted-foreground">Projet</span></div>
                  <div className="text-sm font-bold text-foreground">{name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{porteur || programs?.find(p => p.id === programId)?.name}</div>
                  {country && <div className="text-[10px] text-muted-foreground mt-1">{country}{locations.filter(Boolean).length > 0 ? ` — ${locations.filter(Boolean).join(", ")}` : ""}</div>}
                  {startDate && <div className="text-[10px] font-mono text-muted-foreground mt-1">{startDate} → {endDate || "…"}{durationMonths ? ` (${durationMonths} mois)` : ""}</div>}
                  {secteurs && <div className="text-[10px] text-muted-foreground mt-1">Secteurs : {secteurs}</div>}
                </div>
                <div className="bg-surface-2 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2"><FileText className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[10px] font-mono uppercase text-muted-foreground">Contexte & TdC</span></div>
                  <div className="text-xs text-muted-foreground">{[introduction, contexteT, contraintes, justification].filter(Boolean).length} section(s) contexte · TdC: {tocImpact ? "✓" : "—"}</div>
                </div>
                <div className="bg-surface-2 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2"><Layers className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[10px] font-mono uppercase text-muted-foreground">Work Packages</span></div>
                  <div className="text-sm font-bold text-foreground">{wps.length} WP{wps.length > 1 ? "s" : ""}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{wps.map((wp, i) => `WP${i + 1}: ${wp.title || "…"}`).join(" · ")}</div>
                </div>
                <div className="bg-surface-2 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[10px] font-mono uppercase text-muted-foreground">KPIs & Jalons</span></div>
                  <div className="text-sm font-bold text-foreground">{kpis.filter(k => k.name).length} KPIs · {milestones.filter(m => m.title).length} Jalons</div>
                </div>
                <div className="bg-surface-2 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[10px] font-mono uppercase text-muted-foreground">Risques</span></div>
                  <div className="text-xs text-muted-foreground">{risks.filter(r => r.description).length} risque(s) identifié(s)</div>
                </div>
                <div className="bg-surface-2 border border-primary/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2"><DollarSign className="w-3.5 h-3.5 text-primary" /><span className="text-[10px] font-mono uppercase text-primary">Budget</span></div>
                  <div className="text-lg font-display font-bold text-primary">{fmt(totalBudget)} {currency}</div>
                  <div className="text-[10px] text-muted-foreground">{budgetActivities.filter(b => b.description).length} activités · Imprévus {contingencyPct}%</div>
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-xs text-foreground font-semibold mb-1">Prochaines étapes</p>
                <p className="text-xs text-muted-foreground">Le document de projet sera soumis en statut « En attente de validation ».</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <GhButton variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : navigate("/app/projets")} size="md">
          {step > 0 ? "← Précédent" : "Annuler"}
        </GhButton>
        <div className="flex gap-2">
          {step < STEPS.length - 1 ? (
            <GhButton onClick={handleNext} disabled={!canNext() || saving} size="md">
              {saving ? "Enregistrement…" : "Suivant →"}
            </GhButton>
          ) : (
            <GhButton onClick={() => submitProject.mutate()} disabled={submitProject.isPending} size="md">
              {submitProject.isPending ? "Soumission…" : "Soumettre le projet ✓"}
            </GhButton>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Sub-components ── */

function WpEditor({ wp, index, total, onChange, onRemove }: {
  wp: WpDraft; index: number; total: number;
  onChange: (partial: Partial<WpDraft>) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const gradient = wpColors[index % wpColors.length];
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shrink-0`}>WP{index + 1}</div>
        <div className="flex-1 text-left min-w-0"><span className="text-sm font-bold text-foreground truncate block">{wp.title || `Work Package ${index + 1}`}</span></div>
        {total > 1 && <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }} className="text-destructive hover:bg-destructive/10 rounded p-1"><Trash2 className="w-3.5 h-3.5" /></button>}
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="p-4 space-y-4 border-t border-border">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-[11px] text-muted-foreground font-medium">Titre du WP *</label><input value={wp.title} onChange={e => onChange({ title: e.target.value })} className={inputCls} placeholder="Ex: Renforcement des compétences" /></div>
            <div className="space-y-1 col-span-2 sm:col-span-1"><label className="text-[11px] text-muted-foreground font-medium">Objectif spécifique *</label><textarea value={wp.objective} onChange={e => onChange({ objective: e.target.value })} className={inputCls + " h-20 resize-none"} placeholder="Objectif de ce Work Package…" /></div>
          </div>
          <div className="space-y-2"><label className="text-[11px] text-muted-foreground font-medium">Activités</label><ArrayEditor items={wp.activities} onChange={a => onChange({ activities: a })} placeholder={`A${index + 1}.X`} /></div>
          <div className="space-y-2"><label className="text-[11px] text-muted-foreground font-medium">Résultats attendus</label><ArrayEditor items={wp.results} onChange={r => onChange({ results: r })} placeholder={`R${index + 1}.X`} /></div>
        </div>
      )}
    </div>
  );
}

function BudgetActivityRow({ act, idx, activities, setActivities, currency }: {
  act: BudgetActivity; idx: number; activities: BudgetActivity[]; setActivities: (v: BudgetActivity[]) => void; currency: string;
}) {
  const cellCls = "w-full bg-transparent border border-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-1 py-0.5 text-[11px] text-foreground outline-none";
  const update = (partial: Partial<BudgetActivity>) => { const n = [...activities]; n[idx] = { ...n[idx], ...partial }; setActivities(n); };
  const total = activityTotal(act);
  return (
    <tr className="border-b border-border/50 hover:bg-secondary/30">
      <td className="px-2 py-1"><span className="font-mono text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded font-semibold">{act.code}</span></td>
      <td className="px-1 py-1"><input value={act.description} onChange={e => update({ description: e.target.value })} className={cellCls} placeholder="Description…" /></td>
      <td className="px-1 py-1">
        <select value={act.category} onChange={e => update({ category: e.target.value })} className={cellCls + " text-[10px]"}>
          <option value="">—</option>
          {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-1 py-1"><input value={act.unit} onChange={e => update({ unit: e.target.value })} className={cellCls} /></td>
      <td className="px-1 py-1"><input type="number" value={act.qty || ""} onChange={e => update({ qty: Number(e.target.value) })} className={cellCls + " text-right font-mono"} /></td>
      <td className="px-1 py-1"><input type="number" value={act.unitCost || ""} onChange={e => update({ unitCost: Number(e.target.value) })} className={cellCls + " text-right font-mono"} /></td>
      <td className="px-1 py-1"><input type="number" value={act.year1 || ""} onChange={e => update({ year1: Number(e.target.value) })} className={cellCls + " text-right font-mono"} /></td>
      <td className="px-1 py-1"><input type="number" value={act.year2 || ""} onChange={e => update({ year2: Number(e.target.value) })} className={cellCls + " text-right font-mono"} /></td>
      <td className="px-1 py-1"><input type="number" value={act.year3 || ""} onChange={e => update({ year3: Number(e.target.value) })} className={cellCls + " text-right font-mono"} /></td>
      <td className="px-1 py-1"><input type="number" value={act.year4 || ""} onChange={e => update({ year4: Number(e.target.value) })} className={cellCls + " text-right font-mono"} /></td>
      <td className="px-1 py-1"><input type="number" value={act.year5 || ""} onChange={e => update({ year5: Number(e.target.value) })} className={cellCls + " text-right font-mono"} /></td>
      <td className="px-2 py-1 text-right"><span className="font-mono text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{fmt(total)}</span></td>
      <td className="px-1 py-1"><button onClick={() => setActivities(activities.filter((_, j) => j !== idx))} className="text-destructive hover:bg-destructive/10 rounded px-1 text-sm">×</button></td>
    </tr>
  );
}

// Need React import for React.Fragment
import React from "react";
