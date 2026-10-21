import { createClient } from "npm:@supabase/supabase-js@2";

type AppRole = "super_admin" | "coordinator" | "staff" | "mentor" | "funder" | "entrepreneur";

interface RequestIdentity {
  kind: "service" | "user";
  userId?: string;
  roles: AppRole[];
}

/** Comparaison en temps constant : ne révèle pas, par la durée, combien de caractères correspondent. */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function requireIdentity(req: Request): Promise<RequestIdentity> {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");

  const token = authorization.slice(7).trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && timingSafeEqual(token, serviceKey)) return { kind: "service", roles: [] };

  const url = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !publishableKey) throw new Error("SERVER_CONFIG");

  const client = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("UNAUTHORIZED");

  const { data } = await client.from("user_roles").select("role").eq("user_id", user.id);
  return { kind: "user", userId: user.id, roles: (data ?? []).map((row) => row.role as AppRole) };
}

export function requireRole(identity: RequestIdentity, allowed: AppRole[]): void {
  if (identity.kind === "service") return;
  if (!identity.roles.some((role) => allowed.includes(role))) throw new Error("FORBIDDEN");
}

export function authError(error: unknown, corsHeaders: Record<string, string>): Response | null {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") return jsonResponse({ error: "Non authentifié" }, 401, corsHeaders);
  if (message === "FORBIDDEN") return jsonResponse({ error: "Accès refusé" }, 403, corsHeaders);
  if (message === "SERVER_CONFIG") return jsonResponse({ error: "Configuration serveur indisponible" }, 500, corsHeaders);
  return null;
}

export function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[char] ?? char);
}