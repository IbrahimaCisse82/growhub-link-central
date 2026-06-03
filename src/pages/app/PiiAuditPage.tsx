import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Filter } from "lucide-react";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { usePiiAccessLogs } from "@/hooks/usePiiAccessLog";

const inputCls = "h-9 px-3 text-sm bg-secondary border border-input rounded-lg text-foreground";

export default function PiiAuditPage() {
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: logs = [], isLoading } = usePiiAccessLogs({ entity_type: entityType || undefined, from: from || undefined, to: to || undefined });

  const exportCsv = () => {
    const headers = ["accessed_at", "user_id", "entity_type", "entity_id", "fields", "purpose"];
    const rows = logs.map((l) => [l.accessed_at, l.user_id, l.accessed_entity_type, l.accessed_entity_id ?? "", (l.accessed_fields ?? []).join("|"), l.purpose ?? ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit-pii-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionHeader title="Audit consultations PII" subtitle="Journal des accès aux données personnelles de tiers" />
        <GhButton onClick={exportCsv} variant="secondary" size="sm"><FileText size={14} /> Export CSV</GhButton>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-muted-foreground" />
        <select className={inputCls} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="">Tous types</option>
          <option value="startup">Entreprise</option>
          <option value="hr_employee">Employé RH</option>
          <option value="alumni">Alumni</option>
          <option value="profile">Profil utilisateur</option>
        </select>
        <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2">
            <tr>
              <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Utilisateur</th>
              <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Entité</th>
              <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Champs</th>
              <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Motif</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucune consultation enregistrée</td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-3 text-foreground">{new Date(l.accessed_at).toLocaleString("fr-FR")}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{l.user_id.slice(0, 8)}…</td>
                  <td className="p-3"><Pill color="blue">{l.accessed_entity_type}</Pill></td>
                  <td className="p-3 text-xs text-muted-foreground">{(l.accessed_fields ?? []).join(", ") || "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{l.purpose ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
