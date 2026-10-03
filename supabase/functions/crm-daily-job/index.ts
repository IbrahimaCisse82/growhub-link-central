import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authError, jsonResponse, requireIdentity, requireRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date().toISOString().slice(0, 10);
  const result: Record<string, any> = { today };

  try {
    const identity = await requireIdentity(req);
    requireRole(identity, ["super_admin", "coordinator"]);
    // 1) Mark overdue invoices
    const { data: overdueUpdated, error: overdueErr } = await supabase
      .from("crm_invoices")
      .update({ status: "en_retard" })
      .lt("due_date", today)
      .in("status", ["envoyee", "payee_partiel"])
      .select("id");
    if (overdueErr) throw overdueErr;
    result.overdue_marked = overdueUpdated?.length ?? 0;

    // 2) Auto-generate invoices from due subscription occurrences (auto_invoice = true)
    const { data: dueOccs, error: occErr } = await supabase
      .from("crm_subscription_occurrences")
      .select("*, subscription:crm_subscriptions(*)")
      .lte("due_date", today)
      .eq("is_paid", false)
      .is("invoice_id", null);
    if (occErr) throw occErr;

    let generated = 0;
    for (const occ of dueOccs ?? []) {
      const sub: any = occ.subscription;
      if (!sub?.auto_invoice) continue;
      // Create invoice (achat — facture reçue from supplier)
      const { data: inv, error: invErr } = await supabase
        .from("crm_invoices")
        .insert({
          contrepartie_id: sub.contrepartie_id,
          direction: "recue",
          issue_date: occ.due_date,
          due_date: occ.due_date,
          currency: occ.currency,
          tax_rate: 0,
          status: "envoyee",
          subscription_id: sub.id,
          reference: `Abonnement ${sub.name}`,
          notes: `Échéance auto-générée — ${sub.frequency}`,
        })
        .select()
        .single();
      if (invErr) { console.error("insert invoice err", invErr); continue; }
      await supabase.from("crm_invoice_lines").insert({
        invoice_id: inv.id,
        description: `${sub.name} — ${occ.due_date}`,
        quantity: 1,
        unit_price: Number(occ.amount),
        tax_rate: 0,
        sort_order: 0,
      });
      await supabase.from("crm_subscription_occurrences").update({ invoice_id: inv.id }).eq("id", occ.id);
      generated++;
    }
    result.invoices_generated = generated;

    // 3) Send reminders for overdue invoices not reminded in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: toRemind } = await supabase
      .from("crm_invoices")
      .select("id, contrepartie:crm_contreparties(email, contact_email)")
      .eq("direction", "emise")
      .eq("status", "en_retard")
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${sevenDaysAgo}`)
      .limit(20);

    let reminded = 0;
    for (const i of toRemind ?? []) {
      const cp: any = i.contrepartie;
      if (!cp?.email && !cp?.contact_email) continue;
      try {
        await supabase.functions.invoke("send-invoice-email", {
          body: { invoice_id: i.id, mode: "reminder" },
        });
        reminded++;
      } catch (e) { console.error("reminder err", e); }
    }
    result.reminders_sent = reminded;

    // 4) Subscription due-date alerts (J-7) → in-app notification to creator
    const in7days = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
    const { data: upcomingOccs } = await supabase
      .from("crm_subscription_occurrences")
      .select("id, due_date, amount, currency, subscription:crm_subscriptions(name, created_by, contrepartie:crm_contreparties(name))")
      .eq("is_paid", false)
      .gte("due_date", today)
      .lte("due_date", in7days)
      .limit(50);

    let alerted = 0;
    for (const occ of upcomingOccs ?? []) {
      const sub: any = occ.subscription;
      if (!sub?.created_by) continue;
      // Avoid duplicate notifications: check if one already exists for this occurrence today
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", sub.created_by)
        .ilike("link", `%crm%`)
        .gte("created_at", today)
        .limit(1);
      if (existing && existing.length > 0) continue;

      const days = Math.max(0, Math.round((new Date(occ.due_date).getTime() - Date.now()) / 86400_000));
      await supabase.from("notifications").insert({
        user_id: sub.created_by,
        title: `⏰ Échéance abonnement dans ${days}j`,
        content: `${sub.name} (${sub.contrepartie?.name ?? ""}) — ${Number(occ.amount).toLocaleString("fr-FR")} ${occ.currency} due le ${occ.due_date}`,
        type: "info",
        link: "/app/crm",
      });
      alerted++;
    }
    result.subscription_alerts = alerted;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("crm-daily-job error", e);
    const response = authError(e, corsHeaders);
    return response ?? jsonResponse({ error: "Traitement impossible", partial: result }, 500, corsHeaders);
  }
});
