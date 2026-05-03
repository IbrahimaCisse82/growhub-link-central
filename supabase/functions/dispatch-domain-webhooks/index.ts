// Dispatcher: lit les domain_events non dispatchés et POST vers les webhook_configs actifs
// Filtre par event_type (correspondance exacte ou wildcard "*")
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  const { data: events, error } = await supabase
    .from("domain_events")
    .select("*")
    .is("webhook_dispatched_at", null)
    .order("occurred_at", { ascending: true })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: hooks } = await supabase
    .from("webhook_configs")
    .select("id, name, url, event_type")
    .eq("is_active", true);

  const activeHooks = hooks ?? [];
  let dispatched = 0;
  let skipped = 0;
  const failures: Array<{ event_id: string; hook: string; error: string }> = [];

  for (const ev of events ?? []) {
    const matching = activeHooks.filter(
      (h) => h.event_type === "*" || h.event_type === ev.event_name,
    );

    if (matching.length === 0) {
      // pas d'abonné, on marque comme dispatché pour ne pas re-traiter
      await supabase
        .from("domain_events")
        .update({ webhook_dispatched_at: new Date().toISOString() })
        .eq("id", ev.id);
      skipped++;
      continue;
    }

    for (const hook of matching) {
      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: ev.event_name,
            aggregate_type: ev.aggregate_type,
            aggregate_id: ev.aggregate_id,
            payload: ev.payload,
            actor_user_id: ev.actor_user_id,
            occurred_at: ev.occurred_at,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        failures.push({
          event_id: ev.id,
          hook: hook.name,
          error: (e as Error).message,
        });
      }
    }

    await supabase
      .from("domain_events")
      .update({ webhook_dispatched_at: new Date().toISOString() })
      .eq("id", ev.id);
    dispatched++;
  }

  return new Response(
    JSON.stringify({
      processed: events?.length ?? 0,
      dispatched,
      skipped,
      failures,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
