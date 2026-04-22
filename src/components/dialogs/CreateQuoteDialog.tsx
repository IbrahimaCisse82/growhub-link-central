import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { useCreateQuote, useContreparties } from "@/hooks/useCrm";
import { useProjects } from "@/hooks/useProjects";
import { useGrants } from "@/hooks/useGrants";

interface Line {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultContrepartieId?: string;
}

export default function CreateQuoteDialog({ open, onOpenChange, defaultContrepartieId }: Props) {
  const create = useCreateQuote();
  const { data: parties } = useContreparties("all");
  const { data: projects } = useProjects();
  const { data: grants } = useGrants();

  const [form, setForm] = useState({
    contrepartie_id: defaultContrepartieId || "",
    issue_date: new Date().toISOString().split("T")[0],
    valid_until: "",
    currency: "XOF",
    tax_rate: 18,
    reference: "",
    payment_terms: "Devis valable 30 jours",
    notes: "",
    project_id: "",
    grant_id: "",
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
  const taxTotal = lines.reduce((s, l) => s + (l.quantity * l.unit_price * (l.tax_rate || 0)) / 100, 0);
  const total = subtotal + taxTotal;

  const submit = async () => {
    if (!form.contrepartie_id) return;
    await create.mutateAsync({
      ...form,
      quote_number: "",
      valid_until: form.valid_until || null,
      project_id: form.project_id || null,
      grant_id: form.grant_id || null,
      lines: lines.filter((l) => l.description),
    });
    onOpenChange(false);
    setLines([{ description: "", quantity: 1, unit_price: 0, tax_rate: 18 }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau devis</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={form.contrepartie_id} onValueChange={(v) => setForm({ ...form, contrepartie_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {parties?.filter((p: any) => p.party_type === "client" || p.party_type === "partenaire").map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date émission</Label>
              <Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
            </div>
            <div>
              <Label>Valable jusqu'au</Label>
              <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
            </div>
            <div>
              <Label>TVA par défaut %</Label>
              <Input type="number" step="0.1" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Projet (optionnel)</Label>
              <Select value={form.project_id || "none"} onValueChange={(v) => setForm({ ...form, project_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun —</SelectItem>
                  {projects?.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subvention (optionnel)</Label>
              <Select value={form.grant_id || "none"} onValueChange={(v) => setForm({ ...form, grant_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucune —</SelectItem>
                  {grants?.map((g: any) => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Référence</Label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Bon de commande, projet..." />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Lignes (TVA modifiable par ligne)</Label>
              <Button size="sm" variant="outline" onClick={addLine}><Plus size={14} className="mr-1" /> Ligne</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-5" placeholder="Description" value={l.description} onChange={(e) => updateLine(i, "description", e.target.value)} />
                  <Input className="col-span-2" type="number" step="0.01" placeholder="Qté" value={l.quantity} onChange={(e) => updateLine(i, "quantity", Number(e.target.value))} />
                  <Input className="col-span-2" type="number" step="0.01" placeholder="PU" value={l.unit_price} onChange={(e) => updateLine(i, "unit_price", Number(e.target.value))} />
                  <Input className="col-span-2" type="number" step="0.1" placeholder="TVA %" value={l.tax_rate} onChange={(e) => updateLine(i, "tax_rate", Number(e.target.value))} />
                  <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={lines.length === 1}><Trash2 size={14} /></Button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-secondary/50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Sous-total HT</span><span className="font-mono">{subtotal.toLocaleString("fr-FR")} {form.currency}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>TVA totale</span><span className="font-mono">{taxTotal.toLocaleString("fr-FR")} {form.currency}</span></div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-border"><span>Total TTC</span><span className="font-mono text-primary">{total.toLocaleString("fr-FR")} {form.currency}</span></div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!form.contrepartie_id || create.isPending}>Créer le devis</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
