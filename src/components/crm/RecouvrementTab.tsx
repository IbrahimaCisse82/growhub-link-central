import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useOverdueInvoices } from "@/hooks/useReminders";
import { AlertCircle, Mail, Clock, TrendingDown, Search, BellRing } from "lucide-react";
import SendReminderDialog from "@/components/dialogs/SendReminderDialog";

const fmt = (n: number, cur = "XOF") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);

const daysSince = (d?: string | null) => {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
};

const ageBucket = (days: number) => {
  if (days <= 0) return { label: "À échoir", cls: "bg-blue-500/10 text-blue-600" };
  if (days <= 30) return { label: "0-30 j", cls: "bg-amber-500/10 text-amber-600" };
  if (days <= 60) return { label: "31-60 j", cls: "bg-orange-500/10 text-orange-600" };
  if (days <= 90) return { label: "61-90 j", cls: "bg-red-500/10 text-red-600" };
  return { label: "> 90 j", cls: "bg-red-700/20 text-red-700 font-semibold" };
};

export default function RecouvrementTab() {
  const { data: overdue } = useOverdueInvoices();
  const [search, setSearch] = useState("");
  const [reminderInvoice, setReminderInvoice] = useState<any | null>(null);

  const filtered = useMemo(() => {
    return (overdue ?? []).filter((i: any) =>
      !search ||
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      i.contrepartie?.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [overdue, search]);

  const stats = useMemo(() => {
    const list = overdue ?? [];
    const totalDue = list.reduce((s: number, i: any) => s + (Number(i.total) - Number(i.amount_paid || 0)), 0);
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    list.forEach((i: any) => {
      const d = daysSince(i.due_date);
      const r = Number(i.total) - Number(i.amount_paid || 0);
      if (d <= 30) buckets["0-30"] += r;
      else if (d <= 60) buckets["31-60"] += r;
      else if (d <= 90) buckets["61-90"] += r;
      else buckets["90+"] += r;
    });
    const noReminder = list.filter((i: any) => !i.reminder_count).length;
    return { totalDue, buckets, count: list.length, noReminder };
  }, [overdue]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertCircle size={14} /> Encours impayé</div>
          <div className="text-xl font-bold mt-1 text-red-600">{fmt(stats.totalDue)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock size={14} /> Factures en retard</div>
          <div className="text-xl font-bold mt-1">{stats.count}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><BellRing size={14} /> Sans relance</div>
          <div className="text-xl font-bold mt-1 text-amber-600">{stats.noReminder}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown size={14} /> &gt; 90 jours</div>
          <div className="text-xl font-bold mt-1 text-red-700">{fmt(stats.buckets["90+"])}</div>
        </Card>
      </div>

      {/* Aging */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Balance âgée (encours par tranche)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["0-30", "31-60", "61-90", "90+"] as const).map((k) => (
            <div key={k} className="p-3 rounded bg-secondary/40">
              <div className="text-xs text-muted-foreground">{k} jours</div>
              <div className="font-mono font-bold mt-1">{fmt(stats.buckets[k])}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Liste */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="N° ou client..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">N°</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Échéance</th>
                <th className="text-left p-3">Ancienneté</th>
                <th className="text-right p-3">Reste dû</th>
                <th className="text-center p-3">Relances</th>
                <th className="p-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i: any) => {
                const remaining = Number(i.total) - Number(i.amount_paid || 0);
                const days = daysSince(i.due_date);
                const bucket = ageBucket(days);
                return (
                  <tr key={i.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-3 font-mono text-xs">{i.invoice_number}</td>
                    <td className="p-3">{i.contrepartie?.name ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {i.due_date ? new Date(i.due_date).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="p-3"><Badge className={bucket.cls}>{bucket.label}</Badge></td>
                    <td className="p-3 text-right font-mono font-semibold text-red-600">{fmt(remaining, i.currency)}</td>
                    <td className="p-3 text-center">
                      <Badge variant={i.reminder_count ? "default" : "outline"} className="text-xs">
                        {i.reminder_count ?? 0}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" onClick={() => setReminderInvoice(i)}>
                        <Mail size={12} className="mr-1" /> Relancer
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-sm text-muted-foreground">
                    🎉 Aucune facture en retard
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <SendReminderDialog
        open={!!reminderInvoice}
        onOpenChange={(v) => !v && setReminderInvoice(null)}
        invoice={reminderInvoice}
      />
    </div>
  );
}
