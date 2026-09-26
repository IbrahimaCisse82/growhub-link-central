import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const TABLE_LABEL: Record<string, string> = {
  portfolios: "Portefeuille", programs: "Programme", projects: "Projet", cohorts: "Cohorte",
  startups: "Entreprise", milestones: "Jalon", tasks: "Tâche", risks: "Risque", resources: "Ressource",
  partners: "Partenaire", surveys: "Enquête", mentor_profiles: "Mentor", alumni_records: "Ancien",
  grants: "Subvention", events: "Événement", budgets: "Budget", me_measurements: "Mesure S&E",
};

export default function TrashPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["deleted_records"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deleted_records")
        .select("id, table_name, label, deleted_at, restored_at")
        .order("deleted_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
  const rows = useMemo(() => data.filter((r) =>
    (!type || r.table_name === type) && (!q || (r.label ?? "").toLowerCase().includes(q.toLowerCase()))), [data, q, type]);

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("restore_deleted_record", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Élément restauré"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error("Restauration impossible : " + e.message),
  });
  const purge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deleted_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supprimé définitivement"); qc.invalidateQueries({ queryKey: ["deleted_records"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Corbeille" subtitle="Éléments supprimés — restaurables par les administrateurs et coordinateurs" />
      <div className="flex flex-wrap gap-2 mb-4">
        <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs h-9" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">Tous types</option>
          {Object.entries(TABLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {isLoading ? <Skeleton className="h-40 rounded-xl" /> : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">La corbeille est vide</div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{r.label ?? "Sans nom"}</div>
                <div className="text-[11px] text-muted-foreground">
                  {TABLE_LABEL[r.table_name] ?? r.table_name} · supprimé le {format(new Date(r.deleted_at), "dd MMM yyyy HH:mm", { locale: fr })}
                  {r.restored_at && " · restauré"}
                </div>
              </div>
              {!r.restored_at && (
                <GhButton variant="ghost" onClick={() => restore.mutate(r.id)} disabled={restore.isPending}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1 inline" />Restaurer
                </GhButton>
              )}
              <button aria-label="Supprimer définitivement" onClick={() => window.confirm("Supprimer définitivement ?") && purge.mutate(r.id)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
