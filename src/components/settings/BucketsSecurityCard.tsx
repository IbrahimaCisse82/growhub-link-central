import GhCard from "@/components/shared/GhCard";
import { Lock, Unlock } from "lucide-react";

const BUCKETS: Array<{ name: string; visibility: "public" | "private"; purpose: string }> = [
  { name: "avatars", visibility: "public", purpose: "Photos de profil utilisateurs" },
  { name: "logos", visibility: "public", purpose: "Logos organisations & programmes" },
  { name: "resources", visibility: "public", purpose: "Ressources pédagogiques (LMS)" },
  { name: "message-attachments", visibility: "public", purpose: "Pièces jointes messagerie" },
  { name: "grant-documents", visibility: "private", purpose: "Documents contractuels subventions (URL signée 1h)" },
  { name: "entity-documents", visibility: "private", purpose: "Documents projets/programmes (URL signée 1h)" },
  { name: "receipts", visibility: "private", purpose: "Pièces justificatives transactions (URL signée 1h)" },
  { name: "hr-expense-receipts", visibility: "private", purpose: "Justificatifs notes de frais (URL signée 1h)" },
];

export default function BucketsSecurityCard() {
  return (
    <GhCard title="Visibilité des buckets de stockage">
      <div className="space-y-2">
        {BUCKETS.map((b) => (
          <div key={b.name} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-muted/30 border border-border">
            <div className="flex items-center gap-2 min-w-0">
              {b.visibility === "private" ? (
                <Lock className="h-3.5 w-3.5 text-gh-green shrink-0" />
              ) : (
                <Unlock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-xs font-mono font-semibold truncate">{b.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{b.purpose}</div>
              </div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${b.visibility === "private" ? "bg-gh-green/15 text-gh-green" : "bg-amber-500/15 text-amber-600"}`}>
              {b.visibility === "private" ? "PRIVÉ" : "PUBLIC"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">
        Les buckets privés exigent une URL signée temporaire (1h) générée à la demande pour chaque téléchargement.
        Les politiques RLS limitent l'accès aux utilisateurs ayant un scope autorisé sur le projet/programme/subvention lié.
      </p>
    </GhCard>
  );
}
