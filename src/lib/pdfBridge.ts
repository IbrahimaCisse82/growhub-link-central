// Bridges existing exportInvoicePdf / exportQuotePdf calls to the new GROWHUB PDF engine.
// Loads org_settings (singleton) and maps invoice/quote/PO data to the unified format.
import { supabase } from "@/integrations/supabase/client";
import { exportGrowhubPdf, type GrowhubPdfDoc, type DocKind } from "@/lib/growhubPdf";
import type { OrgSettings } from "@/hooks/useOrgSettings";

let _orgCache: OrgSettings | null | undefined;
async function getOrg(): Promise<OrgSettings | null> {
  if (_orgCache !== undefined) return _orgCache;
  const { data } = await supabase.from("org_settings" as any).select("*").eq("is_active", true).maybeSingle();
  _orgCache = (data as any) ?? null;
  return _orgCache;
}

function buildParty(c: any) {
  return {
    name: c?.name ?? "",
    contact_person: c?.contact_person,
    address: c?.address,
    city: c?.city,
    email: c?.email ?? c?.contact_email,
    phone: c?.phone ?? c?.contact_phone,
    ninea: c?.ninea,
  };
}

function mapLines(lines: any[] | undefined) {
  return (lines ?? []).map((l) => ({
    description: l.description,
    quantity: Number(l.quantity ?? 0),
    unit_price: Number(l.unit_price ?? 0),
    tax_rate: Number(l.tax_rate ?? 0),
    line_total: Number(l.line_total ?? Number(l.quantity ?? 0) * Number(l.unit_price ?? 0)),
  }));
}

export async function exportInvoiceGrowhub(inv: any) {
  const org = await getOrg();
  const kind: DocKind = inv.is_credit_note ? "AVOIR" : "FACTURE";
  const doc: GrowhubPdfDoc = {
    kind,
    number: inv.invoice_number,
    issue_date: inv.issue_date,
    due_date: inv.due_date,
    reference: inv.reference,
    currency: inv.currency || "XOF",
    party: buildParty(inv.contrepartie),
    lines: mapLines(inv.lines),
    subtotal: Number(inv.subtotal ?? 0),
    tax_amount: Number(inv.tax_amount ?? 0),
    total: Number(inv.total ?? 0),
    notes: inv.notes,
    payment_terms: inv.payment_terms || org?.default_payment_terms,
  };
  await exportGrowhubPdf(doc, org);
}

export async function exportQuoteGrowhub(q: any) {
  const org = await getOrg();
  const doc: GrowhubPdfDoc = {
    kind: "DEVIS",
    number: q.quote_number,
    issue_date: q.issue_date,
    due_date: q.valid_until,
    reference: q.reference,
    currency: q.currency || "XOF",
    party: buildParty(q.contrepartie),
    lines: mapLines(q.lines),
    subtotal: Number(q.subtotal ?? 0),
    tax_amount: Number(q.tax_amount ?? 0),
    total: Number(q.total ?? 0),
    notes: q.notes,
    payment_terms: q.payment_terms || org?.default_quote_terms,
  };
  await exportGrowhubPdf(doc, org);
}

export async function exportPurchaseOrderGrowhub(po: any) {
  const org = await getOrg();
  const doc: GrowhubPdfDoc = {
    kind: "BON DE COMMANDE",
    number: po.po_number,
    issue_date: po.issue_date,
    due_date: po.expected_delivery_date,
    reference: po.reference,
    currency: po.currency || "XOF",
    party: buildParty(po.contrepartie),
    lines: mapLines(po.lines),
    subtotal: Number(po.subtotal ?? 0),
    tax_amount: Number(po.tax_amount ?? 0),
    total: Number(po.total ?? 0),
    notes: po.notes,
    payment_terms: po.payment_terms || org?.default_po_terms,
  };
  await exportGrowhubPdf(doc, org);
}
