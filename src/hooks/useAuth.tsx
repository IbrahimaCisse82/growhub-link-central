import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  is_approved: boolean;
  phone: string | null;
  organization: string | null;
  position: string | null;
  bio: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  reports_to_id: string | null;
  department: string | null;
  job_title: string | null;
  timezone: string | null;
  language_pref: string | null;
  onboarding_completed_at: string | null;
  onboarding_persona: string | null;
  onboarding_steps_done: unknown;
}

interface RoleAssignment {
  id: string;
  role: AppRole;
  scope_type: "global" | "portfolio" | "program" | "project" | "cohort";
  scope_id: string | null;
  expires_at: string | null;
}

/** Persona métier dérivé des rôles assignés. */
export type Persona =
  | "super_admin"
  | "coordinator"
  | "project_manager"
  | "consultant"
  | "entrepreneur"
  | "funder"
  | "staff"
  | "user";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  assignments: RoleAssignment[];
  persona: Persona;
  loading: boolean;
  isAdmin: boolean;
  hasScopedRole: (role: AppRole, scopeType?: RoleAssignment["scope_type"], scopeId?: string) => boolean;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  roles: [],
  assignments: [],
  persona: "user",
  loading: true,
  isAdmin: false,
  hasScopedRole: () => false,
  signOut: async () => {},
  refetchProfile: async () => {},
});

const CONSULTANT_ROLES: AppRole[] = ["mentor", "consultant_expert", "consultant_coach"];

function derivePersona(roles: AppRole[]): Persona {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("coordinator")) return "coordinator";
  if (roles.includes("project_manager")) return "project_manager";
  if (roles.some((r) => CONSULTANT_ROLES.includes(r))) return "consultant";
  if (roles.includes("funder") || roles.includes("investor")) return "funder";
  if (roles.includes("staff")) return "staff";
  if (roles.includes("entrepreneur")) return "entrepreneur";
  return "user";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRoles = async (userId: string) => {
    const [profileRes, rolesRes, assignRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, user_id, full_name, email, is_approved, phone, organization, position, bio, linkedin_url, avatar_url, reports_to_id, department, job_title, timezone, language_pref, onboarding_completed_at, onboarding_persona, onboarding_steps_done"
        )
        .eq("user_id", userId)
        .single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("role_assignments")
        .select("id, role, scope_type, scope_id, expires_at")
        .eq("user_id", userId),
    ]);
    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (rolesRes.data) setRoles(rolesRes.data.map((r) => r.role as AppRole));
    if (assignRes.data) setAssignments(assignRes.data as RoleAssignment[]);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setTimeout(() => fetchProfileAndRoles(session.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
        setAssignments([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfileAndRoles(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setAssignments([]);
  };

  const refetchProfile = async () => {
    if (session?.user) await fetchProfileAndRoles(session.user.id);
  };

  const isAdmin = roles.includes("super_admin") || roles.includes("coordinator");

  const persona = useMemo(() => derivePersona(roles), [roles]);

  const hasScopedRole = (
    role: AppRole,
    scopeType?: RoleAssignment["scope_type"],
    scopeId?: string
  ): boolean => {
    if (roles.includes(role)) return true;
    return assignments.some((a) => {
      if (a.role !== role) return false;
      if (a.expires_at && new Date(a.expires_at) <= new Date()) return false;
      if (a.scope_type === "global") return true;
      if (!scopeType) return true;
      if (a.scope_type !== scopeType) return false;
      return !scopeId || !a.scope_id || a.scope_id === scopeId;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        roles,
        assignments,
        persona,
        loading,
        isAdmin,
        hasScopedRole,
        signOut,
        refetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
