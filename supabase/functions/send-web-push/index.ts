// Send Web Push notification to a user's registered subscriptions.
// Requires VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY secrets and a VAPID_SUBJECT (mailto:...).
// Body: { user_id: string, title: string, body: string, url?: string, tag?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";
import { authError, jsonResponse, requireIdentity, requireRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:notifications@growhub.local";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const identity = await requireIdentity(req);
    requireRole(identity, ["super_admin", "coordinator"]);
    const input = await req.json().catch(() => null);
    const { user_id, title, body, url, tag } = (input ?? {}) as Record<string, unknown>;
    if (typeof user_id !== "string" || !/^[0-9a-f-]{36}$/i.test(user_id) || typeof title !== "string" || !title.trim() || title.length > 120 || typeof body !== "string" || !body.trim() || body.length > 1000 || (url !== undefined && (typeof url !== "string" || !url.startsWith("/app/") || url.length > 500)) || (tag !== undefined && (typeof tag !== "string" || tag.length > 100))) {
      return new Response(JSON.stringify({ error: "user_id, title and body are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .eq("user_id", user_id);
    if (error) throw error;

    const payload = JSON.stringify({ title, body, url: url ?? "/app/dashboard", tag });
    let sent = 0, removed = 0, failed = 0;

    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
          payload,
        );
        sent++;
        await supabase.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
          removed++;
        } else {
          failed++;
          console.error("push send failed", statusCode, err);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, removed, failed, total: subs?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-web-push error:", e);
    const response = authError(e, corsHeaders);
    return response ?? jsonResponse({ error: "Notification impossible" }, 500, corsHeaders);
  }
});
