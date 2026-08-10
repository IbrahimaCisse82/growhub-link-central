import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useStartups } from "@/hooks/useStartups";
import { useMentors } from "@/hooks/useMentors";

const inputCls = "flex h-10 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";

export default function CreateSessionDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startupId, setStartupId] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const qc = useQueryClient();
  const { data: startups } = useStartups();
  const { data: mentors } = useMentors();
  const { data: templates } = useQuery({
    queryKey: ["email-templates", "coaching"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates" as any)
        .select("*")
        .in("template_key", ["coaching_invite", "coaching_confirmed", "coaching_reminder_24h"]);
      if (error) throw error;
      return data as unknown as Array<{ template_key: string; subject: string; body: string }>;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coaching_sessions").insert({
        title, description: description || null,
        startup_id: startupId, mentor_id: mentorId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: parseInt(duration) || 60,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coaching-sessions"] });
      setOpen(false); setTitle(""); setDescription(""); setStartupId(""); setMentorId(""); setScheduledAt(""); setDuration("60");
      toast({ title: "✓ Session planifiée" });
    },
    onError: (e) => toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle className="font-display">Planifier une session</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!title.trim() || !startupId || !mentorId || !scheduledAt) return; create.mutate(); }} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Titre *</label><input value={title} onChange={e => setTitle(e.target.value)} required className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Entreprise *</label>
              <select value={startupId} onChange={e => setStartupId(e.target.value)} required className={inputCls}>
                <option value="">— Sélectionner</option>
                {startups?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Mentor *</label>
              <select value={mentorId} onChange={e => setMentorId(e.target.value)} required className={inputCls}>
                <option value="">— Sélectionner</option>
                {mentors?.map(m => <option key={m.id} value={m.user_id}>{m.profile.full_name ?? "Mentor"}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Date/Heure *</label><input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required className={inputCls} /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Durée (min)</label><input type="number" value={duration} onChange={e => setDuration(e.target.value)} className={inputCls} /></div>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className={inputCls + " h-16 resize-none"} /></div>
          {templates && templates.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-border p-3 bg-surface-2">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Apercu email invitation</div>
              {(() => {
                const tpl = templates.find(t => t.template_key === "coaching_invite");
                const startupName = startups?.find(s => s.id === startupId)?.name ?? "Startup";
                const mentorName = mentors?.find(m => m.user_id === mentorId)?.profile.full_name ?? "Mentor";
                const meetingDate = scheduledAt ? new Date(scheduledAt).toLocaleString("fr-FR") : "Date a confirmer";
                const values: Record<string, string> = {
                  first_name: startupName,
                  meeting_date: meetingDate,
                  meeting_link: "https://meet.example.com/session",
                  mentor_name: mentorName,
                };
                const render = (txt?: string) => (txt ?? "").replace(/\{\{(.*?)\}\}/g, (_, key) => values[String(key).trim()] ?? "");
                return (
                  <>
                    <div className="text-[11px] text-foreground"><strong>Sujet:</strong> {render(tpl?.subject)}</div>
                    <div className="text-[11px] text-muted-foreground whitespace-pre-wrap">{render(tpl?.body)}</div>
                  </>
                );
              })()}
            </div>
          )}
          <button type="submit" disabled={create.isPending} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50">
            {create.isPending ? "Planification…" : "Planifier"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
