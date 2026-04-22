import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FileDown, Mail, CreditCard, Loader2, Send } from "lucide-react";
import { useInvoice } from "@/hooks/useCrm";
import { exportInvoicePdf } from "@/lib/invoicePdfExport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import RecordPaymentDialog from "./RecordPaymentDialog";
import RemindersHistoryPanel from "@/components/crm/RemindersHistoryPanel";
import SendReminderDialog from "./SendReminderDialog";

const fmt = (n: number, cur = "XOF") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);

const statusBadge: Record<string, string> = {
  brouillon: "bg-gray-500/10 text-gray-600",
  envoyee: "bg-blue-500/10 text-blue-600",
  payee_partiel: "bg-amber-500/10 text-amber-600",
  payee: "bg-emerald-500/10 text-emerald-600",
  en_retard: "bg-red-500/10 text-red-600",
  annulee: "bg-gray-500/10 text-gray-500",
};

interface Props { open: boolean; onOpenChange: (v: boolean) => void; invoiceId: string | null; }

export default function InvoiceDetailDialog({ open, onOpenChange, invoiceId }: Props) {
  const { data: inv, isLoading, refetch } = useInvoice(invoiceId || undefined);
  const [showSend, setShowSend] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: "", message: "" });
  const [sending, setSending] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  if (!invoiceId) return null;

  const remaining = inv ? Number(inv.total) - Number(inv.amount_paid || 0) : 0;
  const cp: any = inv?.contrepartie;

  const send = async (mode: "send" | "reminder") => {
    if (!inv) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-invoice-email", {
        body: { invoice_id: inv.id, recipient_email: emailForm.to || undefined, custom_message: emailForm.message || undefined, mode },
      });
      if (error) throw error;
      toast({ title: mode === "reminder" ? "Relance envoyée" : "Facture envoyée par email" });
      setShowSend(false);
      setEmailForm({ to: "", message: "" });
      refetch();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {inv?.invoice_number || "Facture"}
              {inv && <Badge className={statusBadge[inv.status]}>{inv.status}</Badge>}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !inv ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">{inv.direction === "emise" ? "Facturé à" : "Fournisseur"}</div>
                  <div className="font-semibold mt-1">{cp?.name}</div>
                  {cp?.email && <div className="text-muted-foreground">{cp.email}</div>}
                  {cp?.phone && <div className="text-muted-foreground">{cp.phone}</div>}
                  {cp?.ninea && <div className="text-xs font-mono">NINEA: {cp.ninea}</div>}
                </div>
                <div className="text-right">
                  <div><span className="text-muted-foreground">Date :</span> {new Date(inv.issue_date).toLocaleDateString("fr-FR")}</div>
                  {inv.due_date && <div><span className="text-muted-foreground">Échéance :</span> {new Date(inv.due_date).toLocaleDateString("fr-FR")}</div>}
                  {inv.reference && <div className="text-xs"><span className="text-muted-foreground">Réf :</span> {inv.reference}</div>}
                  {inv.sent_to_email && <div className="text-xs text-emerald-600 mt-1">✓ Envoyée à {inv.sent_to_email}</div>}
                  {inv.last_reminder_sent_at && <div className="text-xs text-amber-600">⚠ Dernière relance: {new Date(inv.last_reminder_sent_at).toLocaleDateString("fr-FR")}</div>}
                </div>
              </div>

              <Separator />

              {/* Lines */}
              <div>
                <div className="text-xs text-muted-foreground uppercase mb-2">Lignes</div>
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs">
                    <tr>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2 w-16">Qté</th>
                      <th className="text-right p-2 w-28">PU</th>
                      <th className="text-right p-2 w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inv.lines as any[])?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((l: any) => (
                      <tr key={l.id} className="border-t">
                        <td className="p-2">{l.description}</td>
                        <td className="p-2 text-right">{l.quantity}</td>
                        <td className="p-2 text-right font-mono">{fmt(Number(l.unit_price), inv.currency)}</td>
                        <td className="p-2 text-right font-mono">{fmt(Number(l.line_total), inv.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="bg-secondary/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Sous-total</span><span className="font-mono">{fmt(Number(inv.subtotal), inv.currency)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>TVA ({inv.tax_rate}%)</span><span className="font-mono">{fmt(Number(inv.tax_amount), inv.currency)}</span></div>
                <div className="flex justify-between font-semibold text-base pt-1 border-t"><span>Total</span><span className="font-mono text-primary">{fmt(Number(inv.total), inv.currency)}</span></div>
                {Number(inv.amount_paid) > 0 && (
                  <>
                    <div className="flex justify-between text-emerald-600"><span>Déjà payé</span><span className="font-mono">- {fmt(Number(inv.amount_paid), inv.currency)}</span></div>
                    <div className="flex justify-between font-bold pt-1 border-t"><span>Reste dû</span><span className="font-mono">{fmt(remaining, inv.currency)}</span></div>
                  </>
                )}
              </div>

              {/* Payments */}
              {(inv.payments as any[])?.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-2">Paiements</div>
                  <div className="space-y-1">
                    {(inv.payments as any[]).map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                        <div>
                          <span className="font-medium">{fmt(Number(p.amount), p.currency)}</span>
                          <span className="text-muted-foreground ml-2">{new Date(p.payment_date).toLocaleDateString("fr-FR")}</span>
                          {p.payment_method && <span className="text-xs text-muted-foreground ml-2">· {p.payment_method}</span>}
                        </div>
                        {p.reference && <span className="text-xs font-mono text-muted-foreground">{p.reference}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Send email panel */}
              {showSend && (
                <div className="border rounded-lg p-4 space-y-3 bg-secondary/30">
                  <div className="text-sm font-semibold">Envoyer par email</div>
                  <div>
                    <Label className="text-xs">Destinataire</Label>
                    <Input value={emailForm.to} onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })} placeholder={cp?.email || cp?.contact_email || "email@exemple.com"} />
                  </div>
                  <div>
                    <Label className="text-xs">Message personnalisé (optionnel)</Label>
                    <Textarea rows={3} value={emailForm.message} onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })} placeholder="Mot d'accompagnement..." />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => send("send")} disabled={sending}>
                      {sending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
                      Envoyer la facture
                    </Button>
                    {inv.status === "en_retard" && (
                      <Button size="sm" variant="outline" onClick={() => send("reminder")} disabled={sending}>Envoyer en relance</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setShowSend(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {/* Historique de relances */}
              {inv.direction === "emise" && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-2 flex items-center justify-between">
                    <span>Historique des relances</span>
                    {remaining > 0 && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setReminderOpen(true)}>
                        <Mail size={12} className="mr-1" /> Nouvelle relance
                      </Button>
                    )}
                  </div>
                  <RemindersHistoryPanel invoiceId={inv.id} />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => exportInvoicePdf(inv as any)}>
                  <FileDown size={14} className="mr-1" /> Télécharger PDF
                </Button>
                {inv.direction === "emise" && (
                  <Button size="sm" variant="outline" onClick={() => setShowSend(!showSend)}>
                    <Mail size={14} className="mr-1" /> {inv.status === "en_retard" ? "Relancer" : "Envoyer par email"}
                  </Button>
                )}
                {remaining > 0 && inv.status !== "annulee" && (
                  <Button size="sm" onClick={() => setPaymentOpen(true)}>
                    <CreditCard size={14} className="mr-1" /> Enregistrer paiement
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {inv && (
        <>
          <RecordPaymentDialog
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            invoiceId={inv.id}
            remaining={remaining}
            currency={inv.currency}
          />
          <SendReminderDialog
            open={reminderOpen}
            onOpenChange={setReminderOpen}
            invoice={{
              id: inv.id,
              invoice_number: inv.invoice_number,
              contrepartie: cp,
              total: Number(inv.total),
              amount_paid: Number(inv.amount_paid || 0),
              currency: inv.currency,
              due_date: inv.due_date,
              reminder_count: (inv as any).reminder_count,
            }}
          />
        </>
      )}
    </>
  );
}
