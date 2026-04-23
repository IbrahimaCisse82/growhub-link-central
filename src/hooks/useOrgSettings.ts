import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OrgSettings {
  id: string;
  company_name: string;
  legal_form: string | null;
  logo_url: string | null;
  stamp_url: string | null;
  ninea: string | null;
  rccm: string | null;
  tax_id: string | null;
  address: string | null;
  postal_box: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  default_currency: string | null;
  default_tax_rate: number | null;
  default_payment_terms: string | null;
  default_quote_terms: string | null;
  default_po_terms: string | null;
  legal_mentions: string | null;
  bank_details: string | null;
  signatory_name: string | null;
  signatory_role: string | null;
  signatory_city: string | null;
  pdf_footer: string | null;
  brand_primary_hex: string | null;
  brand_accent_hex: string | null;
}

export const useOrgSettings = () => {
  return useQuery({
    queryKey: ["org_settings"],
    queryFn: async (): Promise<OrgSettings | null> => {
      const { data, error } = await supabase
        .from("org_settings")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as OrgSettings | null;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateOrgSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<OrgSettings> & { id: string }) => {
      const { id, ...rest } = patch;
      const { data, error } = await supabase
        .from("org_settings")
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org_settings"] });
      toast.success("Paramètres enregistrés");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur d'enregistrement"),
  });
};
