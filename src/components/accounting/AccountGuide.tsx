import { tr } from "@/lib/phrases";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { normalSide, sideLabel } from "@/lib/syscohada";

export type Guide = Database["public"]["Tables"]["accounting_account_guides"]["Row"];

export function useGuides() {
  return useQuery({
    queryKey: ["acc-guides"],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.from("accounting_account_guides").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Guide applicable : correspondance sur la racine la plus longue du code. */
export function findGuide(guides: Guide[], code: string): Guide | undefined {
  let best: Guide | undefined;
  for (const g of guides) if (code.startsWith(g.code) && (!best || g.code.length > best.code.length)) best = g;
  return best;
}

function Block({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <details className="border-t border-border/60 py-1.5" open={title === "Fonctionnement"}>
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</summary>
      <p className="whitespace-pre-line text-[12px] leading-relaxed text-foreground/90 mt-1 max-h-64 overflow-auto">{text}</p>
    </details>
  );
}

export default function AccountGuidePanel({ code, compact }: { code: string; compact?: boolean }) {
  const { data: guides = [] } = useGuides();
  if (!code) return <p className="text-[12px] text-muted-foreground">{tr("Choisissez un compte pour afficher son fonctionnement SYSCOHADA.")}</p>;
  const g = findGuide(guides, code);
  const side = normalSide(code);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[12px]">
        <BookOpen size={13} className="text-primary" />
        <span className="font-semibold">{g ? `Compte ${g.code} — ${g.title}` : `Compte ${code}`}</span>
        <span className="ml-auto text-muted-foreground">Solde normal : {sideLabel[side]}</span>
      </div>
      {!g ? <p className="text-[12px] text-muted-foreground">{tr("Pas de fiche de fonctionnement pour cette racine.")}</p> : (
        <>
          <Block title={tr("Fonctionnement")} text={g.fonctionnement} />
          <Block title={tr("Exclusions")} text={g.exclusions} />
          {!compact && <Block title={tr("Contenu")} text={g.contenu} />}
          <Block title={tr("Éléments de contrôle")} text={g.controle} />
          {!compact && <Block title={tr("Commentaires")} text={g.commentaires} />}
        </>
      )}
    </div>
  );
}
