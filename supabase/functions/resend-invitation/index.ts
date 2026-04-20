import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", coordinator: "Coordinateur", project_manager: "Chef de projet",
  mentor: "Mentor", entrepreneur: "Entrepreneur", evaluator: "Évaluateur",
  investor: "Investisseur", funder: "Bailleur",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient
      .from("user_roles").select("role").eq("user_id", user.id)
      .in("role", ["super_admin", "coordinator"]);
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invitationId, extendExpiry } = await req.json();
    if (!invitationId) {
      return new Response(JSON.stringify({ error: "invitationId requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let { data: invitation, error: invError } = await adminClient
      .from("invitations").select("*").eq("id", invitationId).maybeSingle();
    if (invError || !invitation) {
      return new Response(JSON.stringify({ error: "Invitation introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invitation.status !== "pending") {
      return new Response(JSON.stringify({ error: "Invitation non relançable (statut: " + invitation.status + ")" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optionally extend expiry by 7 days from now
    if (extendExpiry) {
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: updated } = await adminClient
        .from("invitations").update({ expires_at: newExpiry }).eq("id", invitationId).select().single();
      if (updated) invitation = updated;
    }

    const expiresAt = new Date(invitation.expires_at);
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    const origin = req.headers.get("origin") ?? req.headers.get("referer")?.split("/").slice(0, 3).join("/") ?? "";
    const inviteUrl = `${origin}/login?invitation=${invitation.token}`;

    // Count existing reminders for idempotency key uniqueness
    const { count } = await adminClient
      .from("invitation_reminders").select("*", { count: "exact", head: true }).eq("invitation_id", invitationId);

    await adminClient.functions.invoke("send-transactional-email", {
      body: {
        templateName: "invitation-reminder",
        recipientEmail: invitation.email,
        idempotencyKey: `reminder-${invitationId}-${(count ?? 0) + 1}`,
        templateData: {
          inviteUrl,
          roleLabel: ROLE_LABELS[invitation.role] ?? invitation.role,
          daysRemaining,
        },
      },
    });

    await adminClient.from("invitation_reminders").insert({
      invitation_id: invitationId,
      sent_by: user.id,
      reminder_type: "manual",
    });

    return new Response(JSON.stringify({ success: true, inviteUrl, daysRemaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
