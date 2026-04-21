import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const fmt = (n: number, cur: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { invoice_id, recipient_email, custom_message, mode } = await req.json();
    // mode: "send" (first send) | "reminder"
    if (!invoice_id) throw new Error("invoice_id requis");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: inv, error } = await supabase
      .from("crm_invoices")
      .select("*, contrepartie:crm_contreparties(*), lines:crm_invoice_lines(*)")
      .eq("id", invoice_id)
      .single();
    if (error || !inv) throw error || new Error("Facture introuvable");

    const to = recipient_email || inv.contrepartie?.email || inv.contrepartie?.contact_email;
    if (!to) throw new Error("Aucun email destinataire (renseigner l'email de la contrepartie)");

    const remaining = Number(inv.total) - Number(inv.amount_paid || 0);
    const subject = mode === "reminder"
      ? `Relance — Facture ${inv.invoice_number} (${fmt(remaining, inv.currency)} dûs)`
      : `Facture ${inv.invoice_number} — ${fmt(Number(inv.total), inv.currency)}`;

    const linesHtml = (inv.lines || [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((l: any) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${l.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${l.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(Number(l.unit_price), inv.currency)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(Number(l.line_total), inv.currency)}</td>
        </tr>`).join("");

    const intro = mode === "reminder"
      ? `<p>Nous nous permettons de vous relancer concernant la facture <strong>${inv.invoice_number}</strong> qui demeure impayée${inv.due_date ? ` (échéance du ${new Date(inv.due_date).toLocaleDateString("fr-FR")})` : ""}.</p>`
      : `<p>Veuillez trouver ci-dessous le détail de la facture <strong>${inv.invoice_number}</strong>.</p>`;

    const customBlock = custom_message ? `<p style="background:#f8fafc;padding:12px;border-left:3px solid #00a283;border-radius:4px">${custom_message}</p>` : "";

    const html = `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#0d1f2e;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.05)">
    <div style="background:#0d1f2e;color:#fff;padding:20px 24px">
      <div style="font-size:12px;opacity:.8">Grow Hub Management System</div>
      <div style="font-size:20px;font-weight:bold;margin-top:4px">${mode === "reminder" ? "Relance de paiement" : "Nouvelle facture"}</div>
    </div>
    <div style="padding:24px">
      <p>Bonjour ${inv.contrepartie?.contact_person || inv.contrepartie?.name || ""},</p>
      ${intro}
      ${customBlock}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <thead><tr style="background:#00a283;color:#fff">
          <th style="padding:8px 12px;text-align:left">Description</th>
          <th style="padding:8px 12px;text-align:right">Qté</th>
          <th style="padding:8px 12px;text-align:right">PU</th>
          <th style="padding:8px 12px;text-align:right">Total</th>
        </tr></thead>
        <tbody>${linesHtml}</tbody>
      </table>
      <table style="width:100%;font-size:14px">
        <tr><td style="padding:4px 0">Sous-total</td><td style="text-align:right">${fmt(Number(inv.subtotal), inv.currency)}</td></tr>
        <tr><td style="padding:4px 0">TVA (${inv.tax_rate}%)</td><td style="text-align:right">${fmt(Number(inv.tax_amount), inv.currency)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;border-top:2px solid #0d1f2e;font-size:16px">TOTAL</td><td style="text-align:right;font-weight:bold;color:#00a283;border-top:2px solid #0d1f2e;font-size:16px">${fmt(Number(inv.total), inv.currency)}</td></tr>
        ${Number(inv.amount_paid) > 0 ? `<tr><td style="padding:4px 0;color:#64748b">Déjà payé</td><td style="text-align:right;color:#64748b">${fmt(Number(inv.amount_paid), inv.currency)}</td></tr><tr><td style="padding:4px 0;font-weight:bold">Reste à payer</td><td style="text-align:right;font-weight:bold">${fmt(remaining, inv.currency)}</td></tr>` : ""}
      </table>
      ${inv.due_date ? `<p style="margin-top:16px"><strong>Échéance :</strong> ${new Date(inv.due_date).toLocaleDateString("fr-FR")}</p>` : ""}
      ${inv.payment_terms ? `<p style="color:#64748b;font-size:13px"><strong>Conditions :</strong> ${inv.payment_terms}</p>` : ""}
      <p style="margin-top:24px">Cordialement,<br/>L'équipe Grow Hub Management System</p>
    </div>
  </div>
</body></html>`;

    // Enqueue via pgmq (uses existing process-email-queue infra)
    const { error: qErr } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to,
        subject,
        html,
        from_name: "Grow Hub Management System",
        template_name: mode === "reminder" ? "invoice_reminder" : "invoice_send",
        metadata: { invoice_id, invoice_number: inv.invoice_number },
      },
    });
    if (qErr) throw qErr;

    // Update invoice tracking
    const update: any = { sent_to_email: to };
    if (mode === "reminder") {
      update.last_reminder_sent_at = new Date().toISOString();
    } else {
      update.sent_at = new Date().toISOString();
      if (inv.status === "brouillon") update.status = "envoyee";
    }
    await supabase.from("crm_invoices").update(update).eq("id", invoice_id);

    return new Response(JSON.stringify({ ok: true, recipient: to }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-invoice-email error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
