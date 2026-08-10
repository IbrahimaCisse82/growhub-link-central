import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import StatCard from "@/components/shared/StatCard";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { Skeleton } from "@/components/ui/skeleton";
import { useCohorts } from "@/hooks/useCohorts";
import CreateCohortDialog from "@/components/dialogs/CreateCohortDialog";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";

const statusMap: Record<string, { label: string; color: "green" | "blue" | "amber" | "gray"; stripe: string }> = {
  active: { label: "Active", color: "green", stripe: "bg-primary" },
  draft: { label: "Brouillon", color: "gray", stripe: "bg-surface-3" },
  paused: { label: "En pause", color: "amber", stripe: "bg-gh-amber" },
  completed: { label: "Terminée", color: "blue", stripe: "bg-accent" },
  cancelled: { label: "Annulée", color: "gray", stripe: "bg-surface-3" },
};

const exportCols = [
  { key: "name", label: "Nom" }, { key: "status", label: "Statut" },
  { key: "max_startups", label: "Max Entreprises" }, { key: "start_date", label: "Début" }, { key: "end_date", label: "Fin" },
];

export default function CohortesPage() {
  const { data: cohorts, isLoading } = useCohorts();
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Cohortes" subtitle="Gestion des cohortes de startups accompagnées"
        actions={<>
          <GhButton variant="ghost" onClick={() => cohorts && exportToCSV(cohorts, "cohortes", exportCols)}>⤓ CSV</GhButton>
          <GhButton variant="ghost" onClick={() => cohorts && exportToPDF("Cohortes", cohorts, exportCols)}>⎙ PDF</GhButton>
          <CreateCohortDialog><GhButton>+ Nouvelle cohorte</GhButton></CreateCohortDialog>
        </>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Actives" value={String(cohorts?.filter((c) => c.status === "active").length ?? 0)} note="" color="green" />
        <StatCard label="Total" value={String(cohorts?.length ?? 0)} note="" color="blue" />
        <StatCard label="Taux complétion" value="—" note="" color="amber" />
        <StatCard label="Mentors assignés" value="—" note="" color="purple" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[200px] rounded-xl" />) : cohorts?.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-12 text-sm">Aucune cohorte</div>
        ) : cohorts?.map((c) => {
          const st = statusMap[c.status] ?? statusMap.draft;
          return (
            <div key={c.id} onClick={() => navigate(`/app/cohortes/${c.id}`)} className="bg-card border border-border rounded-xl overflow-hidden hover:border-border/80 hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className={`h-[3px] ${st.stripe}`} />
              <div className="p-4">
                <div className="font-display text-[15px] font-bold text-foreground">{c.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{c.projects?.name ?? "—"} {c.projects?.code ? `· ${c.projects.code}` : ""}</div>
                <div className="grid grid-cols-2 gap-2 mt-3.5">
                  <div className="text-center"><div className="font-mono text-lg font-semibold text-foreground">{c.max_startups ?? "—"}</div><div className="text-[10px] text-muted-foreground mt-px">Max Entreprises</div></div>
                  <div className="text-center"><div className="font-mono text-lg font-semibold text-foreground">{c.start_date ? new Date(c.start_date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "—"}</div><div className="text-[10px] text-muted-foreground mt-px">Début</div></div>
                </div>
              </div>
              <div className="px-4 py-2.5 bg-surface-2 border-t border-border flex justify-between items-center">
                <Pill color={st.color}>● {st.label}</Pill>
                <GhButton variant="ghost">Détails →</GhButton>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
