// Public REST API v1 — Bearer auth via api_keys (lv_<prefix>_<secret>)
// Endpoints (GET): /v1/projects, /v1/grants, /v1/startups, /v1/me
// Scopes: "read" (all GET), "write" (reserved for future)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const parts = token.split("_");
  if (parts.length !== 3 || parts[0] !== "lv") {
    return jsonResponse({ error: "Invalid API key format. Expected lv_<prefix>_<secret>" }, 401);
  }
  const prefix = parts[1];
  const secret = parts[2];
  const hash = await sha256Hex(secret);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: keyRow, error: keyErr } = await admin.rpc("verify_api_key", {
    _prefix: prefix, _hash: hash,
  });
  if (keyErr || !keyRow || (Array.isArray(keyRow) && keyRow.length === 0)) {
    return jsonResponse({ error: "Invalid or revoked API key" }, 401);
  }
  const row = Array.isArray(keyRow) ? keyRow[0] : keyRow;
  const userId: string = row.user_id;
  const scopes: string[] = row.scopes ?? [];
  await admin.rpc("log_api_key_usage", { _id: row.api_key_id });

  const url = new URL(req.url);
  // Strip function prefix; expect path like /v1/<resource>
  const rawPath = url.pathname.replace(/^\/public-api/, "").replace(/^\/functions\/v1\/public-api/, "");
  const seg = rawPath.split("/").filter(Boolean);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);

  if (seg[0] !== "v1") return jsonResponse({ error: "Use /v1/<resource>" }, 404);
  if (req.method !== "GET") return jsonResponse({ error: "Only GET supported" }, 405);
  if (!scopes.includes("read") && !scopes.includes("*")) {
    return jsonResponse({ error: "Missing 'read' scope" }, 403);
  }

  const resource = seg[1];
  try {
    if (resource === "me") {
      const { data } = await admin.from("profiles").select("user_id, full_name, email, organization").eq("user_id", userId).maybeSingle();
      return jsonResponse({ data });
    }
    if (resource === "projects") {
      const { data: ids } = await admin.rpc("user_accessible_projects", { _user_id: userId });
      const idList = (ids ?? []).map((r: { user_accessible_projects?: string } | string) =>
        typeof r === "string" ? r : (r as { user_accessible_projects: string }).user_accessible_projects);
      const { data, error } = await admin.from("projects")
        .select("id, name, status, program_id, owner_id, progress, created_at")
        .in("id", idList).limit(limit);
      if (error) throw error;
      return jsonResponse({ data });
    }
    if (resource === "grants") {
      const { data, error } = await admin.from("grants")
        .select("id, name, code, organization, status, amount_total, amount_disbursed, project_id, created_at")
        .limit(limit);
      if (error) throw error;
      return jsonResponse({ data });
    }
    if (resource === "startups") {
      const { data, error } = await admin.from("startups")
        .select("id, name, sector, stage, cohort_id, created_at").limit(limit);
      if (error) throw error;
      return jsonResponse({ data });
    }
    return jsonResponse({ error: `Unknown resource: ${resource}` }, 404);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
