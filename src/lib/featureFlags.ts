/**
 * Interrupteurs de modules (feature flags).
 *
 * Les modules hors périmètre de la v1.0 sont désactivés par défaut : ils disparaissent
 * du menu et de la recherche, et leurs routes redirigent vers le tableau de bord.
 * Aucun code ni aucune donnée n'est supprimé.
 *
 * Pour réactiver un module, définir VITE_ENABLED_MODULES (liste séparée par des virgules),
 * par exemple `VITE_ENABLED_MODULES=lms,surveys`, ou `VITE_ENABLED_MODULES=all`.
 */

export type ModuleKey =
  | "lms"
  | "marketplace"
  | "matching"
  | "alumni"
  | "capTable"
  | "surveys"
  | "dataCollection"
  | "afridatahub"
  | "webhooks"
  | "apiKeys";

/** Chemins applicatifs couverts par chaque module optionnel. */
export const MODULE_PATHS: Record<ModuleKey, string[]> = {
  lms: ["/app/lms"],
  marketplace: ["/app/marketplace"],
  matching: ["/app/matching"],
  alumni: ["/app/alumni"],
  capTable: ["/app/finance/cap-table"],
  surveys: ["/app/enquetes"],
  dataCollection: ["/app/collecte-donnees", "/app/terrain"],
  afridatahub: ["/app/afridatahub"],
  webhooks: ["/app/webhooks"],
  apiKeys: ["/app/admin/api-keys"],
};

/** Modules livrés activés en v1.0 (aucun module optionnel pour l'instant). */
const DEFAULT_ENABLED: ModuleKey[] = [];

export function parseEnabledModules(raw: string | undefined): Set<ModuleKey> | "all" {
  const value = (raw ?? "").trim();
  if (value.toLowerCase() === "all") return "all";
  const keys = Object.keys(MODULE_PATHS) as ModuleKey[];
  const requested = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is ModuleKey => (keys as string[]).includes(item));
  return new Set<ModuleKey>([...DEFAULT_ENABLED, ...requested]);
}

const enabled = parseEnabledModules(import.meta.env.VITE_ENABLED_MODULES);

export function isModuleEnabled(key: ModuleKey, set: Set<ModuleKey> | "all" = enabled): boolean {
  return set === "all" || set.has(key);
}

/** Vrai si le chemin n'appartient à aucun module désactivé. */
export function isPathEnabled(path: string, set: Set<ModuleKey> | "all" = enabled): boolean {
  if (set === "all") return true;
  return (Object.entries(MODULE_PATHS) as [ModuleKey, string[]][]).every(
    ([key, paths]) => set.has(key) || !paths.some((p) => path === p || path.startsWith(`${p}/`)),
  );
}
