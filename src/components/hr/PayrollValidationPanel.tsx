import { useMemo } from "react";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lock, Unlock, Calculator, ShieldCheck, ArrowRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { fmtXOF, MOIS } from "@/lib/payroll";
import { useHrPayrollRuns } from "@/hooks/useHrEmployees";

type Status = "draft" | "calculated" | "validated" | "closed" | "cancelled";

interface Props {
  mois: number;
  annee: number;
  canManageHr: boolean;
}

const STATUS_LABEL: Record<Status, string> = {
  draft: "Brouillon",
  calculated: "Calculée",
  validated: "Validée",
  closed: "Clôturée",
  cancelled: "Annulée",
};

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  calculated: "secondary",
  validated: "default",
  closed: "default",
  cancelled: "destructive",
};

const STEPS: { key: Status; label: string }[] = [
  { key: "draft", label: "Brouillon" },
  { key: "calculated", label: "Calculée" },
  { key: "validated", label: "Validée" },
  { key: "closed", label: "Clôturée" },
];

export default function PayrollValidationPanel({ mois, annee, canManageHr }: Props) {
  const { runs, updateRunStatus } = useHrPayrollRuns();
  const run = useMemo(
    () => (runs as any[]).find((r) => r.mois === mois && r.annee === annee),
    [runs, mois, annee],
  );

  if (!run) {
    return (
      <GhCard title={<div className="flex items-center gap-2"><ShieldCheck size={14} /> Workflow validation paie</div> as any}>
        <div className="text-xs text-muted-foreground py-3 text-center">
          Aucune paie pour {MOIS[mois]} {annee}. Lancez d'abord <strong>« Calculer la paie »</strong> pour créer un brouillon.
        </div>
      </GhCard>
    );
  }

  const status = run.status as Status;
  const currentIdx = STEPS.findIndex((s) => s.key === status);

  const advance = async (next: Status) => {
    try {
      await updateRunStatus.mutateAsync({ id: run.id, status: next });
      toast.success(`Paie ${MOIS[mois]} ${annee} → ${STATUS_LABEL[next]}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Action impossible");
    }
  };

  return (
    <GhCard title={<div className="flex items-center gap-2"><ShieldCheck size={14} /> Workflow validation — {MOIS[mois]} {annee}</div> as any}>
      {/* Timeline */}
      <div className="flex items-center justify-between mb-4 px-2">
        {STEPS.map((s, i) => {
          const reached = currentIdx >= i;
          return (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={
                    "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 " +
                    (reached
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border")
                  }
                >
                  {reached ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={"mt-1 text-[10px] " + (reached ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={"h-0.5 flex-1 mx-1 " + (currentIdx > i ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Infos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px] mb-4">
        <div>
          <div className="text-muted-foreground text-[10px] uppercase">Statut</div>
          <Badge variant={STATUS_VARIANT[status]} className="mt-1">{STATUS_LABEL[status]}</Badge>
        </div>
        <div>
          <div className="text-muted-foreground text-[10px] uppercase">Net total</div>
          <div className="font-mono font-bold text-primary">{fmtXOF(run.total_net ?? 0)} F</div>
        </div>
        <div>
          <div className="text-muted-foreground text-[10px] uppercase">Effectif</div>
          <div className="font-medium">{run.nb_employes ?? 0} employés</div>
        </div>
        <div>
          <div className="text-muted-foreground text-[10px] uppercase">Calculée le</div>
          <div className="font-medium">{run.calculated_at ? new Date(run.calculated_at).toLocaleString("fr-FR") : "—"}</div>
        </div>
      </div>

      {(run.validated_at || run.closed_at) && (
        <div className="grid grid-cols-2 gap-3 text-[11px] text-muted-foreground bg-muted/30 rounded p-2 mb-4">
          {run.validated_at && (
            <div className="flex items-center gap-1.5"><Clock size={11} /> Validée le {new Date(run.validated_at).toLocaleString("fr-FR")}</div>
          )}
          {run.closed_at && (
            <div className="flex items-center gap-1.5"><Lock size={11} /> Clôturée le {new Date(run.closed_at).toLocaleString("fr-FR")}</div>
          )}
        </div>
      )}

      {/* Actions */}
      {canManageHr ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {status === "draft" && (
            <GhButton size="sm" onClick={() => advance("calculated")}>
              <Calculator size={13} className="mr-1" /> Marquer calculée <ArrowRight size={12} className="ml-1" />
            </GhButton>
          )}
          {status === "calculated" && (
            <GhButton size="sm" onClick={() => advance("validated")}>
              <CheckCircle2 size={13} className="mr-1" /> Valider la paie <ArrowRight size={12} className="ml-1" />
            </GhButton>
          )}
          {status === "validated" && (
            <>
              <GhButton size="sm" onClick={() => advance("closed")}>
                <Lock size={13} className="mr-1" /> Clôturer définitivement
              </GhButton>
              <GhButton size="sm" variant="ghost" onClick={() => advance("draft")}>
                <Unlock size={13} className="mr-1" /> Rouvrir en brouillon
              </GhButton>
            </>
          )}
          {status === "closed" && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Lock size={12} /> Période verrouillée — réouverture interdite (audit)
            </div>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground border-t border-border pt-3">
          Validation réservée aux gestionnaires RH.
        </div>
      )}
    </GhCard>
  );
}
