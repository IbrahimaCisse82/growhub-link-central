import { useMemo, useState } from "react";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import StatCard from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Activity, Search, Eye, Radio, Clock, Hash, Send } from "lucide-react";
import { useDomainEvents, type DomainEvent } from "@/hooks/useDomainEvents";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const EVENT_COLORS: Record<string, string> = {
  "project.created": "bg-gh-blue/15 text-gh-blue",
  "project.status_changed": "bg-gh-blue/15 text-gh-blue",
  "grant.created": "bg-gh-green/15 text-gh-green",
  "grant.disbursed": "bg-gh-green/15 text-gh-green",
  "payroll.validated": "bg-primary/15 text-primary",
  "payroll.closed": "bg-primary/15 text-primary",
  "po.approved": "bg-gh-rose/15 text-gh-rose",
  "invoice.paid": "bg-gh-green/15 text-gh-green",
  "milestone.completed": "bg-primary/15 text-primary",
};

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [selected, setSelected] = useState<DomainEvent | null>(null);
  const { data: events = [], isLoading } = useDomainEvents({ limit: 500 });

  const eventNames = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(e.event_name));
    return Array.from(set).sort();
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (eventFilter !== "all" && e.event_name !== eventFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = `${e.event_name} ${e.aggregate_type} ${e.aggregate_id ?? ""} ${JSON.stringify(e.payload)}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [events, eventFilter, search]);

  const kpis = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayCount = events.filter((e) => new Date(e.occurred_at) >= today).length;
    const types = new Set(events.map((e) => e.event_name)).size;
    const dispatched = events.filter((e) => e.webhook_dispatched_at).length;
    return { total: events.length, todayCount, types, dispatched };
  }, [events]);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Bus d'événements"
        subtitle="Journal temps réel des événements métier émis par tous les modules (projets, grants, paie, achats, factures, jalons)"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total événements" value={String(kpis.total)} note="500 derniers" color="blue" icon={<Activity size={14} />} />
        <StatCard label="Aujourd'hui" value={String(kpis.todayCount)} note="depuis 00h00" color="green" icon={<Clock size={14} />} />
        <StatCard label="Types distincts" value={String(kpis.types)} note="événements observés" color="purple" icon={<Hash size={14} />} />
        <StatCard label="Webhooks dispatchés" value={String(kpis.dispatched)} note="événements transmis" color="amber" icon={<Radio size={14} />} />
      </div>

      <GhCard
        title={`Flux d'événements (${filtered.length})`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher (payload, ID…)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 w-[220px] text-xs"
              />
            </div>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les événements</SelectItem>
                {eventNames.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            <Activity className="mx-auto mb-2 text-muted-foreground/50" size={28} />
            Aucun événement pour ces filtres
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 px-3">Événement</th>
                  <th className="py-2 px-3">Aggrégat</th>
                  <th className="py-2 px-3">ID</th>
                  <th className="py-2 px-3">Webhook</th>
                  <th className="py-2 px-3">Émis le</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono ${EVENT_COLORS[e.event_name] ?? "bg-muted text-muted-foreground"}`}>
                        {e.event_name}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{e.aggregate_type}</td>
                    <td className="py-2 px-3 font-mono text-[10px] text-muted-foreground">
                      {e.aggregate_id ? `${e.aggregate_id.slice(0, 8)}…` : "—"}
                    </td>
                    <td className="py-2 px-3">
                      {e.webhook_dispatched_at ? (
                        <Badge variant="default" className="text-[10px]">dispatché</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">en attente</Badge>
                      )}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {new Date(e.occurred_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <GhButton size="sm" variant="ghost" onClick={() => setSelected(e)}>
                        <Eye size={12} />
                      </GhButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GhCard>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{selected?.event_name}</DialogTitle>
            <DialogDescription>
              {selected && (
                <>
                  {selected.aggregate_type} · {selected.aggregate_id ?? "—"} · {new Date(selected.occurred_at).toLocaleString("fr-FR")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1">Payload</div>
              <pre className="bg-muted/40 rounded p-3 text-[11px] overflow-auto max-h-[400px] font-mono">
                {selected ? JSON.stringify(selected.payload, null, 2) : ""}
              </pre>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px] text-muted-foreground">
              <div>
                <div className="text-[10px] uppercase">Acteur</div>
                <div className="font-mono">{selected?.actor_user_id ?? "système"}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase">Webhook</div>
                <div>{selected?.webhook_dispatched_at ? new Date(selected.webhook_dispatched_at).toLocaleString("fr-FR") : "non dispatché"}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
