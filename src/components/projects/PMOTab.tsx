import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Pill from "@/components/shared/Pill";
import GhButton from "@/components/shared/GhButton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useProjectPmo, useUpdateProjectPmo, usePmoList, usePmoMutations,
  type PmoMember, type PmoRaci, type PmoDecision, type PmoStakeholder, type PmoMeeting, type PmoReport,
} from "@/hooks/usePmo";
import {
  Building2, Users, Grid3x3, Gavel, Network, CalendarClock, FileBarChart, Plus, Trash2, Save,
} from "lucide-react";

const inputCls = "flex h-9 w-full rounded-lg border border-input bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";
const areaCls = inputCls + " h-32 resize-y py-2 leading-relaxed";
const thCls = "text-left px-3 py-2 text-[10px] font-mono uppercase text-muted-foreground";
const tdCls = "px-3 py-2 text-xs text-foreground align-top";

const raciColor: Record<string, "green" | "blue" | "amber" | "gray"> = { R: "blue", A: "green", C: "amber", I: "gray" };
const raciLabel: Record<string, string> = { R: "R — Réalise", A: "A — Approuve", C: "C — Consulté", I: "I — Informé" };
const levelLabel: Record<string, string> = { high: "Élevé", medium: "Moyen", low: "Faible" };
const levelColor: Record<string, "green" | "blue" | "amber" | "gray"> = { high: "green", medium: "amber", low: "gray" };

