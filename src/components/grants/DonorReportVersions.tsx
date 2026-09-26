import { tr } from "@/lib/phrases";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Pill from "@/components/shared/Pill";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Narrative { progress: string; challenges: string; nextSteps: string; lessons: string }
export interface VersionPayload {
  grantId: string; template: string; periodLabel: string; startDate: string; endDate: string; narrative: Narrative;
}

const STATUS: Record<string, { label: string; color: "gray" | "blue" | "green" | "rose" }> = {
  draft: { label: "Brouillon", color: "gray" }, submitted: { label: "Soumis", color: "blue" },
  validated: { label: "Validé", color: "green" }, rejected: { label: "Rejeté", color: "rose" },
};

function toNarrative(j: Json): Narrative {
  const o = (j && typeof j === "object" && !Array.isArray(j) ? j : {}) as Record<string, Json>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  return { progress: s("progress"), challenges: s("challenges"), nextSteps: s("nextSteps"), lessons: s("lessons") };
}

export default function DonorReportVersions({ current, onLoad }: { current: VersionPayload; onLoad: (p: VersionPayload) => void }) {
  const qc = useQueryClient();
  const { isAdmin, user } = useAuth();
  const key = ["donor_report_versions", current.grantId];
  const { data = [] } = useQuery({
    queryKey: key,
    enabled: !!current.grantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("donor_report_versions").select("*")
        .eq("grant_id", current.grantId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const save = async () => {
    if (!current.grantId || !current.periodLabel.trim()) { toast.error("Choisissez une subvention et un libellé de période"); return; }
    const { error } = await supabase.from("donor_report_versions").insert({
      grant_id: current.grantId, template: current.template, period_label: current.periodLabel.trim().slice(0, 120),
      start_date: current.startDate || null, end_date: current.endDate || null,
      narrative: { ...current.narrative }, created_by: user?.id,
    });
    if (error) { toast.error("Enregistrement impossible : " + error.message); return; }
    toast.success("Version enregistrée"); refresh();
  };

  const setStatus = async (id: string, status: string) => {
    let review_comment: string | null = null;
    if (status === "rejected") {
      review_comment = window.prompt("Motif du rejet ?")?.slice(0, 1000) ?? null;
      if (!review_comment) return;
    }
    const { error } = await supabase.from("donor_report_versions").update({ status, ...(review_comment ? { review_comment } : {}) }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(STATUS[status].label); refresh();
  };

  return (
    <Card className="lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{tr("Versions et validation")}</CardTitle>
        <Button size="sm" variant="secondary" onClick={save} disabled={!current.grantId}>{tr("Enregistrer une version")}</Button>
      </CardHeader>
      <CardContent>
        {!current.grantId ? <div className="text-sm text-muted-foreground">{tr("Choisissez une subvention pour voir son historique.")}</div>
          : data.length === 0 ? <div className="text-sm text-muted-foreground">{tr("Aucune version enregistrée.")}</div> : (
          <div className="divide-y divide-border">
            {data.map((v) => {
              const st = STATUS[v.status] ?? STATUS.draft;
              return (
                <div key={v.id} className="py-2.5 flex items-center gap-3 flex-wrap text-sm">
                  <span className="font-mono text-xs w-10">v{v.version}</span>
                  <span className="flex-1 min-w-[180px] text-foreground">{v.period_label} <span className="text-muted-foreground text-xs">· {v.template} · {format(new Date(v.created_at), "dd MMM yyyy HH:mm", { locale: fr })}</span>
                    {v.review_comment && <span className="block text-xs text-destructive">Motif : {v.review_comment}</span>}
                  </span>
                  <Pill color={st.color}>{st.label}</Pill>
                  <Button size="sm" variant="ghost" onClick={() => onLoad({
                    grantId: v.grant_id, template: v.template, periodLabel: v.period_label,
                    startDate: v.start_date ?? "", endDate: v.end_date ?? "", narrative: toNarrative(v.narrative),
                  })}>{tr("Charger")}</Button>
                  {(v.status === "draft" || v.status === "rejected") && <Button size="sm" variant="ghost" onClick={() => setStatus(v.id, "submitted")}>{tr("Soumettre")}</Button>}
                  {isAdmin && v.status === "submitted" && <>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(v.id, "validated")}>{tr("Valider")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(v.id, "rejected")}>{tr("Rejeter")}</Button>
                  </>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
