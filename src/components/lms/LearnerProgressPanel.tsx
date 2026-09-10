import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GhCard from "@/components/shared/GhCard";
import Pill from "@/components/shared/Pill";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { GraduationCap, BookOpen, CheckCircle2, Clock } from "lucide-react";

interface EnrollmentRow {
  id: string;
  course_id: string;
  user_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress: number | null;
  course_title?: string;
  modules_count?: number;
  duration_hours?: number;
  learner_name?: string;
}

export default function LearnerProgressPanel() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["all-enrollments-progress"],
    queryFn: async () => {
      const { data: enrolls } = await supabase
        .from("course_enrollments")
        .select("*")
        .order("enrolled_at", { ascending: false });
      if (!enrolls) return [] as EnrollmentRow[];

      const courseIds = [...new Set(enrolls.map(e => e.course_id))];
      const userIds = [...new Set(enrolls.map(e => e.user_id))];

      const [coursesRes, profilesRes] = await Promise.all([
        supabase.from("courses").select("id, title, modules_count, duration_hours").in("id", courseIds),
        supabase.from("profiles_safe").select("user_id, full_name").in("user_id", userIds),
      ]);

      return enrolls.map(e => {
        const c = coursesRes.data?.find(x => x.id === e.course_id);
        const p = profilesRes.data?.find(x => x.user_id === e.user_id);
        return {
          ...e,
          course_title: c?.title ?? "Cours supprimé",
          modules_count: c?.modules_count ?? 0,
          duration_hours: c?.duration_hours ?? 0,
          learner_name: p?.full_name ?? "Apprenant",
        } as EnrollmentRow;
      });
    },
  });

  if (isLoading) {
    return (
      <GhCard title="📊 Suivi des apprenants">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      </GhCard>
    );
  }

  if (!enrollments || enrollments.length === 0) {
    return (
      <GhCard title="📊 Suivi des apprenants">
        <div className="text-center py-8 text-muted-foreground text-sm">Aucune inscription pour le moment</div>
      </GhCard>
    );
  }

  // Group by learner
  const byLearner = new Map<string, EnrollmentRow[]>();
  enrollments.forEach(e => {
    const arr = byLearner.get(e.user_id) ?? [];
    arr.push(e);
    byLearner.set(e.user_id, arr);
  });

  const learners = Array.from(byLearner.entries()).map(([userId, items]) => ({
    user_id: userId,
    name: items[0].learner_name ?? "Apprenant",
    total: items.length,
    completed: items.filter(i => i.completed_at).length,
    avgProgress: Math.round(items.reduce((a, b) => a + (b.progress ?? 0), 0) / items.length),
  })).sort((a, b) => b.completed - a.completed);

  const selectedItems = selectedUserId ? byLearner.get(selectedUserId) ?? [] : [];

  return (
    <GhCard title="📊 Suivi des apprenants" badge={String(learners.length)}>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Learners list */}
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
          {learners.map(l => (
            <button
              key={l.user_id}
              onClick={() => setSelectedUserId(l.user_id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${selectedUserId === l.user_id ? "bg-primary/10 border-primary/30" : "bg-surface-2 border-border hover:border-border/80"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-[12px] font-semibold text-foreground truncate">{l.name}</div>
                {l.completed === l.total && l.total > 0 && (
                  <GraduationCap size={12} className="text-gh-green flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{l.completed}/{l.total} cours</span>
                <span>·</span>
                <span>{l.avgProgress}% moy.</span>
              </div>
              <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${l.avgProgress}%` }} />
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="border border-border rounded-lg p-3 bg-surface-2 min-h-[280px]">
          {!selectedUserId ? (
            <div className="text-center text-muted-foreground text-[12px] py-16">
              Sélectionne un apprenant pour voir son parcours détaillé
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[13px] font-semibold text-foreground border-b border-border pb-2">
                Parcours de {selectedItems[0]?.learner_name}
              </div>
              {selectedItems.map(item => (
                <div key={item.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[12px] font-medium text-foreground flex-1">{item.course_title}</div>
                    {item.completed_at ? (
                      <Pill color="green"><CheckCircle2 size={10} className="inline mr-0.5" /> Terminé</Pill>
                    ) : (
                      <Pill color="amber"><Clock size={10} className="inline mr-0.5" /> En cours</Pill>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span><BookOpen size={10} className="inline mr-1" />{item.modules_count} modules</span>
                    <span>{item.duration_hours}h</span>
                    <span>Inscrit le {format(new Date(item.enrolled_at), "dd MMM yy", { locale: fr })}</span>
                    {item.completed_at && (
                      <span className="text-gh-green">Terminé le {format(new Date(item.completed_at), "dd MMM yy", { locale: fr })}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${item.progress ?? 0}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{item.progress ?? 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GhCard>
  );
}
