import { useMemo } from "react";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectActivities } from "@/hooks/useProjectPlan";

const WP_COLORS: Record<string, string> = {
  WP1: "bg-gh-green",
  WP2: "bg-gh-blue",
  WP3: "bg-gh-rose",
  WP4: "bg-primary",
};

export default function ProjectGanttTab({ projectId }: { projectId: string }) {
  const { data: activities, isLoading } = useProjectActivities(projectId);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    const dates = (activities ?? []).flatMap((a) => [a.start_date, a.end_date]).filter(Boolean) as string[];
    if (!dates.length) return { minDate: new Date(), maxDate: new Date(), totalDays: 1 };
    const min = new Date(Math.min(...dates.map((d) => new Date(d).getTime())));
    const max = new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
    return { minDate: min, maxDate: max, totalDays: Math.max(differenceInDays(max, min), 1) };
  }, [activities]);

  const years = useMemo(() => {
    const ys: number[] = [];
    for (let y = minDate.getFullYear(); y <= maxDate.getFullYear(); y++) ys.push(y);
    return ys;
  }, [minDate, maxDate]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!activities?.length) return <p className="text-muted-foreground py-8 text-center">Aucune activité planifiée.</p>;

  const bar = (start: string | null, end: string | null) => {
    if (!start || !end) return { left: "0%", width: "2%" };
    const left = Math.max((differenceInDays(new Date(start), minDate) / totalDays) * 100, 0);
    const width = Math.max((differenceInDays(new Date(end), new Date(start)) / totalDays) * 100, 1);
    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Diagramme des activités — {format(minDate, "yyyy")} → {format(maxDate, "yyyy")}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="flex border-b border-border pb-1 mb-2">
            <div className="w-72 shrink-0" />
            <div className="flex-1 flex">
              {years.map((y) => (
                <div key={y} className="text-xs font-medium text-muted-foreground text-center" style={{ width: `${100 / years.length}%` }}>{y}</div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center gap-2 group">
                <div className="w-72 shrink-0 pr-2">
                  <p className="text-xs leading-tight truncate" title={a.title}>
                    <span className="font-mono text-muted-foreground mr-1">{a.code}</span>
                    {a.title}
                  </p>
                </div>
                <div className="flex-1 relative h-5 bg-muted/30 rounded">
                  <div
                    className={`absolute h-full rounded ${WP_COLORS[a.work_package ?? ""] ?? "bg-primary/70"} opacity-80 group-hover:opacity-100 transition-opacity`}
                    style={bar(a.start_date, a.end_date)}
                    title={`${a.start_period ?? ""} → ${a.end_period ?? ""}`}
                  />
                </div>
                <div className="w-24 shrink-0 text-[10px] text-muted-foreground text-right whitespace-nowrap">
                  {a.start_period} → {a.end_period}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4 pt-3 border-t border-border flex-wrap">
            {Object.entries(WP_COLORS).map(([wp, cls]) => (
              <Badge key={wp} variant="outline" className="gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${cls}`} /> {wp}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground ml-auto">{activities.length} activités</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
