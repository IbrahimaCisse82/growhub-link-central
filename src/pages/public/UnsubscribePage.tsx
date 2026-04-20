import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "valid" | "already" | "invalid" | "success" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setState("valid");
        else if (d.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token, supabaseUrl, anonKey]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      const r = await fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (d.success) setState("success");
      else if (d.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch { setState("error"); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-lg">
        <h1 className="font-display text-2xl font-bold text-foreground mb-4">Désabonnement</h1>
        {state === "loading" && <p className="text-muted-foreground">Vérification du lien...</p>}
        {state === "invalid" && <p className="text-destructive">Lien invalide ou expiré.</p>}
        {state === "already" && <p className="text-muted-foreground">Vous êtes déjà désabonné de nos emails.</p>}
        {state === "valid" && (
          <>
            <p className="text-muted-foreground mb-6">Confirmez-vous votre désabonnement ? Vous ne recevrez plus d'emails de notre plateforme.</p>
            <button onClick={confirm} disabled={submitting}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 font-semibold hover:opacity-90 transition disabled:opacity-50">
              {submitting ? "Traitement..." : "Confirmer le désabonnement"}
            </button>
          </>
        )}
        {state === "success" && <p className="text-primary font-medium">✓ Vous avez été désabonné avec succès.</p>}
        {state === "error" && <p className="text-destructive">Une erreur s'est produite. Veuillez réessayer.</p>}
      </div>
    </div>
  );
}
