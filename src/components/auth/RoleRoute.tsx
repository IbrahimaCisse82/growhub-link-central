import { Navigate } from "react-router-dom";
import { useAuth, type Persona } from "@/hooks/useAuth";

interface RoleRouteProps {
  /** Personas autorisés à accéder à cette route. */
  allow: Persona[];
  /** Route de fallback. Par défaut /app/dashboard. */
  fallback?: string;
  children: React.ReactNode;
}

/**
 * Protège une route en vérifiant le persona métier de l'utilisateur.
 * Les super_admin et coordinator ont toujours accès.
 */
export default function RoleRoute({ allow, fallback = "/app/dashboard", children }: RoleRouteProps) {
  const { persona, loading, isAdmin } = useAuth();

  if (loading) return null;
  if (isAdmin) return <>{children}</>;
  if (!allow.includes(persona)) return <Navigate to={fallback} replace />;

  return <>{children}</>;
}
