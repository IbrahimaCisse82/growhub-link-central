import { describe, expect, it } from "vitest";
import { formatEntryNumber } from "@/lib/accountingNumber";

describe("formatEntryNumber", () => {
  it("compose code journal et séquence sur 5 chiffres", () => {
    expect(formatEntryNumber("VT", 12)).toBe("VT-00012");
    expect(formatEntryNumber("BQ", 123456)).toBe("BQ-123456");
  });

  it("affiche un tiret pour un brouillon ou un journal inconnu", () => {
    expect(formatEntryNumber("VT", null)).toBe("—");
    expect(formatEntryNumber(undefined, 3)).toBe("—");
  });
});
