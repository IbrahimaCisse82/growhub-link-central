import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMfaFactors } from "@/hooks/useMfaFactors";
import { ShieldAlert } from "lucide-react";

/**
 * Protège les routes d'administration.
 * RG-AUTH-03 : le second facteur TOTP est obligatoire pour tout rôle d'administration.
 * Sans facteur vérifié, l'accès aux écrans d'administration est bloqué (aucun contournement).
 */
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  const { hasActiveFactor, loading: mfaLoading } = useMfaFactors();
  const navigate = useNavigate();

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/app/dashboard" replace />;
  if (mfaLoading) return null;

  if (!hasActiveFactor) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
          <ShieldAlert className="text-destructive" size={26} />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground mb-2">
          Double authentification requise
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Les écrans d'administration exigent l'activation du second facteur TOTP.
          Activez-le depuis vos paramètres de sécurité pour continuer.
        </p>
        <button
          onClick={() => navigate("/app/parametres/securite")}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Activer la 2FA
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
