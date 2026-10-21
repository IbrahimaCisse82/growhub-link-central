import { describe, expect, it } from "vitest";
import { isModuleEnabled, isPathEnabled, parseEnabledModules } from "@/lib/featureFlags";

describe("featureFlags", () => {
  it("désactive tous les modules optionnels par défaut", () => {
    const set = parseEnabledModules(undefined);
    expect(isModuleEnabled("lms", set)).toBe(false);
    expect(isPathEnabled("/app/lms", set)).toBe(false);
    expect(isPathEnabled("/app/finance/cap-table", set)).toBe(false);
    expect(isPathEnabled("/app/terrain", set)).toBe(false);
  });

  it("laisse passer les modules du périmètre v1.0", () => {
    const set = parseEnabledModules("");
    for (const path of ["/app/dashboard", "/app/grants/123", "/app/comptabilite/balance", "/app/portefeuilles", "/app/rapports/bailleurs"]) {
      expect(isPathEnabled(path, set)).toBe(true);
    }
  });

  it("ne confond pas un chemin avec un préfixe voisin", () => {
    const set = parseEnabledModules("");
    expect(isPathEnabled("/app/lmsx", set)).toBe(true);
    expect(isPathEnabled("/app/lms/cours/1", set)).toBe(false);
  });

  it("active les modules listés et ignore les clés inconnues", () => {
    const set = parseEnabledModules(" lms , surveys, inconnu ");
    expect(isPathEnabled("/app/lms", set)).toBe(true);
    expect(isPathEnabled("/app/enquetes", set)).toBe(true);
    expect(isPathEnabled("/app/marketplace", set)).toBe(false);
  });

  it("active tout avec la valeur all", () => {
    const set = parseEnabledModules("ALL");
    expect(isPathEnabled("/app/marketplace", set)).toBe(true);
    expect(isModuleEnabled("apiKeys", set)).toBe(true);
  });
});
