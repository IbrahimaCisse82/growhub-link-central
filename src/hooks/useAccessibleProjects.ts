import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Retourne les UUID des projets auxquels l'utilisateur courant a accès
 * (admin/coord = tous, sinon owner + role_assignments scope=project + via program/portfolio).
 * S'appuie sur la fonction SQL `user_accessible_projects(_user_id)`.
 */
export function useAccessibleProjectIds() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["accessible_projects", profile?.user_id],
    enabled: !!profile?.user_id,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase.rpc("user_accessible_projects", {
        _user_id: profile!.user_id,
      });
      if (error) throw error;
      return new Set((data ?? []).map((r: { user_accessible_projects: string } | string) =>
        typeof r === "string" ? r : r.user_accessible_projects
      ));
    },
  });
}
