import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import StatCard from "@/components/shared/StatCard";
import Pill from "@/components/shared/Pill";
import GhButton from "@/components/shared/GhButton";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useRisks } from "@/hooks/useRisks";
import CreateRiskDialog from "@/components/dialogs/CreateRiskDialog";
import RiskMatrix from "@/components/risks/RiskMatrix";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const levelMap: Record<string, { label: string; color: "green" | "amber" | "rose" | "gray" }> = {
  low: { label: "Faible", color: "green" }, medium: { label: "Moyen", color: "amber" },
  high: { label: "Élevé", color: "rose" }, critical: { label: "Critique", color: "rose" },
};

export default function RisquesPage() {
  const { data: risks, isLoading } = useRisks();
  const open = risks?.filter(r => r.status === "open").length ?? 0;
  const critical = risks?.filter(r => r.level === "critical" || r.level === "high").length ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Risques" subtitle="Registre et suivi des risques" actions={<CreateRiskDialog><GhButton>+ Nouveau risque</GhButton></CreateRiskDialog>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Total risques" value={String(risks?.length ?? 0)} note="" color="blue" />
        <StatCard label="Ouverts" value={String(open)} note="" color="amber" />
        <StatCard label="Critiques / Élevés" value={String(critical)} note="" color="rose" />
        <StatCard label="Résolus" value={String(risks?.filter(r => r.status === "resolved" || r.status === "closed").length ?? 0)} note="" color="green" />
      </div>

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="matrix" className="text-xs">Matrice</TabsTrigger>
          <TabsTrigger value="list" className="text-xs">Liste</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          {isLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : !risks || risks.length === 0 ? (
            <EmptyState icon="⚠️" title="Aucun risque" description="Ajoutez des risques pour voir la matrice" />
          ) : (
            <RiskMatrix risks={risks as any} />
          )}
        </TabsContent>

        <TabsContent value="list">
          <GhCard title="Registre des risques" badge={String(risks?.length ?? 0)} noPadding>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr className="bg-secondary">{["Risque", "Projet", "Impact", "Probabilité", "Niveau", "Statut", "Mitigation"].map(h => <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {isLoading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-3.5 py-2.5 border-b border-border"><Skeleton className="h-4 w-16" /></td>)}</tr>) : !risks || risks.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState icon="⚠️" title="Aucun risque" description="Le registre des risques est vide" /></td></tr>
                  ) : risks.map(r => {
                    const lv = levelMap[r.level] ?? levelMap.medium;
                    return (
                      <tr key={r.id} className="hover:bg-secondary transition-colors">
                        <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{r.title}</td>
                        <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground">{r.projects?.name ?? "—"}</td>
                        <td className="px-3.5 py-2.5 border-b border-border font-mono text-foreground">{(r as any).impact ?? 3}/5</td>
                        <td className="px-3.5 py-2.5 border-b border-border font-mono text-foreground">{(r as any).probability ?? 3}/5</td>
                        <td className="px-3.5 py-2.5 border-b border-border"><Pill color={lv.color}>{lv.label}</Pill></td>
                        <td className="px-3.5 py-2.5 border-b border-border"><Pill color={r.status === "open" ? "amber" : "green"}>{r.status ?? "open"}</Pill></td>
                        <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground text-[11px] max-w-[200px] truncate">{r.mitigation ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GhCard>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
