// Weekly digest: aggregates each user's last 7 days of unread notifications
// and logs a digest entry. Email delivery itself is deferred to the
// email infrastructure setup (this function generates the digest payload).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { authError, jsonResponse, requireIdentity, requireRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const identity = await requireIdentity(req);
    requireRole(identity, ["super_admin", "coordinator"]);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Find users with digest enabled (weekly)
    const { data: prefs, error: prefsErr } = await supabase
      .from("user_notification_prefs")
      .select("user_id")
      .eq("email_digest_enabled", true)
      .eq("email_digest_frequency", "weekly");
    if (prefsErr) throw prefsErr;

    let processed = 0;
    let skipped = 0;

    for (const p of prefs ?? []) {
      // Idempotency check
      const { data: existing } = await supabase
        .from("digest_email_log")
        .select("id")
        .eq("user_id", p.user_id)
        .gte("period_start", new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();
      if (existing) { skipped++; continue; }

      const { data: notifs } = await supabase
        .from("notifications")
        .select("title, content, type, link, created_at")
        .eq("user_id", p.user_id)
        .gte("created_at", periodStart)
        .order("created_at", { ascending: false })
        .limit(50);

      const count = notifs?.length ?? 0;
      // Log digest (email delivery: TODO once email infra enabled)
      await supabase.from("digest_email_log").insert({
        user_id: p.user_id,
        period_start: periodStart,
        period_end: periodEnd,
        notifications_count: count,
        status: count > 0 ? "queued" : "skipped_empty",
      });

      processed++;
    }

    return new Response(JSON.stringify({
      ok: true,
      processed,
      skipped,
      period: { start: periodStart, end: periodEnd },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-digest error:", e);
    const response = authError(e, corsHeaders);
    return response ?? jsonResponse({ error: "Traitement impossible" }, 500, corsHeaders);
  }
});
