import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Create request row
    const { data: reqRow, error: insErr } = await admin.from("data_export_requests").insert({
      user_id: user.id,
      status: "processing",
    }).select().single();
    if (insErr) throw insErr;

    // Gather data
    const collect = async (table: string, filter: Record<string, string>) => {
      let q = admin.from(table).select("*");
      for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
      const { data } = await q;
      return data ?? [];
    };

    const payload: Record<string, unknown> = {
      generated_at: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      profile: await collect("profiles", { user_id: user.id }),
      applications: await collect("applications", { applicant_id: user.id }),
      coaching_sessions_as_mentor: await collect("coaching_sessions", { mentor_id: user.id }),
      tasks_assigned: await collect("tasks", { assignee_id: user.id }),
      messages_sent: await collect("channel_messages", { sender_id: user.id }),
      notifications: await collect("notifications", { user_id: user.id }),
      hr_employee: await collect("hr_employees", { user_id: user.id }),
      cookie_consents: await collect("cookie_consents", { user_id: user.id }),
      role_assignments: await collect("role_assignments", { user_id: user.id }),
      user_roles: await collect("user_roles", { user_id: user.id }),
    };

    const json = JSON.stringify(payload, null, 2);
    const filename = `${user.id}/export-${Date.now()}.json`;

    const { error: upErr } = await admin.storage.from("gdpr-exports").upload(filename, new Blob([json], { type: "application/json" }), { upsert: true });
    if (upErr) throw upErr;

    const { data: signed } = await admin.storage.from("gdpr-exports").createSignedUrl(filename, 60 * 60 * 24 * 7);

    await admin.from("data_export_requests").update({
      status: "completed",
      file_path: signed?.signedUrl ?? null,
      completed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }).eq("id", reqRow.id);

    return new Response(JSON.stringify({ success: true, request_id: reqRow.id, download_url: signed?.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gdpr-export error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
