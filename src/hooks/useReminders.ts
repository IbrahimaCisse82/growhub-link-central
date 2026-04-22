import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type ReminderType = "standard" | "ferme" | "mise_en_demeure";

export function useInvoiceReminders(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["invoice-reminders", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_reminders")
        .select("*")
        .eq("invoice_id", invoiceId!)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      invoice_id: string;
      reminder_type: ReminderType;
      channel: "email" | "manuel";
      subject?: string;
      message?: string;
      recipient_email?: string;
      send_email?: boolean;
    }) => {
      // 1) Si email demandé, on envoie via edge function (qui historise aussi)
      if (payload.send_email && payload.channel === "email") {
        const { data, error } = await supabase.functions.invoke("send-invoice-email", {
          body: {
            invoice_id: payload.invoice_id,
            recipient_email: payload.recipient_email,
            custom_message: payload.message,
            mode: "reminder",
            reminder_type: payload.reminder_type,
          },
        });
        if (error) throw error;
        // Trace locale (en complément de l'éventuelle trace côté edge)
        await supabase.from("invoice_reminders").insert({
          invoice_id: payload.invoice_id,
          reminder_type: payload.reminder_type,
          channel: "email",
          subject: payload.subject,
          message: payload.message,
          recipient_email: payload.recipient_email,
          sent_by: user?.id,
        });
        return data;
      }
      // 2) Sinon trace manuelle uniquement
      const { error } = await supabase.from("invoice_reminders").insert({
        invoice_id: payload.invoice_id,
        reminder_type: payload.reminder_type,
        channel: payload.channel,
        subject: payload.subject,
        message: payload.message,
        recipient_email: payload.recipient_email,
        sent_by: user?.id,
      });
      if (error) throw error;
      return { ok: true };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["invoice-reminders", vars.invoice_id] });
      qc.invalidateQueries({ queryKey: ["crm-invoices"] });
      qc.invalidateQueries({ queryKey: ["crm-invoice"] });
      qc.invalidateQueries({ queryKey: ["crm-overdue"] });
      toast({ title: "Relance enregistrée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

/** Liste des factures en retard avec infos de relance */
export function useOverdueInvoices() {
  return useQuery({
    queryKey: ["crm-overdue"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("crm_invoices")
        .select("*, contrepartie:crm_contreparties(id, name, email, contact_email)")
        .eq("direction", "emise")
        .in("status", ["en_retard", "envoyee", "payee_partiel"])
        .lte("due_date", today)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((i: any) => Number(i.total) - Number(i.amount_paid || 0) > 0);
    },
  });
}
