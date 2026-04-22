import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type PartyType = "client" | "bailleur" | "fournisseur" | "partenaire";
export type InvoiceDirection = "emise" | "recue";
export type InvoiceStatus = "brouillon" | "envoyee" | "payee_partiel" | "payee" | "en_retard" | "annulee";
export type SubscriptionFrequency = "mensuel" | "trimestriel" | "semestriel" | "annuel";
export type SubscriptionStatus = "actif" | "suspendu" | "termine";
export type QuoteStatus = "brouillon" | "envoye" | "accepte" | "refuse" | "expire" | "converti";

// ============ CONTREPARTIES ============
export function useContreparties(typeFilter?: PartyType | "all") {
  return useQuery({
    queryKey: ["crm-contreparties", typeFilter],
    queryFn: async () => {
      let q = supabase.from("crm_contreparties").select("*").order("name");
      if (typeFilter && typeFilter !== "all") q = q.eq("party_type", typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateContrepartie() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("crm_contreparties")
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contreparties"] });
      toast({ title: "Contrepartie créée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateContrepartie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { data, error } = await supabase.from("crm_contreparties").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contreparties"] });
      toast({ title: "Contrepartie mise à jour" });
    },
  });
}

export function useDeleteContrepartie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_contreparties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contreparties"] });
      toast({ title: "Contrepartie supprimée" });
    },
  });
}

// ============ INVOICES ============
export function useInvoices(filters?: { direction?: InvoiceDirection | "all"; status?: InvoiceStatus | "all" }) {
  return useQuery({
    queryKey: ["crm-invoices", filters],
    queryFn: async () => {
      let q = supabase
        .from("crm_invoices")
        .select("*, contrepartie:crm_contreparties(id, name, party_type)")
        .order("issue_date", { ascending: false });
      if (filters?.direction && filters.direction !== "all") q = q.eq("direction", filters.direction);
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["crm-invoice", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_invoices")
        .select("*, contrepartie:crm_contreparties(*), lines:crm_invoice_lines(*), payments:crm_payments(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ lines, ...invoice }: any) => {
      const { data: inv, error } = await supabase
        .from("crm_invoices")
        .insert({ ...invoice, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      if (lines?.length) {
        const { error: linesErr } = await supabase
          .from("crm_invoice_lines")
          .insert(lines.map((l: any, i: number) => ({ ...l, invoice_id: inv.id, sort_order: i })));
        if (linesErr) throw linesErr;
      }
      return inv;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-invoices"] });
      toast({ title: "Facture créée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      const { error } = await supabase.from("crm_invoices").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-invoices"] });
      qc.invalidateQueries({ queryKey: ["crm-invoice"] });
      toast({ title: "Statut mis à jour" });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-invoices"] });
      toast({ title: "Facture supprimée" });
    },
  });
}

// ============ PAYMENTS ============
export function useCreatePayment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("crm_payments")
        .insert({ ...payload, recorded_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-invoices"] });
      qc.invalidateQueries({ queryKey: ["crm-invoice"] });
      toast({ title: "Paiement enregistré" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

// ============ SUBSCRIPTIONS ============
export function useSubscriptions(statusFilter?: SubscriptionStatus | "all") {
  return useQuery({
    queryKey: ["crm-subscriptions", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("crm_subscriptions")
        .select("*, contrepartie:crm_contreparties(id, name, party_type)")
        .order("next_due_date");
      if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useSubscriptionOccurrences(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: ["crm-sub-occurrences", subscriptionId],
    enabled: !!subscriptionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_subscription_occurrences")
        .select("*")
        .eq("subscription_id", subscriptionId!)
        .order("due_date");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("crm_subscriptions")
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-subscriptions"] });
      toast({ title: "Abonnement créé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { data, error } = await supabase.from("crm_subscriptions").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-subscriptions"] });
      toast({ title: "Abonnement mis à jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-subscriptions"] });
      toast({ title: "Abonnement supprimé" });
    },
  });
}

export function useSendInvoiceEmail() {
  return useMutation({
    mutationFn: async ({ invoice_id, recipient_email, custom_message, mode }: { invoice_id: string; recipient_email?: string; custom_message?: string; mode: "send" | "reminder" }) => {
      const { data, error } = await supabase.functions.invoke("send-invoice-email", {
        body: { invoice_id, recipient_email, custom_message, mode },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkOccurrencePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase
        .from("crm_subscription_occurrences")
        .update({ is_paid: paid, paid_at: paid ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-sub-occurrences"] });
      toast({ title: "Échéance mise à jour" });
    },
  });
}

// ============ STATS ============
export function useCrmStats() {
  return useQuery({
    queryKey: ["crm-stats"],
    queryFn: async () => {
      const [parties, invoices, subs] = await Promise.all([
        supabase.from("crm_contreparties").select("party_type, is_active"),
        supabase.from("crm_invoices").select("direction, status, total, amount_paid, currency"),
        supabase.from("crm_subscriptions").select("status, amount, currency"),
      ]);
      const inv = invoices.data ?? [];
      const sumOutstanding = inv
        .filter((i) => i.direction === "emise" && ["envoyee", "payee_partiel", "en_retard"].includes(i.status))
        .reduce((s, i) => s + (Number(i.total) - Number(i.amount_paid || 0)), 0);
      const sumOverdue = inv
        .filter((i) => i.status === "en_retard")
        .reduce((s, i) => s + (Number(i.total) - Number(i.amount_paid || 0)), 0);
      const sumPayables = inv
        .filter((i) => i.direction === "recue" && i.status !== "payee" && i.status !== "annulee")
        .reduce((s, i) => s + (Number(i.total) - Number(i.amount_paid || 0)), 0);
      return {
        partiesCount: parties.data?.length ?? 0,
        invoicesCount: inv.length,
        outstanding: sumOutstanding,
        overdue: sumOverdue,
        payables: sumPayables,
        activeSubs: subs.data?.filter((s) => s.status === "actif").length ?? 0,
      };
    },
  });
}
