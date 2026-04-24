import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type POStatus = Database["public"]["Enums"]["purchase_order_status"];

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  project_id: string | null;
  grant_id: string | null;
  invoice_id: string | null;
  issue_date: string;
  expected_delivery_date: string | null;
  delivery_address: string | null;
  delivery_contact: string | null;
  reference: string | null;
  currency: string;
  tax_rate: number | null;
  subtotal: number | null;
  tax_amount: number | null;
  total: number | null;
  status: POStatus;
  payment_terms: string | null;
  notes: string | null;
  sent_at: string | null;
  confirmed_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  supplier?: { name: string; email: string | null; phone: string | null; address: string | null; ninea: string | null } | null;
}

export interface POLine {
  id?: string;
  description: string;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  tax_rate?: number | null;
  line_total?: number;
  sort_order?: number;
}

export const usePurchaseOrders = (status?: POStatus | "all") => {
  return useQuery({
    queryKey: ["purchase_orders", status ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("purchase_orders")
        .select("*, supplier:crm_contreparties!supplier_id(name,email,phone,address,ninea)")
        .order("created_at", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as PurchaseOrder[];
    },
  });
};

export const usePurchaseOrder = (id?: string) => {
  return useQuery({
    queryKey: ["purchase_order", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, supplier:crm_contreparties!supplier_id(name,email,phone,address,ninea)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      const { data: lines, error: lerr } = await supabase
        .from("purchase_order_lines")
        .select("*")
        .eq("purchase_order_id", id!)
        .order("sort_order", { ascending: true });
      if (lerr) throw lerr;
      return { ...(data as any), lines: lines as POLine[] };
    },
  });
};

export const useCreatePurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<PurchaseOrder, "id" | "po_number" | "subtotal" | "tax_amount" | "total" | "created_at" | "updated_at" | "sent_at" | "confirmed_at" | "received_at"> & { lines: POLine[]; po_number?: string }) => {
      const { lines, ...po } = input as any;
      const { data: created, error } = await supabase
        .from("purchase_orders")
        .insert([{ ...po, po_number: po.po_number ?? "" }])
        .select()
        .single();
      if (error) throw error;
      if (lines?.length) {
        const rows = lines.map((l: POLine, i: number) => ({
          purchase_order_id: created.id,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit ?? null,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate ?? 18,
          sort_order: i,
        }));
        const { error: lerr } = await supabase.from("purchase_order_lines").insert(rows);
        if (lerr) throw lerr;
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      toast.success("Bon de commande créé");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
};

export const useUpdatePurchaseOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: POStatus }) => {
      const patch: any = { status };
      if (status === "envoye") patch.sent_at = new Date().toISOString();
      if (status === "confirme") patch.confirmed_at = new Date().toISOString();
      if (status === "recu") patch.received_at = new Date().toISOString();
      const { error } = await supabase.from("purchase_orders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      qc.invalidateQueries({ queryKey: ["purchase_order"] });
      toast.success("Statut mis à jour");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeletePurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      toast.success("Bon de commande supprimé");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useCreateSupplierInvoiceFromPurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (poId: string) => {
      const { data: po, error } = await supabase
        .from("purchase_orders")
        .select("*, lines:purchase_order_lines(*)")
        .eq("id", poId)
        .single();
      if (error) throw error;

      const { data: invoice, error: invoiceError } = await supabase
        .from("crm_invoices")
        .insert({
          direction: "recue",
          contrepartie_id: (po as any).supplier_id,
          issue_date: new Date().toISOString().split("T")[0],
          due_date: (po as any).expected_delivery_date,
          currency: (po as any).currency ?? "XOF",
          tax_rate: (po as any).tax_rate ?? 18,
          subtotal: (po as any).subtotal ?? 0,
          tax_amount: (po as any).tax_amount ?? 0,
          total: (po as any).total ?? 0,
          status: "brouillon",
          reference: (po as any).po_number,
          payment_terms: (po as any).payment_terms,
          notes: `Facture fournisseur générée depuis le bon de commande ${(po as any).po_number}`,
        })
        .select()
        .single();
      if (invoiceError) throw invoiceError;

      const lines = ((po as any).lines ?? []).map((line: any, index: number) => ({
        invoice_id: invoice.id,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        line_total: line.line_total,
        sort_order: index,
      }));
      if (lines.length) {
        const { error: linesError } = await supabase.from("crm_invoice_lines").insert(lines);
        if (linesError) throw linesError;
      }

      const { error: updateError } = await supabase
        .from("purchase_orders")
        .update({ invoice_id: invoice.id, status: "recu", received_at: new Date().toISOString() })
        .eq("id", poId);
      if (updateError) throw updateError;
      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      qc.invalidateQueries({ queryKey: ["crm-invoices"] });
      toast.success("Facture fournisseur créée et BC marqué reçu");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur de création de facture fournisseur"),
  });
};

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  confirme: "Confirmé",
  recu_partiel: "Reçu partiel",
  recu: "Reçu",
  annule: "Annulé",
};
