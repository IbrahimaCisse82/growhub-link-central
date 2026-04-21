import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePayment } from "@/hooks/useCrm";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string;
  remaining: number;
  currency: string;
}

export default function RecordPaymentDialog({ open, onOpenChange, invoiceId, remaining, currency }: Props) {
  const create = useCreatePayment();
  const [form, setForm] = useState({
    amount: remaining,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "virement",
    reference: "",
    notes: "",
  });

  const submit = async () => {
    if (!form.amount) return;
    await create.mutateAsync({ ...form, invoice_id: invoiceId, currency });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
        <div className="space-y-3 py-4">
          <div>
            <Label>Montant ({currency})</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            <div className="text-xs text-muted-foreground mt-1">Reste à payer : {remaining.toLocaleString("fr-FR")} {currency}</div>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
          </div>
          <div>
            <Label>Méthode</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="virement">Virement bancaire</SelectItem>
                <SelectItem value="cheque">Chèque</SelectItem>
                <SelectItem value="especes">Espèces</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="carte">Carte bancaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Référence</Label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="N° transaction..." />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!form.amount || create.isPending}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