function Section({ title, icon: Icon, action, children }: { title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-secondary">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ---------------- Charte & gouvernance ---------------- */
function CharterPanel({ projectId }: { projectId: string }) {
  const { data: pmo, isLoading } = useProjectPmo(projectId);
  const update = useUpdateProjectPmo(projectId);
  const [draft, setDraft] = useState<Record<string, string>>({});

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  const val = (k: string) => draft[k] ?? ((pmo as unknown as Record<string, string | null>)?.[k] ?? "") ?? "";
  const set = (k: string, v: string) => setDraft(d => ({ ...d, [k]: v }));

  const fields: { key: string; label: string; hint?: string }[] = [
    { key: "charter_mission", label: "Mission du PMO" },
    { key: "charter_objectives", label: "Objectifs" },
    { key: "charter_scope", label: "Périmètre" },
    { key: "charter_out_of_scope", label: "Hors périmètre" },
    { key: "governance_manual", label: "Manuel de gouvernance" },
    { key: "doc_management_procedure", label: "Procédure de gestion documentaire" },
    { key: "deliverable_validation_procedure", label: "Procédure de validation des livrables" },
  ];

  return (
    <Section
      title="Charte & manuel de gouvernance"
      icon={Building2}
      action={
        <GhButton size="sm" onClick={() => update.mutate(draft)} disabled={update.isPending || Object.keys(draft).length === 0}>
          <Save className="w-3.5 h-3.5 mr-1" /> Enregistrer
        </GhButton>
      }
    >
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Rythme des instances</label>
          <input className={inputCls} value={val("meeting_cadence")} onChange={e => set("meeting_cadence", e.target.value)} />
        </div>
        {fields.map(f => (
          <div key={f.key} className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
            <textarea className={areaCls} value={val(f.key)} onChange={e => set(f.key, e.target.value)} />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- Équipe & organigramme ---------------- */
function TeamPanel({ projectId }: { projectId: string }) {
  const { data: members, isLoading } = usePmoList<PmoMember>("pmo_members", projectId);
  const { create, update, remove } = usePmoMutations("pmo_members", projectId);

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
  const copil = (members ?? []).filter(m => m.is_steering_committee);

  return (
    <div className="space-y-4">
      <Section
        title={`Équipe PMO & organigramme (${members?.length ?? 0})`}
        icon={Users}
        action={
          <GhButton size="sm" variant="secondary" onClick={() => create.mutate({ full_name: "À désigner", role_title: "Nouveau poste", sort_order: (members?.length ?? 0) + 1 })}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Membre
          </GhButton>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-secondary/50">
              <th className={thCls}>Nom</th><th className={thCls}>Fonction</th><th className={thCls}>Organisation</th>
              <th className={thCls}>Responsabilités</th><th className={thCls}>Rattachement</th><th className={thCls}>COPIL</th><th className={thCls}></th>
            </tr></thead>
            <tbody>
              {(members ?? []).map(m => (
                <tr key={m.id} className="border-b border-border last:border-b-0">
                  <td className={tdCls}><input className={inputCls} defaultValue={m.full_name} onBlur={e => e.target.value !== m.full_name && update.mutate({ id: m.id, patch: { full_name: e.target.value } })} /></td>
                  <td className={tdCls}><input className={inputCls} defaultValue={m.role_title} onBlur={e => e.target.value !== m.role_title && update.mutate({ id: m.id, patch: { role_title: e.target.value } })} /></td>
                  <td className={tdCls}><input className={inputCls} defaultValue={m.organization ?? ""} onBlur={e => update.mutate({ id: m.id, patch: { organization: e.target.value || null } })} /></td>
                  <td className={tdCls + " min-w-[220px]"}><textarea className={inputCls + " h-16 resize-y"} defaultValue={m.responsibilities ?? ""} onBlur={e => update.mutate({ id: m.id, patch: { responsibilities: e.target.value || null } })} /></td>
                  <td className={tdCls}><input className={inputCls} defaultValue={m.reports_to ?? ""} onBlur={e => update.mutate({ id: m.id, patch: { reports_to: e.target.value || null } })} /></td>
                  <td className={tdCls}>
                    <input type="checkbox" className="w-4 h-4 accent-[hsl(var(--primary))]" defaultChecked={m.is_steering_committee} onChange={e => update.mutate({ id: m.id, patch: { is_steering_committee: e.target.checked } })} />
                  </td>
                  <td className={tdCls}>
                    <button onClick={() => remove.mutate(m.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={`Comité de pilotage (${copil.length})`} icon={Network}>
        <div className="p-4 flex flex-wrap gap-2">
          {copil.length === 0 ? <p className="text-xs text-muted-foreground">Aucun membre marqué COPIL.</p> :
            copil.map(m => (
              <div key={m.id} className="px-3 py-2 rounded-lg border border-primary/30 bg-primary/5">
                <div className="text-xs font-semibold text-foreground">{m.role_title}</div>
                <div className="text-[10px] text-muted-foreground">{m.full_name}</div>
              </div>
            ))}
        </div>
      </Section>
    </div>
  );
}

/* ---------------- RACI ---------------- */
function RaciPanel({ projectId }: { projectId: string }) {
  const { data: rows, isLoading } = usePmoList<PmoRaci>("pmo_raci", projectId);
  const { create, update, remove } = usePmoMutations("pmo_raci", projectId);
  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <Section
      title={`Matrice RACI (${rows?.length ?? 0})`}
      icon={Grid3x3}
      action={
        <GhButton size="sm" variant="secondary" onClick={() => create.mutate({ activity: "Nouvelle activité", role_title: "Fonction", raci: "R", sort_order: (rows?.length ?? 0) + 1 })}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Ligne
        </GhButton>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/50">
            <th className={thCls}>Activité</th><th className={thCls}>Fonction</th><th className={thCls}>Responsabilité</th><th className={thCls}></th>
          </tr></thead>
          <tbody>
            {(rows ?? []).map(r => (
              <tr key={r.id} className="border-b border-border last:border-b-0">
                <td className={tdCls}><input className={inputCls} defaultValue={r.activity} onBlur={e => update.mutate({ id: r.id, patch: { activity: e.target.value } })} /></td>
                <td className={tdCls}><input className={inputCls} defaultValue={r.role_title} onBlur={e => update.mutate({ id: r.id, patch: { role_title: e.target.value } })} /></td>
                <td className={tdCls}>
                  <div className="flex items-center gap-2">
                    <Pill color={raciColor[r.raci] ?? "gray"}>{r.raci}</Pill>
                    <select className={inputCls + " w-44"} defaultValue={r.raci} onChange={e => update.mutate({ id: r.id, patch: { raci: e.target.value } })}>
                      {Object.entries(raciLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </div>
                </td>
                <td className={tdCls}><button onClick={() => remove.mutate(r.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ---------------- Décisions ---------------- */
function DecisionsPanel({ projectId }: { projectId: string }) {
  const { data: rows, isLoading } = usePmoList<PmoDecision>("pmo_decisions", projectId);
  const { create, update, remove } = usePmoMutations("pmo_decisions", projectId);
  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  const statusColor: Record<string, "green" | "amber" | "gray"> = { open: "amber", applied: "green", cancelled: "gray" };
  const statusLabel: Record<string, string> = { open: "En cours", applied: "Appliquée", cancelled: "Annulée" };

  return (
    <Section
      title={`Registre des décisions (${rows?.length ?? 0})`}
      icon={Gavel}
      action={
        <GhButton size="sm" variant="secondary" onClick={() => create.mutate({ reference: `DEC-${String((rows?.length ?? 0) + 1).padStart(3, "0")}`, subject: "Nouvelle décision" })}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Décision
        </GhButton>
      }
    >
      {(rows?.length ?? 0) === 0 ? (
        <p className="p-4 text-xs text-muted-foreground">Aucune décision enregistrée.</p>
      ) : (
        <div className="divide-y divide-border">
          {(rows ?? []).map(d => (
            <div key={d.id} className="p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">{d.reference}</span>
                <input type="date" className={inputCls + " w-40"} defaultValue={d.decision_date} onChange={e => update.mutate({ id: d.id, patch: { decision_date: e.target.value } })} />
                <Pill color={statusColor[d.status] ?? "gray"}>{statusLabel[d.status] ?? d.status}</Pill>
                <select className={inputCls + " w-36"} defaultValue={d.status} onChange={e => update.mutate({ id: d.id, patch: { status: e.target.value } })}>
                  {Object.entries(statusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <button onClick={() => remove.mutate(d.id)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
              <input className={inputCls} defaultValue={d.subject} placeholder="Objet" onBlur={e => update.mutate({ id: d.id, patch: { subject: e.target.value } })} />
              <textarea className={inputCls + " h-20 resize-y"} defaultValue={d.decision ?? ""} placeholder="Décision prise" onBlur={e => update.mutate({ id: d.id, patch: { decision: e.target.value || null } })} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input className={inputCls} defaultValue={d.taken_by ?? ""} placeholder="Décideur / instance" onBlur={e => update.mutate({ id: d.id, patch: { taken_by: e.target.value || null } })} />
                <input className={inputCls} defaultValue={d.impact ?? ""} placeholder="Impact" onBlur={e => update.mutate({ id: d.id, patch: { impact: e.target.value || null } })} />
                <input className={inputCls} defaultValue={d.follow_up ?? ""} placeholder="Suivi / action" onBlur={e => update.mutate({ id: d.id, patch: { follow_up: e.target.value || null } })} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ---------------- Parties prenantes ---------------- */
function StakeholdersPanel({ projectId }: { projectId: string }) {
  const { data: rows, isLoading } = usePmoList<PmoStakeholder>("pmo_stakeholders", projectId);
  const { create, update, remove } = usePmoMutations("pmo_stakeholders", projectId);
  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <Section
      title={`Registre des parties prenantes (${rows?.length ?? 0})`}
      icon={Network}
      action={
        <GhButton size="sm" variant="secondary" onClick={() => create.mutate({ name: "Nouvelle partie prenante", sort_order: (rows?.length ?? 0) + 1 })}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Partie prenante
        </GhButton>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/50">
            <th className={thCls}>Nom</th><th className={thCls}>Catégorie</th><th className={thCls}>Influence</th>
            <th className={thCls}>Intérêt</th><th className={thCls}>Stratégie d'engagement</th><th className={thCls}></th>
          </tr></thead>
          <tbody>
            {(rows ?? []).map(s => (
              <tr key={s.id} className="border-b border-border last:border-b-0">
                <td className={tdCls}><input className={inputCls} defaultValue={s.name} onBlur={e => update.mutate({ id: s.id, patch: { name: e.target.value } })} /></td>
                <td className={tdCls}>
                  <select className={inputCls + " w-36"} defaultValue={s.category} onChange={e => update.mutate({ id: s.id, patch: { category: e.target.value } })}>
                    {["bailleur", "institution", "partenaire", "beneficiaire", "prestataire", "autre"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                {(["influence", "interest"] as const).map(k => (
                  <td key={k} className={tdCls}>
                    <div className="flex items-center gap-2">
                      <Pill color={levelColor[s[k]] ?? "gray"}>{levelLabel[s[k]] ?? s[k]}</Pill>
                      <select className={inputCls + " w-28"} defaultValue={s[k]} onChange={e => update.mutate({ id: s.id, patch: { [k]: e.target.value } })}>
                        {Object.entries(levelLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  </td>
                ))}
                <td className={tdCls + " min-w-[240px]"}><textarea className={inputCls + " h-16 resize-y"} defaultValue={s.engagement_strategy ?? ""} onBlur={e => update.mutate({ id: s.id, patch: { engagement_strategy: e.target.value || null } })} /></td>
                <td className={tdCls}><button onClick={() => remove.mutate(s.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ---------------- Réunions ---------------- */
function MeetingsPanel({ projectId }: { projectId: string }) {
  const { data: rows, isLoading } = usePmoList<PmoMeeting>("pmo_meetings", projectId);
  const { create, update, remove } = usePmoMutations("pmo_meetings", projectId);
  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  const statusLabel: Record<string, string> = { planned: "Planifiée", held: "Tenue", cancelled: "Annulée" };
  const statusColor: Record<string, "green" | "blue" | "gray"> = { planned: "blue", held: "green", cancelled: "gray" };

  return (
    <Section
      title={`Calendrier des réunions (${rows?.length ?? 0})`}
      icon={CalendarClock}
      action={
        <GhButton size="sm" variant="secondary" onClick={() => create.mutate({ title: "Nouvelle réunion", meeting_type: "equipe" })}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Réunion
        </GhButton>
      }
    >
      <div className="divide-y divide-border">
        {(rows ?? []).map(m => (
          <div key={m.id} className="p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input className={inputCls + " flex-1 min-w-[200px]"} defaultValue={m.title} onBlur={e => update.mutate({ id: m.id, patch: { title: e.target.value } })} />
              <input type="datetime-local" className={inputCls + " w-56"} defaultValue={m.scheduled_at ? new Date(m.scheduled_at).toISOString().slice(0, 16) : ""} onChange={e => update.mutate({ id: m.id, patch: { scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null } })} />
              <Pill color={statusColor[m.status] ?? "gray"}>{statusLabel[m.status] ?? m.status}</Pill>
              <select className={inputCls + " w-36"} defaultValue={m.status} onChange={e => update.mutate({ id: m.id, patch: { status: e.target.value } })}>
                {Object.entries(statusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button onClick={() => remove.mutate(m.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input className={inputCls} defaultValue={m.frequency ?? ""} placeholder="Fréquence" onBlur={e => update.mutate({ id: m.id, patch: { frequency: e.target.value || null } })} />
              <input className={inputCls} defaultValue={m.attendees ?? ""} placeholder="Participants" onBlur={e => update.mutate({ id: m.id, patch: { attendees: e.target.value || null } })} />
            </div>
            <textarea className={inputCls + " h-16 resize-y"} defaultValue={m.agenda ?? ""} placeholder="Ordre du jour" onBlur={e => update.mutate({ id: m.id, patch: { agenda: e.target.value || null } })} />
            <textarea className={inputCls + " h-20 resize-y"} defaultValue={m.minutes ?? ""} placeholder="Compte rendu" onBlur={e => update.mutate({ id: m.id, patch: { minutes: e.target.value || null } })} />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- Reporting ---------------- */
function ReportingPanel({ projectId }: { projectId: string }) {
  const { data: rows, isLoading } = usePmoList<PmoReport>("pmo_report_schedule", projectId);
  const { create, update, remove } = usePmoMutations("pmo_report_schedule", projectId);
  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  const statusLabel: Record<string, string> = { pending: "À produire", drafted: "Rédigé", submitted: "Transmis", validated: "Validé" };
  const statusColor: Record<string, "green" | "blue" | "amber" | "gray"> = { pending: "gray", drafted: "amber", submitted: "blue", validated: "green" };
  const done = (rows ?? []).filter(r => r.status === "submitted" || r.status === "validated").length;

  return (
    <Section
      title={`Calendrier de reporting (${done}/${rows?.length ?? 0} produits)`}
      icon={FileBarChart}
      action={
        <GhButton size="sm" variant="secondary" onClick={() => create.mutate({ title: "Nouveau rapport", report_type: "mensuel", sort_order: (rows?.length ?? 0) + 1 })}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Rapport
        </GhButton>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/50">
            <th className={thCls}>Rapport</th><th className={thCls}>Type</th><th className={thCls}>Période</th>
            <th className={thCls}>Échéance</th><th className={thCls}>Responsable</th><th className={thCls}>Statut</th><th className={thCls}></th>
          </tr></thead>
          <tbody>
            {(rows ?? []).map(r => {
              const late = r.due_date && r.status === "pending" && new Date(r.due_date) < new Date();
              return (
                <tr key={r.id} className="border-b border-border last:border-b-0">
                  <td className={tdCls}><input className={inputCls + " min-w-[220px]"} defaultValue={r.title} onBlur={e => update.mutate({ id: r.id, patch: { title: e.target.value } })} /></td>
                  <td className={tdCls}>
                    <select className={inputCls + " w-32"} defaultValue={r.report_type} onChange={e => update.mutate({ id: r.id, patch: { report_type: e.target.value } })}>
                      {["mensuel", "trimestriel", "semestriel", "annuel", "final"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className={tdCls + " font-mono"}>{r.period_label ?? "—"}</td>
                  <td className={tdCls}>
                    <input type="date" className={inputCls + " w-40"} defaultValue={r.due_date ?? ""} onChange={e => update.mutate({ id: r.id, patch: { due_date: e.target.value || null } })} />
                    {late && <span className="text-[10px] text-destructive">En retard</span>}
                  </td>
                  <td className={tdCls}><input className={inputCls} defaultValue={r.owner_role ?? ""} onBlur={e => update.mutate({ id: r.id, patch: { owner_role: e.target.value || null } })} /></td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-2">
                      <Pill color={statusColor[r.status] ?? "gray"}>{statusLabel[r.status] ?? r.status}</Pill>
                      <select className={inputCls + " w-32"} defaultValue={r.status} onChange={e => update.mutate({ id: r.id, patch: { status: e.target.value } })}>
                        {Object.entries(statusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className={tdCls}><button onClick={() => remove.mutate(r.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export default function PMOTab({ projectId }: { projectId: string }) {
  return (
    <Tabs defaultValue="charte" className="w-full">
      <TabsList className="bg-secondary border border-border flex-wrap">
        <TabsTrigger value="charte">Charte & gouvernance</TabsTrigger>
        <TabsTrigger value="equipe">Équipe & organigramme</TabsTrigger>
        <TabsTrigger value="raci">Matrice RACI</TabsTrigger>
        <TabsTrigger value="decisions">Décisions</TabsTrigger>
        <TabsTrigger value="parties">Parties prenantes</TabsTrigger>
        <TabsTrigger value="reunions">Réunions</TabsTrigger>
        <TabsTrigger value="reporting">Reporting</TabsTrigger>
      </TabsList>
      <TabsContent value="charte" className="mt-4"><CharterPanel projectId={projectId} /></TabsContent>
      <TabsContent value="equipe" className="mt-4"><TeamPanel projectId={projectId} /></TabsContent>
      <TabsContent value="raci" className="mt-4"><RaciPanel projectId={projectId} /></TabsContent>
      <TabsContent value="decisions" className="mt-4"><DecisionsPanel projectId={projectId} /></TabsContent>
      <TabsContent value="parties" className="mt-4"><StakeholdersPanel projectId={projectId} /></TabsContent>
      <TabsContent value="reunions" className="mt-4"><MeetingsPanel projectId={projectId} /></TabsContent>
      <TabsContent value="reporting" className="mt-4"><ReportingPanel projectId={projectId} /></TabsContent>
    </Tabs>
  );
}
