import { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Flag, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectPlanTasks, useProjectPlanMilestones, useUpdatePlanTask } from "@/hooks/useProjectPlan";
import { useAuth } from "@/hooks/useAuth";

const STATUSES = ["Non démarré", "En cours", "Terminé", "En retard", "Bloqué"];

const priorityColor: Record<string, string> = {
  Haute: "bg-gh-rose/15 text-gh-rose border-gh-rose/30",
  Moyenne: "bg-gh-blue/15 text-gh-blue border-gh-blue/30",
  Basse: "bg-muted text-muted-foreground",
};

const statusColor: Record<string, string> = {
  "Non démarré": "bg-muted text-muted-foreground",
  "En cours": "bg-gh-blue/15 text-gh-blue border-gh-blue/30",
  "Terminé": "bg-gh-green/15 text-gh-green border-gh-green/30",
  "En retard": "bg-gh-rose/15 text-gh-rose border-gh-rose/30",
  "Bloqué": "bg-gh-rose/15 text-gh-rose border-gh-rose/30",
};

function fmt(d: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd MMM yyyy", { locale: fr });
  } catch {
    return d;
  }
}

export default function ProjectPlanTab({ projectId }: { projectId: string }) {
  const { data: tasks, isLoading } = useProjectPlanTasks(projectId);
  const { data: milestones } = useProjectPlanMilestones(projectId);
  const updateTask = useUpdatePlanTask(projectId);
  const { isAdmin, persona } = useAuth();
  const canEdit = isAdmin || persona === "project_manager";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (search && !(`${t.title} ${t.wbs ?? ""} ${t.owner ?? ""}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [tasks, search, statusFilter]);

  const stats = useMemo(() => {
    const leaf = (tasks ?? []).filter((t) => t.level === 2);
    const done = leaf.filter((t) => t.status === "Terminé").length;
    const inProgress = leaf.filter((t) => t.status === "En cours").length;
    return { total: leaf.length, done, inProgress, pct: leaf.length ? Math.round((done / leaf.length) * 100) : 0 };
  }, [tasks]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Tâches</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Terminées</p><p className="text-2xl font-bold text-gh-green">{stats.done}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">En cours</p><p className="text-2xl font-bold text-gh-blue">{stats.inProgress}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Avancement</p><p className="text-2xl font-bold">{stats.pct} %</p><Progress value={stats.pct} className="mt-2 h-1.5" /></CardContent></Card>
      </div>

      {milestones && milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Flag className="h-4 w-4 text-gh-rose" /> Jalons clés ({milestones.length})</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {milestones.map((m) => (
              <Badge key={m.id} variant="outline" className="gap-1.5 py-1">
                <span className="font-mono text-xs">{m.task_ref}</span> {m.title} — <span className="text-muted-foreground">{fmt(m.target_date)}</span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher une tâche, un responsable…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">WBS</TableHead>
                <TableHead>Tâche</TableHead>
                <TableHead>Livrable</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Resp.</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} className={t.level === 1 ? "bg-muted/40 font-semibold" : ""}>
                  <TableCell className="font-mono text-xs">{t.wbs}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {t.is_milestone && <Flag className="h-3.5 w-3.5 text-gh-rose shrink-0" />}
                      <div>
                        <p className={t.level === 1 ? "" : "font-medium"}>{t.title}</p>
                        {t.level === 2 && t.description && <p className="text-xs text-muted-foreground line-clamp-2 max-w-md">{t.description}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-40 truncate">{t.deliverable ?? "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{fmt(t.start_date)}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{fmt(t.end_date)}</TableCell>
                  <TableCell className="text-xs">{t.owner ?? "—"}</TableCell>
                  <TableCell>{t.priority ? <Badge variant="outline" className={priorityColor[t.priority] ?? ""}>{t.priority}</Badge> : "—"}</TableCell>
                  <TableCell>
                    {t.level === 1 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : canEdit ? (
                      <Select
                        value={t.status}
                        onValueChange={(v) => updateTask.mutate({ id: t.id, status: v, progress: v === "Terminé" ? 100 : v === "En cours" ? Math.max(t.progress, 10) : 0 })}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={statusColor[t.status] ?? ""}>{t.status}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucune tâche trouvée.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
