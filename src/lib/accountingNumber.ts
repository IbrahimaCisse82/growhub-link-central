/**
 * Numéro d'écriture affiché : code journal + numéro séquentiel attribué à la validation
 * (continu par journal et par exercice, voir migration 20261022100000).
 * Exemple : journal VT, séquence 12 → « VT-00012 ». Un brouillon n'a pas de numéro.
 */
export function formatEntryNumber(journalCode: string | null | undefined, seq: number | null | undefined): string {
  if (seq === null || seq === undefined || !journalCode) return "—";
  return `${journalCode}-${String(seq).padStart(5, "0")}`;
}
