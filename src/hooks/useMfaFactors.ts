import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MfaFactor {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string;
  created_at: string;
}

export function useMfaFactors() {
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data) {
      setFactors([...(data.totp ?? [])] as MfaFactor[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const enroll = useCallback(async (friendlyName: string) => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName,
    });
    if (error) throw error;
    return data;
  }, []);

  const challenge = useCallback(async (factorId: string) => {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) throw error;
    return data;
  }, []);

  const verify = useCallback(async (factorId: string, challengeId: string, code: string) => {
    const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    if (error) throw error;
    await load();
    return data;
  }, [load]);

  const unenroll = useCallback(async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
    await load();
  }, [load]);

  const hasActiveFactor = factors.some((f) => f.status === "verified");

  return { factors, loading, hasActiveFactor, enroll, challenge, verify, unenroll, reload: load };
}
