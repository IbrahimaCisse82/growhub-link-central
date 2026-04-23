import { describe, it, expect } from "vitest";
import {
  fmtCurrency,
  daysBetween,
  agingBucket,
  computeInvoiceRemaining,
  computeQuoteTotal,
  isOverdue,
} from "../crmFormatters";

describe("fmtCurrency", () => {
  it("formate en XOF par défaut", () => {
    expect(fmtCurrency(1500)).toMatch(/1[\s ]?500/);
  });
  it("gère 0 et nul", () => {
    expect(fmtCurrency(0)).toMatch(/0/);
    expect(fmtCurrency(NaN as unknown as number)).toMatch(/0/);
  });
  it("supporte EUR", () => {
    expect(fmtCurrency(1000, "EUR")).toMatch(/€/);
  });
});

describe("daysBetween", () => {
  it("retourne le nombre de jours écoulés", () => {
    const past = new Date("2026-04-01");
    const now = new Date("2026-04-23");
    expect(daysBetween(past, now)).toBe(22);
  });
  it("retourne négatif pour une date future", () => {
    const future = new Date("2026-05-01");
    const now = new Date("2026-04-23");
    expect(daysBetween(future, now)).toBeLessThan(0);
  });
});

describe("agingBucket", () => {
  const today = new Date("2026-04-23");
  it("null si pas de date", () => {
    expect(agingBucket(null, today)).toBeNull();
  });
  it("null si pas encore échue", () => {
    expect(agingBucket("2026-05-01", today)).toBeNull();
  });
  it("0-30 jours de retard", () => {
    expect(agingBucket("2026-04-10", today)).toBe("0-30");
  });
  it("31-60 jours de retard", () => {
    expect(agingBucket("2026-03-10", today)).toBe("31-60");
  });
  it("61-90 jours de retard", () => {
    expect(agingBucket("2026-02-01", today)).toBe("61-90");
  });
  it("90+ jours de retard", () => {
    expect(agingBucket("2025-12-01", today)).toBe("90+");
  });
});

describe("computeInvoiceRemaining", () => {
  it("calcule le reste dû", () => {
    expect(computeInvoiceRemaining(1000, 300)).toBe(700);
  });
  it("ne retourne jamais de négatif", () => {
    expect(computeInvoiceRemaining(1000, 1500)).toBe(0);
  });
  it("gère les valeurs string", () => {
    expect(computeInvoiceRemaining("1000", "200")).toBe(800);
  });
});

describe("computeQuoteTotal", () => {
  it("somme des lignes sans TVA", () => {
    const r = computeQuoteTotal([
      { quantity: 2, unit_price: 100 },
      { quantity: 1, unit_price: 50 },
    ]);
    expect(r.subtotal).toBe(250);
    expect(r.tax).toBe(0);
    expect(r.total).toBe(250);
  });
  it("applique la TVA par ligne", () => {
    const r = computeQuoteTotal([
      { quantity: 1, unit_price: 100, tax_rate: 18 },
      { quantity: 1, unit_price: 200, tax_rate: 0 },
    ]);
    expect(r.subtotal).toBe(300);
    expect(r.tax).toBe(18);
    expect(r.total).toBe(318);
  });
  it("retourne 0 sur tableau vide", () => {
    expect(computeQuoteTotal([])).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });
});

describe("isOverdue", () => {
  const today = new Date("2026-04-23");
  it("non si payée", () => {
    expect(isOverdue("payee", "2026-01-01", today)).toBe(false);
  });
  it("non si annulée ou brouillon", () => {
    expect(isOverdue("annulee", "2026-01-01", today)).toBe(false);
    expect(isOverdue("brouillon", "2026-01-01", today)).toBe(false);
  });
  it("oui si envoyée et échue", () => {
    expect(isOverdue("envoyee", "2026-04-01", today)).toBe(true);
  });
  it("non si échéance future", () => {
    expect(isOverdue("envoyee", "2026-05-01", today)).toBe(false);
  });
  it("non si pas de date d'échéance", () => {
    expect(isOverdue("envoyee", null, today)).toBe(false);
  });
});
