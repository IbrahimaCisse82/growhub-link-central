import { motion } from "framer-motion";
import { useState } from "react";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const eventTypes = [
  { value: "application_submitted", label: "Candidature soumise" },
  { value: "application_status_changed", label: "Statut candidature modifié" },
  { value: "session_completed", label: "Session de coaching terminée" },
  { value: "startup_created", label: "Entreprise créée" },
  { value: "event_created", label: "Événement créé" },
  { value: "milestone_completed", label: "Jalon atteint" },
  { value: "data_collection_submitted", label: "Données collectées soumises" },
];

function useWebhooks() {
  return useQuery({
    queryKey: ["webhook-configs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("webhook_configs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function CreateWebhookDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [eventType, setEventType] = useState("application_submitted");

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("webhook_configs").insert({ name, url, event_type: eventType, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook-configs"] });
      toast({ title: "✓ Webhook créé" });
      setOpen(false); setName(""); setUrl("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <GhButton>+ Ajouter webhook</GhButton>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Ajouter un webhook Zapier</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du webhook"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-[12.5px] text-foreground" />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/..."
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-[12.5px] text-foreground" />
          <div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5">Déclencher sur</div>
            <div className="flex flex-wrap gap-1.5">
              {eventTypes.map(et => (
                <button key={et.value} onClick={() => setEventType(et.value)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${eventType === et.value ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>
                  {et.label}
                </button>
              ))}
            </div>
          </div>
          <GhButton onClick={() => create.mutate()} disabled={!name || !url || create.isPending}>Créer</GhButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WebhooksPage() {
  const { data: webhooks, isLoading } = useWebhooks();
  const qc = useQueryClient();

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("webhook_configs").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["webhook-configs"] }); toast({ title: "✓ Webhook mis à jour" }); },
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhook_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["webhook-configs"] }); toast({ title: "Webhook supprimé" }); },
  });

  const testWebhook = async (webhook: any) => {
    try {
      await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          event: webhook.event_type,
          timestamp: new Date().toISOString(),
          test: true,
          source: "Grow Hub Management System",
        }),
      });
      toast({ title: "✓ Test envoyé", description: "Vérifiez l'historique de votre Zap pour confirmer." });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'envoyer le test.", variant: "destructive" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader
        title="Intégrations & Webhooks"
        subtitle="Connectez GrowHub à Zapier et d'autres outils via des webhooks"
        actions={<CreateWebhookDialog />}
      />

      <div className="bg-surface-2 border border-border rounded-xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <div className="text-[13px] font-bold text-foreground">Comment ça marche</div>
            <ol className="text-[11.5px] text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
              <li>Créez un Zap dans Zapier avec un trigger "Webhooks by Zapier"</li>
              <li>Copiez l'URL du webhook et ajoutez-la ici</li>
              <li>Choisissez l'événement déclencheur</li>
              <li>GrowHub enverra automatiquement les données à votre Zap</li>
            </ol>
          </div>
        </div>
      </div>

      <GhCard title="Webhooks configurés" badge={String(webhooks?.length ?? 0)} noPadding>
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : !webhooks || webhooks.length === 0 ? (
          <EmptyState icon="🔗" title="Aucun webhook" description="Ajoutez votre premier webhook Zapier" />
        ) : (
          <div className="divide-y divide-border">
            {webhooks.map((w: any) => (
              <div key={w.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-foreground">{w.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{w.url}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                      <Pill color={w.is_active ? "green" : "gray"}>{w.is_active ? "Actif" : "Désactivé"}</Pill>
                      <Pill color="blue">{eventTypes.find(e => e.value === w.event_type)?.label ?? w.event_type}</Pill>
                      {w.retry_count > 0 && <Pill color="amber">⏱ {w.retry_count} tentative(s)</Pill>}
                      {w.last_success_at && <span className="text-[10px] text-muted-foreground">✓ {new Date(w.last_success_at).toLocaleString("fr-FR")}</span>}
                      {w.next_retry_at && <span className="text-[10px] text-amber-500">↻ next {new Date(w.next_retry_at).toLocaleString("fr-FR")}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <GhButton variant="secondary" size="sm" onClick={() => testWebhook(w)}>🧪 Test</GhButton>
                    <GhButton variant="ghost" size="sm" onClick={async () => {
                      const { error } = await supabase.functions.invoke("dispatch-domain-webhooks", { body: {} });
                      if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
                      else { toast({ title: "Dispatch lancé" }); qc.invalidateQueries({ queryKey: ["webhook-configs"] }); }
                    }}>↻ Réessayer</GhButton>
                    <GhButton variant="ghost" size="sm" onClick={() => toggleActive.mutate({ id: w.id, active: !w.is_active })}>
                      {w.is_active ? "Désactiver" : "Activer"}
                    </GhButton>
                    <GhButton variant="ghost" size="sm" onClick={() => deleteWebhook.mutate(w.id)}>✕</GhButton>
                  </div>
                </div>
                {w.last_error_body && (
                  <details className="text-[10px] bg-destructive/5 border border-destructive/20 rounded px-2 py-1.5">
                    <summary className="cursor-pointer text-destructive font-mono">Dernière erreur ({w.last_dispatch_status})</summary>
                    <pre className="mt-1 whitespace-pre-wrap text-muted-foreground">{w.last_error_body}</pre>
                    {w.disabled_reason && <div className="mt-1 text-destructive">{w.disabled_reason}</div>}
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </GhCard>
    </motion.div>
  );
}
