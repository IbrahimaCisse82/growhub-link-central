import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Niveau d'assurance d'authentification de la session courante.
 * currentLevel === "aal2" signifie que le second facteur TOTP a été validé.
 */
export function useAal() {
  const [current, setCurrent] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const read = async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!active) return;
      setCurrent(data?.currentLevel ?? null);
      setNext(data?.nextLevel ?? null);
      setLoading(false);
    };
    read();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { read(); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  return { current, next, loading, isAal2: current === "aal2" };
}
