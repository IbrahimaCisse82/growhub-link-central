// Dispatcher avec retry exponentiel + désactivation après 5 échecs
// Backoff: 1min → 5min → 30min → 2h → 24h
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BACKOFF_MIN = [1, 5, 30, 120, 1440]; // minutes
const MAX_RETRIES = 5;

async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const force = url.searchParams.get("force") === "1";

  const { data: events, error } = await supabase
    .from("domain_events").select("*").is("webhook_dispatched_at", null)
    .order("occurred_at", { ascending: true }).limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Hooks actifs avec next_retry_at expiré (ou null)
  let hooksQuery = supabase.from("webhook_configs")
    .select("id, name, url, event_type, secret, retry_count, next_retry_at")
    .eq("is_active", true);
  if (!force) hooksQuery = hooksQuery.or("next_retry_at.is.null,next_retry_at.lte." + new Date().toISOString());
  const { data: hooks } = await hooksQuery;
  const activeHooks = hooks ?? [];

  let dispatched = 0; let skipped = 0;
  const failures: Array<{ event_id: string; hook: string; error: string }> = [];

  for (const ev of events ?? []) {
    const matching = activeHooks.filter((h) => h.event_type === "*" || h.event_type === ev.event_name);
    if (matching.length === 0) {
      await supabase.from("domain_events")
        .update({ webhook_dispatched_at: new Date().toISOString() }).eq("id", ev.id);
      skipped++; continue;
    }

    let allOk = true;
    for (const hook of matching) {
      const body = JSON.stringify({
        event: ev.event_name, aggregate_type: ev.aggregate_type, aggregate_id: ev.aggregate_id,
        payload: ev.payload, actor_user_id: ev.actor_user_id, occurred_at: ev.occurred_at,
      });
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (hook.secret) headers["X-GrowHub-Signature"] = "sha256=" + await hmacSha256(hook.secret, body);

      let okStatus: string | null = null;
      let errMsg: string | null = null;
      let httpStatus: number | null = null;
      let responseBody: string | null = null;
      const started = Date.now();
      try {
        const res = await fetch(hook.url, { method: "POST", headers, body });
        httpStatus = res.status;
        const txt = await res.text().catch(() => "");
        responseBody = txt.slice(0, 1000);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${txt.slice(0, 500)}`);
        okStatus = "ok";
      } catch (e) {
        errMsg = (e as Error).message;
        failures.push({ event_id: ev.id, hook: hook.name, error: errMsg });
      }
      const duration = Date.now() - started;
      await supabase.from("webhook_deliveries").insert({
        webhook_config_id: hook.id,
        event_id: ev.id,
        event_name: ev.event_name,
        attempt: (hook.retry_count ?? 0) + 1,
        status: okStatus ? "success" : "failed",
        http_status: httpStatus,
        response_body: responseBody,
        duration_ms: duration,
        error: errMsg,
      });


      if (okStatus) {
        await supabase.from("webhook_configs").update({
          last_dispatch_at: new Date().toISOString(),
          last_dispatch_status: "ok",
          last_success_at: new Date().toISOString(),
          retry_count: 0, next_retry_at: null, last_error_body: null,
        }).eq("id", hook.id);
      } else {
        allOk = false;
        const newRetryCount = (hook.retry_count ?? 0) + 1;
        if (newRetryCount >= MAX_RETRIES) {
          await supabase.from("webhook_configs").update({
            is_active: false,
            last_dispatch_status: "disabled_after_failures",
            last_dispatch_at: new Date().toISOString(),
            last_error_body: errMsg, retry_count: newRetryCount, next_retry_at: null,
            disabled_reason: `Désactivé après ${MAX_RETRIES} tentatives. Dernière erreur: ${errMsg}`,
          }).eq("id", hook.id);
          // Notifier les super_admins
          const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "super_admin");
          for (const a of admins ?? []) {
            await supabase.from("notifications").insert({
              user_id: a.user_id,
              title: "🚨 Webhook désactivé",
              content: `${hook.name} désactivé après 5 échecs. Erreur: ${errMsg?.slice(0, 200)}`,
              type: "system",
              link: "/app/events",
            });
          }
        } else {
          const nextMin = BACKOFF_MIN[newRetryCount - 1] ?? BACKOFF_MIN[BACKOFF_MIN.length - 1];
          await supabase.from("webhook_configs").update({
            last_dispatch_status: `error (${newRetryCount}/${MAX_RETRIES})`,
            last_dispatch_at: new Date().toISOString(),
            last_error_body: errMsg, retry_count: newRetryCount,
            next_retry_at: new Date(Date.now() + nextMin * 60_000).toISOString(),
          }).eq("id", hook.id);
        }
      }
    }

    if (allOk) {
      await supabase.from("domain_events")
        .update({ webhook_dispatched_at: new Date().toISOString() }).eq("id", ev.id);
      dispatched++;
    } else {
      await supabase.from("domain_events").update({
        dispatch_attempts: (ev.dispatch_attempts ?? 0) + 1,
        last_dispatch_error: failures.filter((f) => f.event_id === ev.id).map((f) => f.error).join(" | "),
      }).eq("id", ev.id);
    }
  }

  return new Response(
    JSON.stringify({ processed: events?.length ?? 0, dispatched, skipped, failures }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
