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
    const { quote_id, recipient_email, custom_message } = await req.json();
    if (!quote_id) throw new Error("quote_id requis");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: q, error } = await supabase
      .from("crm_quotes")
      .select("*, contrepartie:crm_contreparties(*), lines:crm_quote_lines(*)")
      .eq("id", quote_id)
      .single();
    if (error || !q) throw error || new Error("Devis introuvable");

    const to = recipient_email || q.contrepartie?.email || q.contrepartie?.contact_email;
    if (!to) throw new Error("Aucun email destinataire (renseigner l'email du client)");

    const subject = `Devis ${q.quote_number} — ${fmt(Number(q.total), q.currency)}`;

    const linesHtml = (q.lines || [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((l: any) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${l.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${l.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(Number(l.unit_price), q.currency)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${l.tax_rate ?? 0}%</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(Number(l.line_total), q.currency)}</td>
        </tr>`).join("");

    const customBlock = custom_message ? `<p style="background:#f8fafc;padding:12px;border-left:3px solid #2563eb;border-radius:4px">${custom_message}</p>` : "";

    const html = `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#0d1f2e;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.05)">
    <div style="background:#0d1f2e;color:#fff;padding:20px 24px">
      <div style="font-size:12px;opacity:.8">Grow Hub Management System</div>
      <div style="font-size:20px;font-weight:bold;margin-top:4px">Nouveau devis</div>
    </div>
    <div style="padding:24px">
      <p>Bonjour ${q.contrepartie?.contact_person || q.contrepartie?.name || ""},</p>
      <p>Veuillez trouver ci-dessous notre proposition commerciale <strong>${q.quote_number}</strong>${q.valid_until ? ` (valable jusqu'au ${new Date(q.valid_until).toLocaleDateString("fr-FR")})` : ""}.</p>
      ${customBlock}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <thead><tr style="background:#2563eb;color:#fff">
          <th style="padding:8px 12px;text-align:left">Description</th>
          <th style="padding:8px 12px;text-align:right">Qté</th>
          <th style="padding:8px 12px;text-align:right">PU</th>
          <th style="padding:8px 12px;text-align:right">TVA</th>
          <th style="padding:8px 12px;text-align:right">Total</th>
        </tr></thead>
        <tbody>${linesHtml}</tbody>
      </table>
      <table style="width:100%;font-size:14px">
        <tr><td style="padding:4px 0">Sous-total HT</td><td style="text-align:right">${fmt(Number(q.subtotal), q.currency)}</td></tr>
        <tr><td style="padding:4px 0">TVA</td><td style="text-align:right">${fmt(Number(q.tax_amount), q.currency)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;border-top:2px solid #0d1f2e;font-size:16px">TOTAL TTC</td><td style="text-align:right;font-weight:bold;color:#2563eb;border-top:2px solid #0d1f2e;font-size:16px">${fmt(Number(q.total), q.currency)}</td></tr>
      </table>
      ${q.payment_terms ? `<p style="color:#64748b;font-size:13px"><strong>Conditions :</strong> ${q.payment_terms}</p>` : ""}
      <p style="margin-top:24px">Cordialement,<br/>L'équipe Grow Hub Management System</p>
    </div>
  </div>
</body></html>`;

    const { error: qErr } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to, subject, html,
        from_name: "Grow Hub Management System",
        template_name: "quote_send",
        metadata: { quote_id, quote_number: q.quote_number },
      },
    });
    if (qErr) throw qErr;

    await supabase
      .from("crm_quotes")
      .update({ sent_at: new Date().toISOString(), status: q.status === "brouillon" ? "envoye" : q.status })
      .eq("id", quote_id);

    return new Response(JSON.stringify({ ok: true, recipient: to }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-quote-email error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
