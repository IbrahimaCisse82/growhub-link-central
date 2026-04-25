import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GhCard from "@/components/shared/GhCard";
import { Badge } from "@/components/ui/badge";
import { History, FileText, User, Calendar, FileSignature, Briefcase } from "lucide-react";

const HR_TABLES = ["hr_employees", "hr_payroll_runs", "hr_payslips", "hr_contracts", "hr_leave_requests"];

const TABLE_LABELS: Record<string, { label: string; icon: any }> = {
  hr_employees: { label: "Employé", icon: User },
  hr_payroll_runs: { label: "Paie", icon: Calendar },
  hr_payslips: { label: "Bulletin", icon: FileText },
  hr_contracts: { label: "Contrat", icon: FileSignature },
  hr_leave_requests: { label: "Congé", icon: Briefcase },
};

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
};

export default function HrAuditPanel() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["hr_audit_trail"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*, profiles!activity_log_user_id_fkey(full_name)")
        .in("entity_type", HR_TABLES)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        // Fallback sans join si la FK n'est pas exposée
        const { data: d2, error: e2 } = await supabase
          .from("activity_log")
          .select("*")
          .in("entity_type", HR_TABLES)
          .order("created_at", { ascending: false })
          .limit(200);
        if (e2) throw e2;
        return d2 ?? [];
      }
      return data ?? [];
    },
  });

  return (
    <GhCard title={`Journal d'audit RH (${rows.length})`}>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          <History className="mx-auto mb-2 text-muted-foreground/50" size={28} />
          Aucune activité enregistrée
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Élément</th>
                <th className="py-2 px-3">Auteur</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => {
                const meta = TABLE_LABELS[r.entity_type] ?? { label: r.entity_type, icon: FileText };
                const Icon = meta.icon;
                const actor = r.profiles?.full_name ?? "Système";
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon size={12} className="text-muted-foreground" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant={ACTION_VARIANT[r.action] ?? "outline"} className="text-[10px]">
                        {r.action}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {r.metadata?.name || r.entity_id?.slice(0, 8) || "—"}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{actor}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GhCard>
  );
}
