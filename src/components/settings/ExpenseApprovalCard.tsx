import { useEffect, useState } from "react";
import { useOrgSettings, useUpdateOrgSettings } from "@/hooks/useOrgSettings";
import { useAuth } from "@/hooks/useAuth";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { fmtXOF } from "@/lib/payroll";

export default function ExpenseApprovalCard() {
  const { roles } = useAuth();
  const isSuperAdmin = roles.includes("super_admin" as any);
  const { data: org } = useOrgSettings();
  const update = useUpdateOrgSettings();
  const [threshold, setThreshold] = useState<number>(500000);

  useEffect(() => {
    if (org && (org as any).approval_threshold_xof != null) {
      setThreshold(Number((org as any).approval_threshold_xof));
    }
  }, [org]);

  if (!isSuperAdmin || !org) return null;

  const save = async () => {
    try {
      await update.mutateAsync({ ...(org as any), approval_threshold_xof: threshold } as any);
      toast.success("Seuil N+2 mis à jour");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  return (
    <GhCard title={<div className="flex items-center gap-2"><ShieldCheck size={14}/> Validation N+2 — notes de frais</div> as any} className="mt-4">
      <p className="text-[11px] text-muted-foreground mb-3">
        Toute note de frais d'un montant supérieur ou égal à ce seuil exigera une <strong>seconde validation</strong> par un autre super-admin ou coordinateur (séparation des pouvoirs).
      </p>
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <Label className="text-[11px]">Seuil (XOF)</Label>
          <Input type="number" min={0} step={50000} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
          <div className="text-[10px] text-muted-foreground mt-1">≈ {fmtXOF(threshold)} F CFA</div>
        </div>
        <GhButton onClick={save} disabled={update.isPending}>Enregistrer</GhButton>
      </div>
    </GhCard>
  );
}
