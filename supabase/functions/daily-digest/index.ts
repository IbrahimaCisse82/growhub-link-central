// Daily digest — aggregates each user's last 24h notifications
// for users with email_digest_frequency='daily' and email_digest_enabled=true.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: prefs, error: prefsErr } = await supabase
      .from("user_notification_prefs")
      .select("user_id")
      .eq("email_digest_enabled", true)
      .eq("email_digest_frequency", "daily");
    if (prefsErr) throw prefsErr;

    let processed = 0;
    let skipped = 0;
    const results: Array<Record<string, unknown>> = [];

    for (const p of prefs ?? []) {
      // Idempotency: skip if a digest was logged in the last 20h for the user
      const { data: existing } = await supabase
        .from("digest_email_log")
        .select("id")
        .eq("user_id", p.user_id)
        .gte("period_start", new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString())
        .maybeSingle();
      if (existing) { skipped++; continue; }

      const { data: notifs } = await supabase
        .from("notifications")
        .select("title, content, type, link, created_at")
        .eq("user_id", p.user_id)
        .gte("created_at", periodStart)
        .order("created_at", { ascending: false })
        .limit(30);

      const count = notifs?.length ?? 0;
      const { data: profile } = await supabase
        .from("profiles_safe")
        .select("email, full_name")
        .eq("user_id", p.user_id)
        .maybeSingle();

      await supabase.from("digest_email_log").insert({
        user_id: p.user_id,
        period_start: periodStart,
        period_end: periodEnd,
        notifications_count: count,
        status: count > 0 ? "queued" : "skipped_empty",
      });

      results.push({
        user_id: p.user_id,
        email: profile?.email,
        full_name: profile?.full_name,
        count,
      });
      processed++;
    }

    return new Response(JSON.stringify({ ok: true, frequency: "daily", processed, skipped, period: { start: periodStart, end: periodEnd }, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-digest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
