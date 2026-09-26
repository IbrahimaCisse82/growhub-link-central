import { motion } from "framer-motion";
import SectionHeader from "@/components/shared/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivities } from "@/hooks/useActivities";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import GhButton from "@/components/shared/GhButton";
import { exportToCSV } from "@/lib/exportUtils";

function readable(m: unknown): string {
  if (!m || typeof m !== "object") return "";
  return Object.entries(m as Record<string, unknown>).filter(([, v]) => v !== null && v !== "" && typeof v !== "object").slice(0, 4).map(([k, v]) => `${k.replace(/_/g, " ")} : ${String(v)}`).join(" · ");
}

const actionLabels: Record<string, string> = {
  create: "Création", update: "Modification", delete: "Suppression",
  approve: "Approbation", revoke: "Révocation", login: "Connexion",
};

const entityLabels: Record<string, string> = {
  startup: "Entreprise", program: "Programme", cohort: "Cohorte", project: "Projet",
  grant: "Grant", event: "Événement", user: "Utilisateur", course: "Cours",
};

export default function ActivitesPage() {
  const { data: all, isLoading } = useActivities();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const activities = useMemo(() => (all ?? []).filter(a =>
    (!action || a.action === action) && (!entity || a.entity_type === entity) &&
    (!q || JSON.stringify(a).toLowerCase().includes(q.toLowerCase()))), [all, q, action, entity]);
  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Activités" subtitle="Fil d'activité de la plateforme"
        actions={<GhButton variant="ghost" onClick={() => exportToCSV(activities.map(a => ({ date: a.created_at, action: actionLabels[a.action] ?? a.action, element: a.entity_type ?? "", details: readable(a.metadata) })), "journal-activite", [{ key: "date", label: "Date" }, { key: "action", label: "Action" }, { key: "element", label: "Élément" }, { key: "details", label: "Détails" }])}>Exporter CSV</GhButton>} />
      <div className="flex flex-wrap gap-2 mb-4">
        <Input placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs h-9" />
        <select className={sel} value={action} onChange={e => setAction(e.target.value)}><option value="">Toutes actions</option>{Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={sel} value={entity} onChange={e => setEntity(e.target.value)}><option value="">Tous éléments</option>{Object.entries(entityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : !activities || activities.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
            Aucune activité enregistrée pour le moment
          </div>
        ) : (
          activities.map(a => (
            <div key={a.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                {a.action?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground">
                  <span className="font-semibold">{actionLabels[a.action] ?? a.action}</span>
                  {a.entity_type && <span className="text-muted-foreground"> · {entityLabels[a.entity_type] ?? a.entity_type}</span>}
                </div>
                {a.metadata && <div className="text-[11px] text-muted-foreground truncate">{readable(a.metadata)}</div>}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground flex-shrink-0">
                {format(new Date(a.created_at), "dd MMM HH:mm", { locale: fr })}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
