import { useState } from "react";
import { Download, Trash2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useGdprExportRequests, useRequestGdprExport, useAccountDeletionRequest, useRequestAccountDeletion, useCancelAccountDeletion } from "@/hooks/useGdprRequests";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { toast } from "@/hooks/use-toast";

export default function GdprDataPanel() {
  const { data: exports } = useGdprExportRequests();
  const requestExport = useRequestGdprExport();
  const { data: deletion } = useAccountDeletionRequest();
  const requestDeletion = useRequestAccountDeletion();
  const cancelDeletion = useCancelAccountDeletion();

  const [showDelete, setShowDelete] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const handleExport = async () => {
    try {
      await requestExport.mutateAsync();
      toast({ title: "✓ Export demandé", description: "Vous recevrez un lien de téléchargement dans quelques minutes." });
    } catch (e) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (confirmText !== "SUPPRIMER") {
      toast({ title: "Tapez SUPPRIMER pour confirmer", variant: "destructive" });
      return;
    }
    try {
      await requestDeletion.mutateAsync(reason);
      toast({ title: "Compte programmé pour suppression dans 30 jours" });
      setShowDelete(false);
    } catch (e) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2 mb-2">
          <Download size={18} /> Exporter mes données (article 15 RGPD)
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Téléchargez une copie complète de vos données personnelles (profil, candidatures, KPIs, messages…) au format ZIP.
        </p>
        <GhButton onClick={handleExport} disabled={requestExport.isPending} variant="primary" size="md">
          {requestExport.isPending ? "Préparation…" : "Demander mon export"}
        </GhButton>

        {exports && exports.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Historique</div>
            {exports.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm p-2 bg-surface-2 rounded-lg">
                <span className="text-foreground">{new Date(e.requested_at).toLocaleString("fr-FR")}</span>
                <div className="flex items-center gap-2">
                  <Pill color={e.status === "completed" ? "green" : e.status === "failed" ? "rose" : "blue"}>{e.status}</Pill>
                  {e.status === "completed" && e.file_path && (
                    <a href={e.file_path} target="_blank" rel="noreferrer" className="text-primary text-xs underline">Télécharger</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deletion */}
      <div className="bg-card border border-destructive/30 rounded-xl p-6">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2 mb-2">
          <Trash2 size={18} className="text-destructive" /> Supprimer mon compte (article 17 RGPD)
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Votre compte sera anonymisé après un délai de 30 jours. Certaines données (factures, paie historique) sont conservées
          pour obligations légales (10 ans).
        </p>

        {deletion && deletion.status === "scheduled" ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock size={16} />
              <span className="text-sm font-medium">Suppression programmée le {new Date(deletion.scheduled_for).toLocaleDateString("fr-FR")}</span>
            </div>
            {deletion.reason && <div className="text-xs text-muted-foreground">Motif : {deletion.reason}</div>}
            <GhButton onClick={() => cancelDeletion.mutate()} variant="secondary" size="sm" disabled={cancelDeletion.isPending}>
              Annuler la demande
            </GhButton>
          </div>
        ) : deletion?.status === "cancelled" ? (
          <div className="flex items-center gap-2 text-sm text-gh-green mb-3">
            <CheckCircle2 size={14} /> Précédente demande annulée
          </div>
        ) : null}

        {(!deletion || deletion.status !== "scheduled") && (
          !showDelete ? (
            <GhButton onClick={() => setShowDelete(true)} variant="secondary" size="md">
              Demander la suppression
            </GhButton>
          ) : (
            <div className="space-y-3 mt-3">
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm">
                <AlertTriangle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-foreground">Action irréversible après 30 jours. Toute votre identité personnelle sera anonymisée.</span>
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motif (facultatif)"
                className="w-full h-20 px-3 py-2 text-sm bg-secondary border border-input rounded-lg text-foreground"
              />
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Tapez "SUPPRIMER" pour confirmer'
                className="w-full h-10 px-3 text-sm bg-secondary border border-input rounded-lg text-foreground"
              />
              <div className="flex gap-2">
                <GhButton onClick={handleDelete} variant="primary" size="md" disabled={requestDeletion.isPending}>
                  Confirmer la suppression
                </GhButton>
                <GhButton onClick={() => setShowDelete(false)} variant="secondary" size="md">Annuler</GhButton>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
