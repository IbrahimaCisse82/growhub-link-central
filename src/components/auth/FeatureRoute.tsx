import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isModuleEnabled, type ModuleKey } from "@/lib/featureFlags";

/** Affiche la page seulement si son module est activé ; sinon retour au tableau de bord. */
export default function FeatureRoute({ module, children }: { module: ModuleKey; children: ReactNode }) {
  if (!isModuleEnabled(module)) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}
