// Rappels quotidiens des jalons : J-7, J-3, J-1, jour J et retards (notification au responsable du projet et aux coordinateurs)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authError, jsonResponse, requireIdentity, requireRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Milestone {
  id: string;
  title: string;
  due_date: string;
  status: string | null;
  project_id: string;
  projects: { name: string; owner_id: string | null } | null;
}

function daysUntil(d: string): number {
  const t = new Date(d); t.setHours(0, 0, 0, 0);
  const n = new Date(); n.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - n.getTime()) / 86400000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const identity = await requireIdentity(req);
    requireRole(identity, ["super_admin", "coordinator"]);
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: ms, error } = await supabase
      .from("milestones")
      .select("id, title, due_date, status, project_id, projects(name, owner_id)")
      .not("due_date", "is", null)
      .neq("status", "completed");
    if (error) throw error;

    const { data: coords } = await supabase.from("user_roles").select("user_id").in("role", ["super_admin", "coordinator"]);
    const coordIds = Array.from(new Set((coords ?? []).map((c: { user_id: string }) => c.user_id)));

    let sent = 0;
    for (const m of (ms ?? []) as unknown as Milestone[]) {
      const d = daysUntil(m.due_date);
      const late = d < 0 && d % 7 === 0; // retard : rappel hebdomadaire
      if (![7, 3, 1, 0].includes(d) && !late) continue;
      const title = d < 0 ? `Jalon en retard de ${-d} jour(s)` : d === 0 ? "Jalon à échéance aujourd'hui" : `Jalon à échéance dans ${d} jour(s)`;
      const content = `${m.title} — ${m.projects?.name ?? "Projet"}`;
      const targets = new Set<string>(coordIds);
      if (m.projects?.owner_id) targets.add(m.projects.owner_id);
      for (const uid of targets) {
        await supabase.rpc("create_notification", {
          p_user_id: uid, p_title: title, p_content: content, p_type: d < 0 ? "alert" : "reminder", p_link: "/app/jalons",
        });
        sent++;
      }
    }
    return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const response = authError(e, corsHeaders);
    return response ?? jsonResponse({ ok: false, error: "Traitement impossible" }, 500, corsHeaders);
  }
});
