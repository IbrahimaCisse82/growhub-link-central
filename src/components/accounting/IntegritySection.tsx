import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tr } from "@/lib/phrases";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";

export default function IntegritySection() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["acc-integrity"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("acc_integrity_checks");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <GhCard title={tr("Contrôles d'intégrité")}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] text-muted-foreground">{tr("Contrôles automatiques de cohérence de la comptabilité.")}</p>
        <GhButton onClick={() => refetch()} disabled={isFetching}><RefreshCw size={13} /> {tr("Relancer")}</GhButton>
      </div>
      {isLoading && <p className="text-[12px] text-muted-foreground">{tr("Chargement…")}</p>}
      {error && <p className="text-[12px] text-destructive">{tr("Accès refusé ou erreur de chargement.")}</p>}
      <ul className="space-y-2">
        {data?.map((c) => {
          const ok = Number(c.issues) === 0;
          return (
            <li key={c.check_code} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="flex items-center gap-2 text-[12px]">
                {ok ? <CheckCircle2 size={14} className="text-primary" /> : <AlertTriangle size={14} className="text-destructive" />}
                {tr(c.label)}
              </span>
              <span className={`font-mono text-[12px] ${ok ? "text-primary" : "text-destructive"}`}>{Number(c.issues)}</span>
            </li>
          );
        })}
      </ul>
    </GhCard>
  );
}
