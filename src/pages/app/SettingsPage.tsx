import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SectionHeader from "@/components/shared/SectionHeader";
import AuditTrailPanel from "@/components/audit/AuditTrailPanel";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { toast } from "@/hooks/use-toast";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { SHORTCUT_HINTS } from "@/hooks/useKeyboardShortcuts";
import { Keyboard } from "lucide-react";
import OrgSettingsCard from "@/components/settings/OrgSettingsCard";
import { useAuth as useAuthForOrg } from "@/hooks/useAuth";

const notifTypes = [
  { key: "application", label: "Candidatures", description: "Mises à jour de statut des candidatures" },
  { key: "coaching", label: "Coaching", description: "Sessions planifiées, confirmées ou annulées" },
  { key: "task", label: "Tâches", description: "Nouvelles tâches assignées" },
  { key: "milestone", label: "Jalons", description: "Jalons atteints dans les projets" },
  { key: "risk", label: "Risques", description: "Alertes sur les risques critiques" },
  { key: "message", label: "Messages", description: "Nouveaux messages reçus" },
  { key: "success", label: "Système", description: "Notifications système importantes" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: prefs } = useQuery({
    queryKey: ["notif-preferences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as { preferences: Record<string, boolean> } | null;
    },
  });

  const defaultPrefs = Object.fromEntries(notifTypes.map(n => [n.key, true]));
  const [preferences, setPreferences] = useState<Record<string, boolean>>(defaultPrefs);

  useEffect(() => {
    if (prefs?.preferences) {
      setPreferences({ ...defaultPrefs, ...prefs.preferences });
    }
  }, [prefs]);

  const savePrefs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notification_preferences" as any)
        .upsert({
          user_id: user!.id,
          preferences,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notif-preferences"] });
      toast({ title: "✓ Préférences sauvegardées" });
    },
  });

  const toggle = (key: string) => setPreferences(p => ({ ...p, [key]: !p[key] }));
  const [selectedTemplate, setSelectedTemplate] = useState("coaching_invite");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: emailTemplates } = useQuery({
    queryKey: ["email-templates"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates" as any)
        .select("*")
        .order("template_key");
      if (error) throw error;
      return data as unknown as Array<{ template_key: string; subject: string; body: string }>;
    },
  });

  useEffect(() => {
    const found = emailTemplates?.find(t => t.template_key === selectedTemplate);
    setSubject(found?.subject ?? "");
    setBody(found?.body ?? "");
  }, [emailTemplates, selectedTemplate]);

  const saveTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("email_templates" as any).upsert({
        template_key: selectedTemplate,
        subject,
        body,
        updated_by: user!.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "template_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "✓ Template email sauvegardé" });
    },
  });

  const dispatchCoachingEmails = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("dispatch-coaching-emails", {
        body: {},
      });
      if (error) throw error;
      return data as { sent?: number; failed?: number; reminders_enqueued?: number };
    },
    onSuccess: (data) => {
      toast({
        title: "✓ Envoi traite",
        description: `${data?.sent ?? 0} envoye(s), ${data?.failed ?? 0} echec(s), ${data?.reminders_enqueued ?? 0} rappel(s) prepares.`,
      });
    },
    onError: (e) => {
      toast({
        title: "Erreur envoi emails",
        description: (e as Error).message,
        variant: "destructive",
      });
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Paramètres" subtitle="Gérez vos préférences de notification et paramètres" />

      <div className="max-w-2xl">
        <OrgSettingsSection />
        <GhCard title="🔔 Préférences de notification">
          <div className="space-y-3">
            {notifTypes.map(n => (
              <div key={n.key} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div>
                  <div className="text-[13px] font-medium text-foreground">{n.label}</div>
                  <div className="text-[11px] text-muted-foreground">{n.description}</div>
                </div>
                <button
                  onClick={() => toggle(n.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences[n.key] ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences[n.key] ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <GhButton variant="primary" onClick={() => savePrefs.mutate()} disabled={savePrefs.isPending}>
              {savePrefs.isPending ? "Sauvegarde…" : "Enregistrer les préférences"}
            </GhButton>
          </div>
        </GhCard>

        <GhCard title="✉ Templates email coaching" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: "coaching_invite", label: "Invitation" },
                { key: "coaching_reminder_24h", label: "Rappel 24h" },
                { key: "coaching_confirmed", label: "Confirmation" },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setSelectedTemplate(t.key)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg ${selectedTemplate === t.key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-[12px] text-foreground"
              placeholder="Sujet de l'email"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-[12px] text-foreground h-36 resize-none"
              placeholder="Corps du message. Variables: {{first_name}}, {{meeting_date}}, {{meeting_link}}, {{mentor_name}}"
            />
            <div className="text-[11px] text-muted-foreground">
              Variables disponibles: {"{{first_name}}"}, {"{{meeting_date}}"}, {"{{meeting_link}}"}, {"{{mentor_name}}"}.
            </div>
            <div className="flex justify-end">
              <GhButton onClick={() => saveTemplate.mutate()} disabled={!subject.trim() || !body.trim() || saveTemplate.isPending}>
                {saveTemplate.isPending ? "Sauvegarde..." : "Enregistrer le template"}
              </GhButton>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">
                Lance l'envoi des emails en file d'attente et genere les rappels J-1.
              </div>
              <GhButton variant="secondary" onClick={() => dispatchCoachingEmails.mutate()} disabled={dispatchCoachingEmails.isPending}>
                {dispatchCoachingEmails.isPending ? "Envoi..." : "Executer l'envoi coaching"}
              </GhButton>
            </div>
          </div>
        </GhCard>

        <GhCard title="📋 Historique d'activité" className="mt-4">
          <AuditTrailPanel limit={30} />
        </GhCard>

        <NewNotifPrefsCard />
        <KeyboardShortcutsCard />
      </div>
    </motion.div>
  );
}

function NewNotifPrefsCard() {
  const { prefs, isLoading, save } = useNotificationPrefs();
  const [draft, setDraft] = useState(prefs ?? null);

  useEffect(() => { setDraft(prefs ?? null); }, [prefs]);

  if (isLoading || !draft) return null;

  const Toggle = ({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
      <div>
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );

  return (
    <GhCard title="🔔 Préférences avancées (V4)" className="mt-4">
      <div className="space-y-1">
        <Toggle label="Tâches" description="Notifications quand on t'assigne une tâche" value={draft.task_notifications} onChange={v => setDraft({ ...draft, task_notifications: v })} />
        <Toggle label="Candidatures" description="Mises à jour de statut des candidatures" value={draft.application_notifications} onChange={v => setDraft({ ...draft, application_notifications: v })} />
        <Toggle label="Coaching" description="Sessions planifiées, confirmées, annulées" value={draft.coaching_notifications} onChange={v => setDraft({ ...draft, coaching_notifications: v })} />
        <Toggle label="Jalons" description="Jalons atteints dans tes projets" value={draft.milestone_notifications} onChange={v => setDraft({ ...draft, milestone_notifications: v })} />
        <Toggle label="Risques" description="Alertes critiques sur les risques" value={draft.risk_notifications} onChange={v => setDraft({ ...draft, risk_notifications: v })} />
        <Toggle label="Messages" description="Nouveaux messages reçus" value={draft.message_notifications} onChange={v => setDraft({ ...draft, message_notifications: v })} />
      </div>

      <div className="mt-4 pt-3 border-t border-border space-y-3">
        <Toggle
          label="Résumé email périodique"
          description="Reçois un récap des activités par email"
          value={draft.email_digest_enabled}
          onChange={v => setDraft({ ...draft, email_digest_enabled: v })}
        />
        {draft.email_digest_enabled && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted-foreground">Fréquence :</label>
            <select
              value={draft.email_digest_frequency}
              onChange={e => setDraft({ ...draft, email_digest_frequency: e.target.value as any })}
              className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-[12px] text-foreground"
            >
              <option value="daily">Quotidien</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="never">Jamais</option>
            </select>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <GhButton variant="primary" onClick={() => save.mutate(draft)} disabled={save.isPending}>
          {save.isPending ? "Sauvegarde…" : "Enregistrer"}
        </GhButton>
      </div>
    </GhCard>
  );
}

function KeyboardShortcutsCard() {
  return (
    <GhCard title="⌨ Raccourcis clavier" className="mt-4">
      <div className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1.5">
        <Keyboard size={12} /> Navigation rapide — appuie sur <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">g</kbd> puis une lettre.
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SHORTCUT_HINTS.map(s => (
          <div key={s.key} className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2">
            <span className="text-[12px] text-foreground">{s.label}</span>
            <kbd className="px-2 py-0.5 bg-card border border-border rounded text-[10px] font-mono text-muted-foreground">{s.key}</kbd>
          </div>
        ))}
      </div>
    </GhCard>
  );
}
