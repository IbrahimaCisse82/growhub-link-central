import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, ShieldAlert, Trash2, Loader2 } from "lucide-react";
import { useMfaFactors } from "@/hooks/useMfaFactors";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { toast } from "@/hooks/use-toast";

const inputCls = "flex h-10 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export default function MfaSetupCard() {
  const { factors, hasActiveFactor, enroll, challenge, verify, unenroll, loading } = useMfaFactors();
  const [enrolling, setEnrolling] = useState(false);
  const [secret, setSecret] = useState<{ factorId: string; uri: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      const data = await enroll(`GrowHub-${new Date().toISOString().slice(0, 10)}`);
      setSecret({ factorId: data.id, uri: data.totp.uri, secret: data.totp.secret });
    } catch (e) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!secret || code.length < 6) return;
    setVerifying(true);
    try {
      const ch = await challenge(secret.factorId);
      await verify(secret.factorId, ch.id, code);
      toast({ title: "✓ Authentification 2FA activée" });
      setSecret(null);
      setCode("");
    } catch (e) {
      toast({ title: "Code invalide", description: (e as Error).message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleRemove = async (factorId: string) => {
    if (!confirm("Désactiver la 2FA ? Votre compte sera moins sécurisé.")) return;
    try {
      await unenroll(factorId);
      toast({ title: "✓ 2FA désactivée" });
    } catch (e) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">
            {hasActiveFactor ? <ShieldCheck size={18} className="text-gh-green" /> : <ShieldAlert size={18} className="text-gh-rose" />}
            Authentification à deux facteurs (2FA)
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Protège votre compte avec un code TOTP (Google Authenticator, Authy, 1Password…).
          </p>
        </div>
        {hasActiveFactor ? <Pill color="green">Activée</Pill> : <Pill color="rose">Désactivée</Pill>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Chargement…</div>
      ) : factors.length === 0 ? (
        secret ? (
          <div className="space-y-3 p-4 bg-surface-2 rounded-lg">
            <div className="text-sm text-foreground">1. Scannez ce QR code avec votre app d'authentification :</div>
            <div className="bg-white p-4 rounded-lg inline-block">
              <QRCodeSVG value={secret.uri} size={180} />
            </div>
            <div className="text-xs text-muted-foreground">Ou saisissez manuellement : <code className="bg-surface-3 px-1.5 py-0.5 rounded font-mono">{secret.secret}</code></div>
            <div className="text-sm text-foreground pt-2">2. Entrez le code à 6 chiffres :</div>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" className={inputCls + " font-mono text-center tracking-widest"} maxLength={6} />
              <GhButton onClick={handleVerify} disabled={verifying || code.length < 6} variant="primary" size="md">
                {verifying ? "…" : "Vérifier"}
              </GhButton>
            </div>
          </div>
        ) : (
          <GhButton onClick={startEnroll} disabled={enrolling} variant="primary" size="md">
            {enrolling ? "…" : "Activer la 2FA"}
          </GhButton>
        )
      ) : (
        <div className="space-y-2">
          {factors.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
              <div>
                <div className="text-sm font-medium text-foreground">{f.friendly_name || "TOTP"}</div>
                <div className="text-xs text-muted-foreground">Ajouté le {new Date(f.created_at).toLocaleDateString("fr-FR")}</div>
              </div>
              <button onClick={() => handleRemove(f.id)} className="text-destructive hover:text-destructive/80 p-1.5 rounded-lg hover:bg-destructive/10">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
