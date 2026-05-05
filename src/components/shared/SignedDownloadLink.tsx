import { useEffect, useState, type ReactNode } from "react";
import { resolveStorageUrl } from "@/lib/storageSignedUrl";
import { toast } from "@/hooks/use-toast";

/**
 * Lien qui résout à la demande une URL signée pour un bucket privé.
 * Pour buckets publics, ouvre directement l'URL.
 */
export default function SignedDownloadLink({
  bucket,
  pathOrUrl,
  className,
  children,
}: {
  bucket: string;
  pathOrUrl: string | null | undefined;
  className?: string;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!pathOrUrl) return;
    setLoading(true);
    try {
      const url = await resolveStorageUrl(bucket, pathOrUrl);
      if (!url) throw new Error("URL indisponible");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <a href="#" onClick={handleClick} className={className} aria-busy={loading}>
      {children}
    </a>
  );
}

/** Hook utilitaire pour pré-signer une URL (affichage inline image, etc.) */
export function useSignedUrl(bucket: string, pathOrUrl: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    resolveStorageUrl(bucket, pathOrUrl).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [bucket, pathOrUrl]);
  return url;
}
