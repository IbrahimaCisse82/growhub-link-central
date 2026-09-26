import { useState } from "react";
import { motion } from "framer-motion";
import RecordActions from "@/components/shared/RecordActions";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useSurveys, useSurveyResponses, useAddSurvey, useDeleteSurvey } from "@/hooks/useSurveys";
import { usePrograms } from "@/hooks/usePrograms";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const typeLabels: Record<string, string> = {
  feedback: "Feedback",
  satisfaction: "Satisfaction",
  evaluation: "Évaluation",
  nps: "NPS",
};

export default function SurveysPage() {
  const { data: surveys, isLoading } = useSurveys();
  const { data: programs } = usePrograms();
  const { isAdmin, user } = useAuth();
  const addSurvey = useAddSurvey();
  const deleteSurvey = useDeleteSurvey();
  const [open, setOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  const { data: responses } = useSurveyResponses(selectedSurvey ?? undefined);
  const [form, setForm] = useState({ title: "", description: "", survey_type: "feedback", target_type: "entrepreneurs", program_id: "" });

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    addSurvey.mutate({ ...form, program_id: form.program_id || undefined, created_by: user?.id }, { onSuccess: () => { setOpen(false); setForm({ title: "", description: "", survey_type: "feedback", target_type: "entrepreneurs", program_id: "" }); } });
  };

  const avgRating = responses?.length ? (responses.reduce((s, r) => s + (r.rating ?? 0), 0) / responses.filter(r => r.rating).length).toFixed(1) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Enquêtes & Feedback" subtitle="Collectez les retours des entreprises et participants" actions={isAdmin && <GhButton variant="primary" onClick={() => setOpen(true)}>+ Enquête</GhButton>} />

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : !surveys?.length ? (
        <EmptyState icon="📋" title="Aucune enquête" description="Créez des enquêtes de satisfaction pour recueillir les retours." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-2">
            {surveys.map(s => (
              <div key={s.id} onClick={() => setSelectedSurvey(s.id)} className={`bg-card border rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-0.5 ${selectedSurvey === s.id ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-bold text-foreground truncate">{s.title}</span>
                  <Pill color={s.is_active ? "green" : "gray"}>{s.is_active ? "Active" : "Inactive"}</Pill>
                </div>
                <div className="text-[11px] text-muted-foreground">{typeLabels[s.survey_type] ?? s.survey_type}{(s as any).programs?.name ? ` · ${(s as any).programs.name}` : ""}</div>
                {isAdmin && (
                  <div className="mt-2"><RecordActions table="surveys" id={s.id} record={s} entityLabel="Enquête" queryKeys={["surveys"]} fields={[{key:"title",label:"Titre",required:true},{key:"survey_type",label:"Type",required:true},{key:"description",label:"Description",type:"textarea"}]} /></div>
                )}
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedSurvey ? (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Réponses ({responses?.length ?? 0})</div>
                {avgRating && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-secondary rounded-lg">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <div className="text-lg font-bold text-foreground">{avgRating}/5</div>
                      <div className="text-[11px] text-muted-foreground">Note moyenne</div>
                    </div>
                  </div>
                )}
                {!responses?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucune réponse pour le moment</p>
                ) : (
                  <div className="space-y-3">
                    {responses.map(r => (
                      <div key={r.id} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          {r.rating && <div className="text-[12px] font-mono text-primary">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>}
                          <span className="text-[10px] text-muted-foreground">{new Date(r.submitted_at).toLocaleDateString("fr-FR")}</span>
                        </div>
                        {r.feedback && <p className="text-[12px] text-foreground/85">{r.feedback}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <span className="text-3xl mb-2 block">📋</span>
                <p className="text-sm text-muted-foreground">Sélectionnez une enquête pour voir les réponses</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle enquête</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} /></div>
            <div><Label>Type</Label>
              <Select value={form.survey_type} onValueChange={v => setForm(f => ({...f, survey_type: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="satisfaction">Satisfaction</SelectItem>
                  <SelectItem value="evaluation">Évaluation</SelectItem>
                  <SelectItem value="nps">NPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Cible</Label>
              <Select value={form.target_type} onValueChange={v => setForm(f => ({...f, target_type: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrepreneurs">Entrepreneurs</SelectItem>
                  <SelectItem value="mentors">Mentors</SelectItem>
                  <SelectItem value="all">Tous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Programme</Label>
              <Select value={form.program_id} onValueChange={v => setForm(f => ({...f, program_id: v}))}>
                <SelectTrigger><SelectValue placeholder="Tous les programmes" /></SelectTrigger>
                <SelectContent>{programs?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
          </div>
          <DialogFooter><GhButton variant="primary" onClick={handleSubmit} disabled={addSurvey.isPending}>{addSurvey.isPending ? "Création…" : "Créer"}</GhButton></DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
