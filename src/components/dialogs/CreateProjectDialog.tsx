import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePrograms } from "@/hooks/usePrograms";
import { useProjectTemplates } from "@/hooks/useProjectTemplates";
import { Sparkles, FileText } from "lucide-react";

const inputCls = "flex h-10 w-full rounded-lg border border-input bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";

export default function CreateProjectDialog({ children, programId }: { children: React.ReactNode; programId?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [progId, setProgId] = useState(programId ?? "");
  const [templateId, setTemplateId] = useState<string>("");
  const { user } = useAuth();
  const { data: programs } = usePrograms();
  const { data: templates } = useProjectTemplates();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async () => {
      if (!progId) throw new Error("Veuillez sélectionner un programme");

      // 1. Create project
      const { data: project, error } = await supabase
        .from("projects")
        .insert({ name, code: code || null, description: description || null, owner_id: user?.id, program_id: progId })
        .select()
        .single();
      if (error) throw error;

      // 2. If template selected → pré-remplir budget_lines, budget_details, assumptions
      if (templateId && project) {
        const [linesRes, detailsRes, assumpRes] = await Promise.all([
          supabase.from("project_template_budget_lines").select("*").eq("template_id", templateId).order("sort_order"),
          supabase.from("project_template_budget_details").select("*").eq("template_id", templateId).order("sort_order"),
          supabase.from("project_template_assumptions").select("*").eq("template_id", templateId).order("sort_order"),
        ]);

        // Insert budget lines
        if (linesRes.data?.length) {
          const lines = linesRes.data.map(l => ({
            project_id: project.id,
            code: l.code, label: l.label, section: l.section, category: l.category,
            year1: 0, year2: 0, year3: 0, year4: 0, year5: 0, sort_order: l.sort_order,
          }));
          await supabase.from("project_budget_lines").insert(lines);
        }

        // Insert budget details (35 activités PAERID)
        if (detailsRes.data?.length) {
          const details = detailsRes.data.map(d => ({
            project_id: project.id,
            code: d.code, activity: d.activity, work_package: d.work_package,
            category: d.category, unit: d.unit, quantity: d.quantity, unit_cost: d.unit_cost,
            year_1: 0, year_2: 0, year_3: 0, year_4: 0, year_5: 0,
            marker_gender: d.marker_gender, marker_climate: d.marker_climate,
            sort_order: d.sort_order,
          }));
          await supabase.from("project_budget_details").insert(details);
        }

        // Insert assumptions
        if (assumpRes.data?.length) {
          const assumps = assumpRes.data.map(a => ({
            project_id: project.id,
            category: a.category, label: a.label, value: a.value, unit: a.unit, notes: a.notes,
            sort_order: a.sort_order,
          }));
          await supabase.from("project_budget_assumptions").insert(assumps);
        }
      }

      return project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setName(""); setCode(""); setDescription(""); setProgId(programId ?? ""); setTemplateId("");
      toast({ title: templateId ? "Projet créé depuis le canevas ✨" : "Projet créé" });
    },
    onError: (e) => toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" }),
  });

  const selectedTemplate = templates?.find(t => t.id === templateId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader><DialogTitle className="font-display">Nouveau projet</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          {/* Canevas selector */}
          {templates && templates.length > 0 && (
            <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Créer depuis un canevas (optionnel)
              </label>
              <select value={templateId} onChange={e => setTemplateId(e.target.value)} className={inputCls}>
                <option value="">— Projet vierge —</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_default ? "(par défaut)" : ""}
                  </option>
                ))}
              </select>
              {selectedTemplate && (
                <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 mt-1">
                  <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Le projet sera pré-rempli avec la structure budgétaire complète (Work Packages, ~35 activités, hypothèses).</span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Programme *</label>
            <select value={progId} onChange={e => setProgId(e.target.value)} required className={inputCls}>
              <option value="">Sélectionner un programme…</option>
              {programs?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
            </select>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Nom *</label><input value={name} onChange={e => setName(e.target.value)} required className={inputCls} /></div>
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Code</label><input value={code} onChange={e => setCode(e.target.value)} className={inputCls} placeholder="PRJ-001" /></div>
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className={inputCls + " h-20 resize-none"} /></div>
          <button type="submit" disabled={create.isPending || !progId} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50">
            {create.isPending ? "Création…" : templateId ? "Créer depuis le canevas" : "Créer"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
