/**
 * Formatters et utilitaires CRM purs (testables sans DB).
 */

export type AgingBucket = "0-30" | "31-60" | "61-90" | "90+";

export const fmtCurrency = (n: number, cur = "XOF"): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 0,
  }).format(n || 0);

export const daysBetween = (from: Date | string, to: Date | string = new Date()): number => {
  const f = typeof from === "string" ? new Date(from) : from;
  const t = typeof to === "string" ? new Date(to) : to;
  return Math.floor((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24));
};

export const agingBucket = (dueDate: string | null | undefined, today: Date = new Date()): AgingBucket | null => {
  if (!dueDate) return null;
  const d = daysBetween(dueDate, today);
  if (d < 0) return null; // pas encore échue
  if (d <= 30) return "0-30";
  if (d <= 60) return "31-60";
  if (d <= 90) return "61-90";
  return "90+";
};

export const computeInvoiceRemaining = (total: number | string, paid: number | string): number => {
  return Math.max(0, Number(total || 0) - Number(paid || 0));
};

export const computeQuoteTotal = (
  lines: Array<{ quantity: number | string; unit_price: number | string; tax_rate?: number | string | null }>,
): { subtotal: number; tax: number; total: number } => {
  let subtotal = 0;
  let tax = 0;
  for (const l of lines) {
    const lineTotal = Number(l.quantity || 0) * Number(l.unit_price || 0);
    subtotal += lineTotal;
    tax += (lineTotal * Number(l.tax_rate || 0)) / 100;
  }
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((subtotal + tax) * 100) / 100,
  };
};

export const isOverdue = (status: string, dueDate: string | null | undefined, today: Date = new Date()): boolean => {
  if (!dueDate) return false;
  if (["payee", "annulee", "brouillon"].includes(status)) return false;
  return new Date(dueDate) < today;
};
