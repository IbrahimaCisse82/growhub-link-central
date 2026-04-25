import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, FileX } from "lucide-react";
import { fmtXOF, MOIS, type HrEmployee, type PayrollResult } from "@/lib/payroll";
import { exportPayrollPayslipPdf } from "@/lib/payrollPdfExport";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { toast } from "sonner";

interface Props {
  employeeId: string;
}

export default function HrSelfServicePanel({ employeeId }: Props) {
  const { data: settings } = useOrgSettings();
  const orgSettings = settings ?? null;

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ["hr_my_payslips", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_payslips")
        .select("*")
        .eq("employee_id", employeeId)
        .order("annee", { ascending: false })
        .order("mois", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!employeeId,
  });

  const downloadPdf = async (payslip: any) => {
    try {
      const emp = payslip.employee_snapshot as HrEmployee;
      const paie = payslip.calculation_snapshot as PayrollResult;
      if (!emp || !paie) {
        toast.error("Bulletin incomplet — données figées manquantes");
        return;
      }
      await exportPayrollPayslipPdf(emp, paie, payslip.mois, payslip.annee, orgSettings);
      toast.success("Bulletin téléchargé");
    } catch (e: any) {
      toast.error(e.message ?? "Téléchargement impossible");
    }
  };

  return (
    <GhCard title={`Mes bulletins de paie (${payslips.length})`}>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : payslips.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          <FileX className="mx-auto mb-2 text-muted-foreground/50" size={28} />
          Aucun bulletin disponible. Vos bulletins apparaîtront ici dès la clôture de la paie.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-3">Période</th>
                <th className="py-2 px-3">Référence</th>
                <th className="py-2 px-3 text-right">Brut</th>
                <th className="py-2 px-3 text-right">Net</th>
                <th className="py-2 px-3">Émis le</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((p: any) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-3 font-medium">{MOIS[p.mois] ?? p.mois} {p.annee}</td>
                  <td className="py-2 px-3 text-muted-foreground font-mono text-[11px]">{p.reference}</td>
                  <td className="py-2 px-3 text-right">{fmtXOF(p.gross_total)}</td>
                  <td className="py-2 px-3 text-right font-semibold">{fmtXOF(p.net_total)}</td>
                  <td className="py-2 px-3 text-muted-foreground">{new Date(p.issued_at).toLocaleDateString("fr-FR")}</td>
                  <td className="py-2 px-3 text-right">
                    <GhButton size="sm" variant="ghost" onClick={() => downloadPdf(p)}>
                      <Download size={12} className="mr-1" /> PDF
                    </GhButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="outline" className="text-[10px] gap-1"><FileText size={10} /> Bulletins figés</Badge>
        Les bulletins listés ici sont des copies officielles archivées au moment de la clôture.
      </div>
    </GhCard>
  );
}
