import { motion } from "framer-motion";
import RecordActions, { STATUS_OPTIONS } from "@/components/shared/RecordActions";
import { useNavigate } from "react-router-dom";
import SectionHeader from "@/components/shared/SectionHeader";
import StatCard from "@/components/shared/StatCard";
import Pill from "@/components/shared/Pill";
import GhButton from "@/components/shared/GhButton";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolios } from "@/hooks/usePortfolios";
import CreatePortfolioDialog from "@/components/dialogs/CreatePortfolioDialog";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";

const statusMap: Record<string, { label: string; color: "green" | "blue" | "amber" | "gray" }> = {
  active: { label: "Actif", color: "green" }, draft: { label: "Brouillon", color: "gray" },
  paused: { label: "En pause", color: "amber" }, completed: { label: "Terminé", color: "blue" }, cancelled: { label: "Annulé", color: "gray" },
};

const exportCols = [
  { key: "name", label: "Nom" }, { key: "code", label: "Code" }, { key: "status", label: "Statut" },
  { key: "start_date", label: "Début" }, { key: "end_date", label: "Fin" },
];

export default function PortfoliosPage() {
  const { data: portfolios, isLoading } = usePortfolios();
  const navigate = useNavigate();
  const activeCount = portfolios?.filter((p) => p.status === "active").length ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Portefeuilles" subtitle="Gestion stratégique des portefeuilles"
        actions={<>
          <GhButton variant="ghost" onClick={() => portfolios && exportToCSV(portfolios, "portefeuilles", exportCols)}>⤓ CSV</GhButton>
          <CreatePortfolioDialog><GhButton>+ Nouveau portefeuille</GhButton></CreatePortfolioDialog>
        </>} />
      <div className="grid grid-cols-3 gap-3.5 mb-5">
        <StatCard label="Actifs" value={String(activeCount)} note="" color="green" />
        <StatCard label="Total" value={String(portfolios?.length ?? 0)} note="" color="blue" />
        <StatCard label="Terminés" value={String(portfolios?.filter((p) => p.status === "completed").length ?? 0)} note="" color="amber" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[180px] rounded-xl" />) : portfolios?.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-12 text-sm">Aucun portefeuille pour le moment</div>
        ) : portfolios?.map((p) => {
          const st = statusMap[p.status] ?? statusMap.draft;
          return (
            <div key={p.id} onClick={() => navigate(`/app/portefeuilles/${p.id}`)} className="bg-card border border-border rounded-xl overflow-hidden hover:border-border/80 hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className={`h-[3px] ${st.color === "green" ? "bg-primary" : st.color === "blue" ? "bg-accent" : st.color === "amber" ? "bg-gh-amber" : "bg-muted"}`} />
              <div className="p-4">
                <div className="font-display text-[15px] font-bold text-foreground">{p.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{p.code}</div>
                <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{p.description ?? "Aucune description"}</p>
              </div>
              <div className="px-4 py-2.5 bg-secondary border-t border-border flex justify-between items-center">
                <Pill color={st.color}>● {st.label}</Pill>
                <div className="flex items-center gap-1"><RecordActions table="portfolios" id={p.id} record={p} entityLabel="Portefeuille" queryKeys={["portfolios"]} fields={[{key:"name",label:"Nom",required:true},{key:"code",label:"Code",required:true},{key:"start_date",label:"Début",type:"date"},{key:"end_date",label:"Fin",type:"date"},{key:"status",label:"Statut",type:"select",options:STATUS_OPTIONS},{key:"objectives",label:"Objectifs",type:"textarea"},{key:"description",label:"Description",type:"textarea"}]} /><GhButton variant="ghost">Détails →</GhButton></div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
