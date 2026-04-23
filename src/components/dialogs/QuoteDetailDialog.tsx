import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FileDown, Mail, Loader2, Send, ArrowRightCircle, CheckCircle2, XCircle } from "lucide-react";
import { useQuote, useUpdateQuoteStatus, useConvertQuoteToInvoice, useSendQuoteEmail, type QuoteStatus } from "@/hooks/useCrm";
import { exportQuoteGrowhub } from "@/lib/pdfBridge";

const fmt = (n: number, cur = "XOF") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);

const statusBadge: Record<QuoteStatus, string> = {
  brouillon: "bg-gray-500/10 text-gray-600",
  envoye: "bg-blue-500/10 text-blue-600",
  accepte: "bg-emerald-500/10 text-emerald-600",
  refuse: "bg-red-500/10 text-red-600",
  expire: "bg-amber-500/10 text-amber-600",
  converti: "bg-purple-500/10 text-purple-600",
};
const statusLabel: Record<QuoteStatus, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
  expire: "Expiré",
  converti: "Converti en facture",
};

interface Props { open: boolean; onOpenChange: (v: boolean) => void; quoteId: string | null; }

export default function QuoteDetailDialog({ open, onOpenChange, quoteId }: Props) {
  const { data: q, isLoading, refetch } = useQuote(quoteId || undefined);
  const updateStatus = useUpdateQuoteStatus();
  const convert = useConvertQuoteToInvoice();
  const sendEmail = useSendQuoteEmail();
  const [showSend, setShowSend] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: "", message: "" });

  if (!quoteId) return null;
  const cp: any = q?.contrepartie;

  const handleSend = async () => {
    if (!q) return;
    await sendEmail.mutateAsync({ quote_id: q.id, recipient_email: emailForm.to || undefined, custom_message: emailForm.message || undefined });
    if (q.status === "brouillon") await updateStatus.mutateAsync({ id: q.id, status: "envoye" });
    setShowSend(false); setEmailForm({ to: "", message: "" });
    refetch();
  };

  const handleConvert = async () => {
    if (!q) return;
    if (!confirm("Convertir ce devis en facture ?")) return;
    await convert.mutateAsync(q.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {q?.quote_number || "Devis"}
            {q && <Badge className={statusBadge[q.status as QuoteStatus]}>{statusLabel[q.status as QuoteStatus]}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !q ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground uppercase">Destinataire</div>
                <div className="font-semibold mt-1">{cp?.name}</div>
                {cp?.email && <div className="text-muted-foreground">{cp.email}</div>}
                {cp?.phone && <div className="text-muted-foreground">{cp.phone}</div>}
              </div>
              <div className="text-right">
                <div><span className="text-muted-foreground">Date :</span> {new Date(q.issue_date).toLocaleDateString("fr-FR")}</div>
                {q.valid_until && <div><span className="text-muted-foreground">Valable jusqu'au :</span> {new Date(q.valid_until).toLocaleDateString("fr-FR")}</div>}
                {q.reference && <div className="text-xs"><span className="text-muted-foreground">Réf :</span> {q.reference}</div>}
                {q.sent_at && <div className="text-xs text-emerald-600 mt-1">✓ Envoyé le {new Date(q.sent_at).toLocaleDateString("fr-FR")}</div>}
                {q.converted_invoice_id && <div className="text-xs text-purple-600">→ Converti en facture</div>}
              </div>
            </div>

            <Separator />

            <div>
              <div className="text-xs text-muted-foreground uppercase mb-2">Lignes</div>
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs">
                  <tr>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2 w-14">Qté</th>
                    <th className="text-right p-2 w-24">PU</th>
                    <th className="text-right p-2 w-16">TVA</th>
                    <th className="text-right p-2 w-28">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {(q.lines as any[])?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((l: any) => (
                    <tr key={l.id} className="border-t">
                      <td className="p-2">{l.description}</td>
                      <td className="p-2 text-right">{l.quantity}</td>
                      <td className="p-2 text-right font-mono">{fmt(Number(l.unit_price), q.currency)}</td>
                      <td className="p-2 text-right text-xs">{l.tax_rate ?? 0}%</td>
                      <td className="p-2 text-right font-mono">{fmt(Number(l.line_total), q.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-secondary/50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Sous-total HT</span><span className="font-mono">{fmt(Number(q.subtotal), q.currency)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>TVA totale</span><span className="font-mono">{fmt(Number(q.tax_amount), q.currency)}</span></div>
              <div className="flex justify-between font-semibold text-base pt-1 border-t"><span>Total TTC</span><span className="font-mono text-primary">{fmt(Number(q.total), q.currency)}</span></div>
            </div>

            {showSend && (
              <div className="border rounded-lg p-4 space-y-3 bg-secondary/30">
                <div className="text-sm font-semibold">Envoyer par email</div>
                <div>
                  <Label className="text-xs">Destinataire</Label>
                  <Input value={emailForm.to} onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })} placeholder={cp?.email || cp?.contact_email || "email@exemple.com"} />
                </div>
                <div>
                  <Label className="text-xs">Message (optionnel)</Label>
                  <Textarea rows={3} value={emailForm.message} onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })} placeholder="Mot d'accompagnement..." />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSend} disabled={sendEmail.isPending}>
                    {sendEmail.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />} Envoyer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSend(false)}>Annuler</Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => exportQuoteGrowhub(q as any)}>
                <FileDown size={14} className="mr-1" /> Télécharger PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowSend(!showSend)}>
                <Mail size={14} className="mr-1" /> Envoyer par email
              </Button>
              {q.status === "envoye" && (
                <>
                  <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => updateStatus.mutate({ id: q.id, status: "accepte" })}>
                    <CheckCircle2 size={14} className="mr-1" /> Marquer accepté
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => updateStatus.mutate({ id: q.id, status: "refuse" })}>
                    <XCircle size={14} className="mr-1" /> Marquer refusé
                  </Button>
                </>
              )}
              {(q.status === "brouillon" || q.status === "accepte" || q.status === "envoye") && !q.converted_invoice_id && (
                <Button size="sm" onClick={handleConvert} disabled={convert.isPending}>
                  {convert.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : <ArrowRightCircle size={14} className="mr-1" />}
                  Convertir en facture
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
