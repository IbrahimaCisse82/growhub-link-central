import { supabase } from "@/integrations/supabase/client";

/**
 * Buckets sécurisés (privés). Les URLs stockées en DB peuvent être :
 * - un path relatif (ex: "grantId/123.pdf")
 * - une ancienne URL publique du type ".../object/public/<bucket>/<path>"
 * Dans tous les cas, on extrait le path puis on signe à la volée.
 */
const PRIVATE_BUCKETS = new Set(["grant-documents", "entity-documents", "receipts", "hr-expense-receipts"]);

export function isPrivateBucket(bucket: string) {
  return PRIVATE_BUCKETS.has(bucket);
}

export function extractPathFromUrl(bucket: string, urlOrPath: string): string {
  if (!urlOrPath) return urlOrPath;
  const marker = `/${bucket}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx === -1) return urlOrPath; // déjà un path
  return urlOrPath.slice(idx + marker.length);
}

/** Renvoie une URL signée (1h) si bucket privé, sinon l'URL telle quelle. */
export async function resolveStorageUrl(bucket: string, urlOrPath: string | null | undefined): Promise<string | null> {
  if (!urlOrPath) return null;
  if (!isPrivateBucket(bucket)) return urlOrPath;
  const path = extractPathFromUrl(bucket, urlOrPath);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Upload + retourne le path à stocker en DB (pas une URL publique). */
export async function uploadToBucket(bucket: string, path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}
