import { useState } from "react";
import { Cookie, Settings2 } from "lucide-react";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import GhButton from "@/components/shared/GhButton";
import { Link } from "react-router-dom";

export default function CookieConsentBanner() {
  const { consent, save } = useCookieConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  if (consent) return null;

  const acceptAll = () => save({ necessary: true, analytics: true, marketing: true });
  const rejectAll = () => save({ necessary: true, analytics: false, marketing: false });
  const saveCustom = () => save({ necessary: true, analytics, marketing });

  return (
    <div className="fixed bottom-0 inset-x-0 z-[300] p-4">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-xl shadow-2xl p-5">
        <div className="flex items-start gap-3">
          <Cookie className="text-gh-green flex-shrink-0 mt-1" size={20} />
          <div className="flex-1">
            <h4 className="font-display font-bold text-foreground mb-1">Vos préférences de confidentialité</h4>
            <p className="text-sm text-muted-foreground">
              Nous utilisons des cookies pour faire fonctionner la plateforme, mesurer l'usage et améliorer votre expérience.
              Consultez notre{" "}
              <Link to="/politique-confidentialite" className="text-primary underline">politique de confidentialité</Link>.
            </p>

            {showSettings && (
              <div className="mt-4 space-y-2 p-3 bg-surface-2 rounded-lg">
                <label className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-foreground">Nécessaires</div>
                    <div className="text-xs text-muted-foreground">Indispensables au fonctionnement</div>
                  </div>
                  <input type="checkbox" checked disabled className="accent-primary" />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-foreground">Analytics</div>
                    <div className="text-xs text-muted-foreground">Mesure d'audience anonymisée</div>
                  </div>
                  <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="accent-primary" />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-foreground">Marketing</div>
                    <div className="text-xs text-muted-foreground">Communications personnalisées</div>
                  </div>
                  <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="accent-primary" />
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <GhButton onClick={acceptAll} variant="primary" size="sm">Tout accepter</GhButton>
              <GhButton onClick={rejectAll} variant="secondary" size="sm">Tout refuser</GhButton>
              {showSettings ? (
                <GhButton onClick={saveCustom} variant="secondary" size="sm">Enregistrer mes choix</GhButton>
              ) : (
                <button onClick={() => setShowSettings(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2">
                  <Settings2 size={12} /> Personnaliser
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
