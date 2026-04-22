import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateReminder, type ReminderType } from "@/hooks/useReminders";
import { Mail, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    contrepartie?: { name?: string; email?: string | null; contact_email?: string | null } | null;
    total: number;
    amount_paid?: number;
    currency: string;
    due_date?: string | null;
    reminder_count?: number;
  } | null;
}

const TEMPLATES: Record<ReminderType, { subject: string; body: string }> = {
  standard: {
    subject: "Rappel — Facture {{number}}",
    body: `Bonjour,\n\nSauf erreur de notre part, la facture {{number}} d'un montant de {{amount}} reste impayée à ce jour (échéance {{due}}).\n\nNous vous remercions de bien vouloir procéder à son règlement dans les meilleurs délais.\n\nCordialement.`,
  },
  ferme: {
    subject: "Relance ferme — Facture {{number}}",
    body: `Bonjour,\n\nMalgré notre précédent rappel, la facture {{number}} ({{amount}}, échéance {{due}}) demeure impayée.\n\nNous vous demandons d'effectuer son règlement sous 7 jours afin d'éviter toute procédure complémentaire.\n\nCordialement.`,
  },
  mise_en_demeure: {
    subject: "Mise en demeure — Facture {{number}}",
    body: `Bonjour,\n\nLa présente vaut mise en demeure de régler la facture {{number}} d'un montant de {{amount}} (échéance {{due}}), restée sans réponse malgré nos relances précédentes.\n\nÀ défaut de règlement sous 8 jours, nous nous réservons le droit d'engager toute action de recouvrement.\n\nCordialement.`,
  },
};

const fmt = (n: number, cur = "XOF") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);

export default function SendReminderDialog({ open, onOpenChange, invoice }: Props) {
  const [type, setType] = useState<ReminderType>("standard");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const create = useCreateReminder();

  useEffect(() => {
    if (!invoice) return;
    const remaining = Number(invoice.total) - Number(invoice.amount_paid || 0);
    const tpl = TEMPLATES[type];
    setSubject(
      tpl.subject.replace("{{number}}", invoice.invoice_number),
    );
    setMessage(
      tpl.body
        .replaceAll("{{number}}", invoice.invoice_number)
        .replaceAll("{{amount}}", fmt(remaining, invoice.currency))
        .replaceAll("{{due}}", invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("fr-FR") : "—"),
    );
    setRecipient(invoice.contrepartie?.email || invoice.contrepartie?.contact_email || "");
  }, [invoice, type]);

  const handleSubmit = async () => {
    if (!invoice) return;
    await create.mutateAsync({
      invoice_id: invoice.id,
      reminder_type: type,
      channel: sendEmail ? "email" : "manuel",
      subject,
      message,
      recipient_email: recipient || undefined,
      send_email: sendEmail,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail size={18} /> Envoyer une relance — {invoice?.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type de relance</Label>
              <Select value={type} onValueChange={(v) => setType(v as ReminderType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Rappel standard</SelectItem>
                  <SelectItem value="ferme">Relance ferme</SelectItem>
                  <SelectItem value="mise_en_demeure">Mise en demeure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email destinataire</Label>
              <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="client@exemple.com" />
            </div>
          </div>

          <div>
            <Label>Objet</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea rows={9} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>

          <div className="flex items-center gap-3 p-3 rounded bg-secondary/40">
            <Switch checked={sendEmail} onCheckedChange={setSendEmail} id="send-email" />
            <Label htmlFor="send-email" className="cursor-pointer text-sm">
              Envoyer l'email maintenant {!sendEmail && <span className="text-muted-foreground">(juste tracer la relance)</span>}
            </Label>
          </div>

          {invoice && (invoice.reminder_count ?? 0) > 0 && (
            <div className="text-xs text-muted-foreground">
              📌 {invoice.reminder_count} relance{(invoice.reminder_count ?? 0) > 1 ? "s" : ""} déjà envoyée{(invoice.reminder_count ?? 0) > 1 ? "s" : ""} pour cette facture.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            <Send size={14} className="mr-1" /> {sendEmail ? "Envoyer la relance" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
