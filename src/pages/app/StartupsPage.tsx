import { motion } from "framer-motion";
import RecordActions from "@/components/shared/RecordActions";
import { useNavigate } from "react-router-dom";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { Skeleton } from "@/components/ui/skeleton";
import { useStartups } from "@/hooks/useStartups";
import CreateStartupDialog from "@/components/dialogs/CreateStartupDialog";
import EditStartupDialog from "@/components/dialogs/EditStartupDialog";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import CsvImportDialog from "@/components/shared/CsvImportDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil } from "lucide-react";

const sectorColor: Record<string, "green" | "blue" | "purple" | "rose" | "amber" | "gray"> = { fintech: "blue", agritech: "green", edtech: "purple", healthtech: "rose", cleantech: "green", logistique: "amber" };
const stageColor: Record<string, "green" | "blue" | "amber" | "gray"> = { mvp: "amber", incubation: "amber", accélération: "green", croissance: "blue", scale: "green" };
function getPillColor(value: string | null, map: Record<string, any>, fallback = "gray" as const) { return !value ? fallback : map[value.toLowerCase()] ?? fallback; }

const exportCols = [
  { key: "name", label: "Entreprise" }, { key: "sector", label: "Secteur" }, { key: "stage", label: "Stade" },
  { key: "score", label: "Score" }, { key: "country", label: "Pays" }, { key: "city", label: "Ville" },
];

export default function StartupsPage() {
  const { data: startups, isLoading } = useStartups();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingStartup, setEditingStartup] = useState<any | null>(null);
  const filtered = startups?.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Entreprises" subtitle="Répertoire et suivi des entreprises accompagnées"
        actions={<>
          <input className="bg-surface-2 border border-border rounded-lg px-3 py-[7px] text-[12.5px] text-foreground outline-none focus:border-primary/50 w-[140px] sm:w-[200px] placeholder:text-muted-foreground" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          <GhButton variant="ghost" onClick={() => filtered && exportToCSV(filtered, "startups", exportCols)}>⤓ CSV</GhButton>
          <GhButton variant="ghost" onClick={() => filtered && exportToPDF("Entreprises", filtered, exportCols)}>⎙ PDF</GhButton>
          <CsvImportDialog
            tableName="startups"
            label="des entreprises"
            requiredColumns={[
              { key: "name", label: "Nom", required: true },
              { key: "sector", label: "Secteur" },
              { key: "stage", label: "Stade" },
              { key: "country", label: "Pays" },
              { key: "city", label: "Ville" },
              { key: "description", label: "Description" },
            ]}
            onSuccess={() => qc.invalidateQueries({ queryKey: ["startups"] })}
          />
          <CreateStartupDialog><GhButton>+ Ajouter</GhButton></CreateStartupDialog>
        </>} />
      <GhCard title="Toutes les entreprises" badge={String(filtered?.length ?? 0)} noPadding>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr className="bg-surface-2">{["Entreprise", "Secteur", "Cohorte", "Stade", "Score", "Pays", ""].map((h) => <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-3.5 py-2.5 border-b border-border"><Skeleton className="h-4 w-20" /></td>)}</tr>) : filtered?.length === 0 ? (
                <tr><td colSpan={7} className="px-3.5 py-8 text-center text-muted-foreground text-sm">Aucune entreprise</td></tr>
              ) : filtered?.map((s) => (
                <tr key={s.id} onClick={() => navigate(`/app/entreprises/${s.id}`)} className="hover:bg-surface-2 transition-colors cursor-pointer">
                  <td className="px-3.5 py-2.5 border-b border-border"><div className="font-semibold text-foreground">{s.name}</div><div className="text-[11px] text-muted-foreground">{s.city ?? s.country}</div></td>
                  <td className="px-3.5 py-2.5 border-b border-border"><Pill color={getPillColor(s.sector, sectorColor)}>{s.sector ?? "—"}</Pill></td>
                  <td className="px-3.5 py-2.5 border-b border-border font-mono text-foreground">{s.cohorts?.name ?? "—"}</td>
                  <td className="px-3.5 py-2.5 border-b border-border"><Pill color={getPillColor(s.stage, stageColor)}>{s.stage ?? "—"}</Pill></td>
                  <td className="px-3.5 py-2.5 border-b border-border font-mono text-primary">{s.score != null ? `${s.score}/100` : "—"}</td>
                  <td className="px-3.5 py-2.5 border-b border-border text-foreground">{s.country ?? "—"}</td>
                  <td className="px-3.5 py-2.5 border-b border-border" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      <GhButton variant="ghost" onClick={() => setEditingStartup(s)} title="Modifier"><Pencil size={14} /></GhButton>
                      <RecordActions canEdit={false} table="startups" id={s.id} record={s} entityLabel="Entreprise" queryKeys={["startups"]} fields={[]} />
                      <GhButton variant="ghost" onClick={() => navigate(`/app/entreprises/${s.id}`)}>→</GhButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GhCard>
      <EditStartupDialog open={!!editingStartup} onOpenChange={(v) => !v && setEditingStartup(null)} startup={editingStartup} />
    </motion.div>
  );
}
