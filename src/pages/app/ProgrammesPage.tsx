import { motion } from "framer-motion";
import RecordActions, { STATUS_OPTIONS } from "@/components/shared/RecordActions";
import { useNavigate } from "react-router-dom";
import SectionHeader from "@/components/shared/SectionHeader";
import StatCard from "@/components/shared/StatCard";
import Pill from "@/components/shared/Pill";
import GhButton from "@/components/shared/GhButton";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrograms } from "@/hooks/usePrograms";
import CreateProgramDialog from "@/components/dialogs/CreateProgramDialog";
import { exportToCSV } from "@/lib/exportUtils";

const statusMap: Record<string, { label: string; color: "green" | "blue" | "amber" | "gray" }> = {
  active: { label: "Actif", color: "green" }, draft: { label: "Brouillon", color: "gray" },
  paused: { label: "En pause", color: "amber" }, completed: { label: "Terminé", color: "blue" }, cancelled: { label: "Annulé", color: "gray" },
};

export default function ProgrammesPage() {
  const { data: programs, isLoading } = usePrograms();
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Programmes" subtitle="Coordination des programmes d'accélération"
        actions={<>
          <GhButton variant="ghost" onClick={() => programs && exportToCSV(programs, "programmes", [
            { key: "name", label: "Nom" }, { key: "code", label: "Code" }, { key: "funder", label: "Bailleur" },
            { key: "budget_total", label: "Budget" }, { key: "status", label: "Statut" },
          ])}>⤓ CSV</GhButton>
          <CreateProgramDialog><GhButton>+ Nouveau programme</GhButton></CreateProgramDialog>
        </>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Actifs" value={String(programs?.filter((p) => p.status === "active").length ?? 0)} note="" color="green" />
        <StatCard label="Total" value={String(programs?.length ?? 0)} note="" color="blue" />
        <StatCard label="Budget Total" value={programs ? new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(programs.reduce((s, p) => s + (p.budget_total ?? 0), 0)) : "—"} note="XOF" color="purple" />
        <StatCard label="Terminés" value={String(programs?.filter((p) => p.status === "completed").length ?? 0)} note="" color="amber" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[200px] rounded-xl" />) : programs?.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-12 text-sm">Aucun programme</div>
        ) : programs?.map((p) => {
          const st = statusMap[p.status] ?? statusMap.draft;
          return (
            <div key={p.id} onClick={() => navigate(`/app/programmes/${p.id}`)} className="bg-card border border-border rounded-xl overflow-hidden hover:border-border/80 hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className={`h-[3px] ${st.color === "green" ? "bg-primary" : st.color === "blue" ? "bg-accent" : st.color === "amber" ? "bg-gh-amber" : "bg-muted"}`} />
              <div className="p-4">
                <div className="font-display text-[15px] font-bold text-foreground">{p.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{p.code} {p.funder ? `· ${p.funder}` : ""}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{p.portfolios?.name ?? "Sans portefeuille"}</div>
              </div>
              <div className="px-4 py-2.5 bg-secondary border-t border-border flex justify-between items-center">
                <Pill color={st.color}>● {st.label}</Pill>
                <div className="flex items-center gap-1"><RecordActions table="programs" id={p.id} record={p} entityLabel="Programme" queryKeys={["programs"]} fields={[{key:"name",label:"Nom",required:true},{key:"code",label:"Code",required:true},{key:"funder",label:"Bailleur"},{key:"budget_total",label:"Budget (XOF)",type:"number"},{key:"start_date",label:"Début",type:"date"},{key:"end_date",label:"Fin",type:"date"},{key:"status",label:"Statut",type:"select",options:STATUS_OPTIONS},{key:"description",label:"Description",type:"textarea"}]} /><GhButton variant="ghost">Détails →</GhButton></div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
