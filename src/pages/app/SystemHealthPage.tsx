import { useSystemHealthOverview, useClientErrors, useHealthSnapshots, useCaptureHealthSnapshot } from "@/hooks/useSystemHealth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Users, Mail, Zap, RefreshCw, Camera, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function Metric({ label, value, icon: Icon, tone = "default" }: {
  label: string; value: number | string; icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClass = {
    default: "text-primary",
    warning: "text-amber-500",
    danger: "text-destructive",
    success: "text-emerald-500",
  }[tone];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${toneClass}`}>
            <Icon size={18} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const severityColor: Record<string, string> = {
  info: "bg-blue-500/15 text-blue-500",
  warning: "bg-amber-500/15 text-amber-500",
  error: "bg-destructive/15 text-destructive",
  fatal: "bg-destructive text-destructive-foreground",
};

export default function SystemHealthPage() {
  const { data: overview, refetch, isFetching } = useSystemHealthOverview();
  const { data: errors } = useClientErrors(50);
  const { data: snapshots } = useHealthSnapshots(48);
  const capture = useCaptureHealthSnapshot();

  const critical = overview?.critical_errors_24h ?? 0;
  const healthStatus = critical > 20 ? "danger" : critical > 5 ? "warning" : "success";
  const statusLabel = healthStatus === "success" ? "Opérationnel" : healthStatus === "warning" ? "Dégradé" : "Critique";

  const chartData = [...(snapshots ?? [])].reverse().map(s => ({
    time: format(new Date(s.captured_at), "HH:mm", { locale: fr }),
    events: s.domain_events_24h,
    errors: s.errors_24h,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Santé du système</h1>
          <p className="text-sm text-muted-foreground mt-1">Observabilité temps réel — métriques, erreurs et snapshots.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={
            healthStatus === "success" ? "bg-emerald-500/15 text-emerald-500" :
            healthStatus === "warning" ? "bg-amber-500/15 text-amber-500" :
            "bg-destructive/15 text-destructive"
          }>
            <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse" />
            {statusLabel}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={`mr-2 ${isFetching ? "animate-spin" : ""}`} /> Rafraîchir
          </Button>
          <Button size="sm" onClick={() => capture.mutate()} disabled={capture.isPending}>
            <Camera size={14} className="mr-2" /> Snapshot
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Utilisateurs actifs 24h" value={overview?.active_users_24h ?? 0} icon={Users} />
        <Metric label="Événements 24h" value={overview?.domain_events_24h ?? 0} icon={Activity} />
        <Metric label="Événements 1h" value={overview?.domain_events_1h ?? 0} icon={Zap} />
        <Metric label="Emails envoyés 24h" value={overview?.emails_sent_24h ?? 0} icon={Mail} />
        <Metric label="Erreurs 24h" value={overview?.errors_24h ?? 0} icon={AlertTriangle}
          tone={(overview?.errors_24h ?? 0) > 10 ? "warning" : "default"} />
        <Metric label="Erreurs critiques 24h" value={critical} icon={AlertTriangle}
          tone={critical > 5 ? "danger" : "success"} />
        <Metric label="Projets totaux" value={overview?.total_projects ?? 0} icon={Activity} />
        <Metric label="Utilisateurs totaux" value={overview?.total_users ?? 0} icon={Users} />
      </div>

      {chartData.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Évolution — snapshots</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="events" stroke="hsl(var(--primary))" name="Événements" />
                  <Line type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" name="Erreurs" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Erreurs récentes</span>
            <span className="text-xs text-muted-foreground font-normal">{errors?.length ?? 0} entrées</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            {(!errors || errors.length === 0) ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Aucune erreur enregistrée. 🎉</div>
            ) : errors.map(e => (
              <div key={e.id} className="px-5 py-3 border-b border-border hover:bg-secondary/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={severityColor[e.severity] ?? "bg-secondary"}>{e.severity}</Badge>
                      {e.route && <span className="font-mono text-[10px] text-muted-foreground">{e.route}</span>}
                    </div>
                    <div className="text-sm font-medium text-foreground truncate">{e.message}</div>
                    {e.stack && (
                      <pre className="mt-1 text-[10px] text-muted-foreground font-mono line-clamp-2 whitespace-pre-wrap break-all">
                        {e.stack.slice(0, 300)}
                      </pre>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(e.created_at), "dd MMM HH:mm:ss", { locale: fr })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
