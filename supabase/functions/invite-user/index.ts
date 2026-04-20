import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
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

    const { email, role } = await req.json();
    if (!email || !role) {
      return new Response(JSON.stringify({ error: "Email et rôle requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await adminClient
      .from("invitations").select("id").eq("email", email).eq("status", "pending").maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Une invitation est déjà en attente pour cet email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: invitation, error: insertError } = await adminClient
      .from("invitations").insert({ email, role, invited_by: user.id }).select().single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get inviter name for personalization
    const { data: inviterProfile } = await adminClient
      .from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();

    // Build invite URL (origin from request)
    const origin = req.headers.get("origin") ?? req.headers.get("referer")?.split("/").slice(0, 3).join("/") ?? "";
    const inviteUrl = `${origin}/login?invitation=${invitation.token}`;

    // Send email via transactional system
    try {
      await adminClient.functions.invoke("send-transactional-email", {
        body: {
          templateName: "invitation",
          recipientEmail: email,
          idempotencyKey: `invite-${invitation.id}`,
          templateData: {
            inviteUrl,
            roleLabel: ROLE_LABELS[role] ?? role,
            inviterName: inviterProfile?.full_name ?? "Un administrateur",
          },
        },
      });
    } catch (emailErr) {
      console.error("Email send failed (invitation created):", emailErr);
    }

    return new Response(JSON.stringify({ success: true, invitation, inviteUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
