import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CookieConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  given_at?: string;
}

const STORAGE_KEY = "gh_cookie_consent_v1";

interface Ctx {
  consent: CookieConsentState | null;
  loading: boolean;
  save: (c: Omit<CookieConsentState, "given_at">) => Promise<void>;
  revoke: () => Promise<void>;
}

const CookieConsentContext = createContext<Ctx>({
  consent: null,
  loading: true,
  save: async () => {},
  revoke: async () => {},
});

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentState | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConsent(JSON.parse(raw));
    } catch {
      // Stockage indisponible ou valeur corrompue : on repart sans consentement enregistré.
    }
    setLoading(false);
  }, []);

  const save = useCallback(async (c: Omit<CookieConsentState, "given_at">) => {
    const next: CookieConsentState = { ...c, given_at: new Date().toISOString() };
    setConsent(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    await supabase.from("cookie_consents").insert({
      user_id: user?.id ?? null,
      necessary: c.necessary,
      analytics: c.analytics,
      marketing: c.marketing,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
    });
  }, [user]);

  const revoke = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setConsent(null);
  }, []);

  return (
    <CookieConsentContext.Provider value={{ consent, loading, save, revoke }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export const useCookieConsent = () => useContext(CookieConsentContext);
