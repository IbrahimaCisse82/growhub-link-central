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

// ============ QUOTES (DEVIS) ============
export function useQuotes(filters?: { status?: QuoteStatus | "all"; contrepartieId?: string }) {
  return useQuery({
    queryKey: ["crm-quotes", filters],
    queryFn: async () => {
      let q = supabase
        .from("crm_quotes")
        .select("*, contrepartie:crm_contreparties(id, name, party_type, email, contact_email)")
        .order("issue_date", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.contrepartieId) q = q.eq("contrepartie_id", filters.contrepartieId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ["crm-quote", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_quotes")
        .select("*, contrepartie:crm_contreparties(*), lines:crm_quote_lines(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ lines, ...quote }: any) => {
      const { data: q, error } = await supabase
        .from("crm_quotes")
        .insert({ ...quote, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      if (lines?.length) {
        const { error: linesErr } = await supabase
          .from("crm_quote_lines")
          .insert(lines.map((l: any, i: number) => ({ ...l, quote_id: q.id, sort_order: i })));
        if (linesErr) throw linesErr;
      }
      return q;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-quotes"] });
      toast({ title: "Devis créé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateQuoteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuoteStatus }) => {
      const update: any = { status };
      if (status === "envoye") update.sent_at = new Date().toISOString();
      if (status === "accepte") update.accepted_at = new Date().toISOString();
      const { error } = await supabase.from("crm_quotes").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-quotes"] });
      qc.invalidateQueries({ queryKey: ["crm-quote"] });
      toast({ title: "Statut mis à jour" });
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-quotes"] });
      toast({ title: "Devis supprimé" });
    },
  });
}

/** Convertit un devis en facture en préservant lignes + TVA par ligne */
export function useConvertQuoteToInvoice() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      // 1) Charger devis + lignes
      const { data: q, error: qErr } = await supabase
        .from("crm_quotes")
        .select("*, lines:crm_quote_lines(*)")
        .eq("id", quoteId)
        .single();
      if (qErr || !q) throw qErr || new Error("Devis introuvable");
      if (q.status === "converti") throw new Error("Ce devis a déjà été converti");

      // 2) Créer facture émise
      const { data: inv, error: invErr } = await supabase
        .from("crm_invoices")
        .insert({
          invoice_number: "",
          direction: "emise",
          contrepartie_id: q.contrepartie_id,
          issue_date: new Date().toISOString().split("T")[0],
          currency: q.currency,
          tax_rate: q.tax_rate ?? 0,
          reference: q.quote_number,
          payment_terms: q.payment_terms,
          notes: q.notes,
          project_id: q.project_id,
          grant_id: q.grant_id,
          status: "brouillon",
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (invErr || !inv) throw invErr || new Error("Création facture échouée");

      // 3) Recopier les lignes (préservant TVA par ligne)
      const lines = (q.lines || []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      if (lines.length) {
        const { error: linesErr } = await supabase.from("crm_invoice_lines").insert(
          lines.map((l: any, i: number) => ({
            invoice_id: inv.id,
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price,
            tax_rate: l.tax_rate ?? 0,
            sort_order: i,
          })),
        );
        if (linesErr) throw linesErr;
      }

      // 4) Marquer devis comme converti
      await supabase
        .from("crm_quotes")
        .update({ status: "converti", converted_at: new Date().toISOString(), converted_invoice_id: inv.id })
        .eq("id", quoteId);

      return { invoice: inv, quote: q, linesCount: lines.length };
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["crm-quotes"] });
      qc.invalidateQueries({ queryKey: ["crm-invoices"] });
      qc.invalidateQueries({ queryKey: ["crm-stats"] });
      toast({
        title: "Devis converti en facture",
        description: `${res.quote.quote_number} → ${res.invoice.invoice_number} · ${res.linesCount} ligne${res.linesCount > 1 ? "s" : ""} reportée${res.linesCount > 1 ? "s" : ""}`,
      });
    },
    onError: (e: any) => toast({ title: "Conversion impossible", description: e.message, variant: "destructive" }),
  });
}

export function useSendQuoteEmail() {
  return useMutation({
    mutationFn: async ({ quote_id, recipient_email, custom_message }: { quote_id: string; recipient_email?: string; custom_message?: string }) => {
      const { data, error } = await supabase.functions.invoke("send-quote-email", {
        body: { quote_id, recipient_email, custom_message },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast({ title: "Devis envoyé par email" }),
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

// ============ CREDIT NOTES (AVOIRS) ============
export function useCreateCreditNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ source_invoice_id, lines: customLines, reason }: { source_invoice_id: string; lines?: any[]; reason?: string }) => {
      const { data: src, error: srcErr } = await supabase
        .from("crm_invoices")
        .select("*, lines:crm_invoice_lines(*)")
        .eq("id", source_invoice_id)
        .single();
      if (srcErr || !src) throw srcErr || new Error("Facture source introuvable");

      const lines = (customLines && customLines.length ? customLines : (src.lines || [])).map((l: any, i: number) => ({
        description: l.description,
        quantity: -Math.abs(Number(l.quantity)),
        unit_price: l.unit_price,
        tax_rate: l.tax_rate ?? src.tax_rate ?? 0,
        sort_order: i,
      }));

      const { data: cn, error: cnErr } = await supabase
        .from("crm_invoices")
        .insert({
          invoice_number: "",
          direction: "emise",
          contrepartie_id: src.contrepartie_id,
          issue_date: new Date().toISOString().split("T")[0],
          currency: src.currency,
          tax_rate: src.tax_rate ?? 0,
          reference: `Avoir sur ${src.invoice_number}`,
          notes: reason || `Avoir lié à la facture ${src.invoice_number}`,
          project_id: src.project_id,
          grant_id: src.grant_id,
          is_credit_note: true,
          credit_note_for: source_invoice_id,
          status: "brouillon",
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (cnErr || !cn) throw cnErr || new Error("Création avoir échouée");

      if (lines.length) {
        const { error: linesErr } = await supabase
          .from("crm_invoice_lines")
          .insert(lines.map((l: any) => ({ ...l, invoice_id: cn.id })));
        if (linesErr) throw linesErr;
      }
      return cn;
    },
    onSuccess: (cn: any) => {
      qc.invalidateQueries({ queryKey: ["crm-invoices"] });
      qc.invalidateQueries({ queryKey: ["crm-stats"] });
      toast({ title: "Avoir créé", description: cn.invoice_number });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

// ============ STARTUP RELATED CRM (factures + devis liés via contreparties) ============
export function useStartupCrmSummary(startupId: string | undefined) {
  return useQuery({
    queryKey: ["startup-crm-summary", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data: parties } = await supabase
        .from("crm_contreparties")
        .select("id")
        .eq("startup_id", startupId!);
      const ids = (parties ?? []).map((p) => p.id);
      if (!ids.length) return { invoices: [], quotes: [], partyIds: [] };
      const [invRes, qRes] = await Promise.all([
        supabase
          .from("crm_invoices")
          .select("id, invoice_number, issue_date, due_date, status, total, amount_paid, currency, direction, is_credit_note")
          .in("contrepartie_id", ids)
          .order("issue_date", { ascending: false }),
        supabase
          .from("crm_quotes")
          .select("id, quote_number, issue_date, valid_until, status, total, currency, converted_invoice_id")
          .in("contrepartie_id", ids)
          .order("issue_date", { ascending: false }),
      ]);
      return { invoices: invRes.data ?? [], quotes: qRes.data ?? [], partyIds: ids };
    },
  });
}
