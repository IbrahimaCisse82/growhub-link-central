import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { useCreateInvoice, useContreparties, type InvoiceDirection } from "@/hooks/useCrm";

interface Line {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDirection?: InvoiceDirection;
}

export default function CreateInvoiceDialog({ open, onOpenChange, defaultDirection = "emise" }: Props) {
  const create = useCreateInvoice();
  const { data: parties } = useContreparties("all");
  const [form, setForm] = useState({
    direction: defaultDirection,
    contrepartie_id: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    currency: "XOF",
    tax_rate: 18,
    reference: "",
    payment_terms: "Paiement à 30 jours",
    notes: "",
  });
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: 1, unit_price: 0, tax_rate: 18 }]);

  const addLine = () => setLines([...lines, { description: "", quantity: 1, unit_price: 0, tax_rate: form.tax_rate }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, key: keyof Line, val: any) => {
    const next = [...lines];
    (next[i] as any)[key] = val;
    setLines(next);
  };

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const tax = (subtotal * form.tax_rate) / 100;
  const total = subtotal + tax;

  const submit = async () => {
    if (!form.contrepartie_id || lines.length === 0) return;
    await create.mutateAsync({
      ...form,
      due_date: form.due_date || null,
      lines: lines.filter((l) => l.description),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v as InvoiceDirection })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emise">Facture émise (vente)</SelectItem>
                  <SelectItem value="recue">Facture reçue (achat)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Contrepartie *</Label>
              <Select value={form.contrepartie_id} onValueChange={(v) => setForm({ ...form, contrepartie_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {parties?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.party_type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label>Date émission</Label>
              <Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
            </div>
            <div>
              <Label>Échéance</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <Label>Devise</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="XOF">XOF (FCFA)</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>TVA %</Label>
              <Input type="number" step="0.1" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Référence</Label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Bon de commande, contrat..." />
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Lignes</Label>
              <Button size="sm" variant="outline" onClick={addLine}><Plus size={14} className="mr-1" /> Ligne</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-6" placeholder="Description" value={l.description} onChange={(e) => updateLine(i, "description", e.target.value)} />
                  <Input className="col-span-2" type="number" step="0.01" placeholder="Qté" value={l.quantity} onChange={(e) => updateLine(i, "quantity", Number(e.target.value))} />
                  <Input className="col-span-3" type="number" step="0.01" placeholder="Prix unitaire" value={l.unit_price} onChange={(e) => updateLine(i, "unit_price", Number(e.target.value))} />
                  <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals preview */}
          <div className="bg-secondary/50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Sous-total</span><span className="font-mono">{subtotal.toLocaleString("fr-FR")} {form.currency}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>TVA ({form.tax_rate}%)</span><span className="font-mono">{tax.toLocaleString("fr-FR")} {form.currency}</span></div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-border"><span>Total</span><span className="font-mono text-primary">{total.toLocaleString("fr-FR")} {form.currency}</span></div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!form.contrepartie_id || create.isPending}>Créer la facture</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
