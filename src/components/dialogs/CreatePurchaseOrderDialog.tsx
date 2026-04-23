import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { useCreatePurchaseOrder } from "@/hooks/usePurchaseOrders";
import { useContreparties } from "@/hooks/useCrm";
import { useProjects } from "@/hooks/useProjects";
import { useGrants } from "@/hooks/useGrants";
import { useOrgSettings } from "@/hooks/useOrgSettings";

interface Line { description: string; quantity: number; unit?: string; unit_price: number; tax_rate: number }

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export default function CreatePurchaseOrderDialog({ open, onOpenChange }: Props) {
  const create = useCreatePurchaseOrder();
  const { data: parties } = useContreparties("all");
  const { data: projects } = useProjects();
  const { data: grants } = useGrants();
  const { data: org } = useOrgSettings();

  const defaultTax = org?.default_tax_rate ?? 18;

  const [form, setForm] = useState({
    supplier_id: "",
    issue_date: new Date().toISOString().split("T")[0],
    expected_delivery_date: "",
    delivery_address: "",
    delivery_contact: "",
    reference: "",
    currency: org?.default_currency ?? "XOF",
    tax_rate: defaultTax,
    payment_terms: org?.default_po_terms ?? "Livraison sous 15 jours après confirmation",
    notes: "",
    project_id: "",
    grant_id: "",
  });
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: 1, unit_price: 0, tax_rate: defaultTax }]);

  const addLine = () => setLines([...lines, { description: "", quantity: 1, unit_price: 0, tax_rate: form.tax_rate }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, key: keyof Line, val: any) => {
    const next = [...lines]; (next[i] as any)[key] = val; setLines(next);
  };

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const taxTotal = lines.reduce((s, l) => s + (l.quantity * l.unit_price * (l.tax_rate || 0)) / 100, 0);
  const total = subtotal + taxTotal;

  // Filtre fournisseurs
  const suppliers = parties?.filter((p: any) => p.is_supplier || p.party_type === "fournisseur" || p.party_type === "partenaire") ?? [];

  const submit = async () => {
    if (!form.supplier_id) return;
    await create.mutateAsync({
      supplier_id: form.supplier_id,
      project_id: form.project_id || null,
      grant_id: form.grant_id || null,
      invoice_id: null,
      issue_date: form.issue_date,
      expected_delivery_date: form.expected_delivery_date || null,
      delivery_address: form.delivery_address || null,
      delivery_contact: form.delivery_contact || null,
      reference: form.reference || null,
      currency: form.currency,
      tax_rate: form.tax_rate,
      payment_terms: form.payment_terms || null,
      notes: form.notes || null,
      status: "brouillon",
      lines: lines.filter((l) => l.description.trim()),
    } as any);
    onOpenChange(false);
    setLines([{ description: "", quantity: 1, unit_price: 0, tax_rate: defaultTax }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouveau bon de commande</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Fournisseur *</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
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
            <div><Label>Date émission</Label><Input type="date" value={form.issue_date} onChange={e=>setForm({...form, issue_date:e.target.value})} /></div>
            <div><Label>Livraison prévue</Label><Input type="date" value={form.expected_delivery_date} onChange={e=>setForm({...form, expected_delivery_date:e.target.value})} /></div>
            <div><Label>Référence</Label><Input value={form.reference} onChange={e=>setForm({...form, reference:e.target.value})} placeholder="Devis fournisseur, contrat..." /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Adresse livraison</Label><Input value={form.delivery_address} onChange={e=>setForm({...form, delivery_address:e.target.value})} /></div>
            <div><Label>Contact livraison</Label><Input value={form.delivery_contact} onChange={e=>setForm({...form, delivery_contact:e.target.value})} placeholder="Nom + tél" /></div>
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
            <div className="flex items-center justify-between mb-2">
              <Label>Lignes</Label>
              <Button size="sm" variant="outline" onClick={addLine}><Plus size={14} className="mr-1" /> Ligne</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-5" placeholder="Désignation" value={l.description} onChange={e=>updateLine(i,"description",e.target.value)} />
                  <Input className="col-span-2" type="number" step="0.01" placeholder="Qté" value={l.quantity} onChange={e=>updateLine(i,"quantity",Number(e.target.value))} />
                  <Input className="col-span-2" type="number" step="0.01" placeholder="PU" value={l.unit_price} onChange={e=>updateLine(i,"unit_price",Number(e.target.value))} />
                  <Input className="col-span-2" type="number" step="0.1" placeholder="TVA %" value={l.tax_rate} onChange={e=>updateLine(i,"tax_rate",Number(e.target.value))} />
                  <Button size="icon" variant="ghost" onClick={()=>removeLine(i)} disabled={lines.length===1}><Trash2 size={14} /></Button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-secondary/50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Sous-total HT</span><span className="font-mono">{subtotal.toLocaleString("fr-FR")} {form.currency}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>TVA totale</span><span className="font-mono">{taxTotal.toLocaleString("fr-FR")} {form.currency}</span></div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-border"><span>Total TTC</span><span className="font-mono text-primary">{total.toLocaleString("fr-FR")} {form.currency}</span></div>
          </div>

          <div><Label>Conditions / Notes</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!form.supplier_id || create.isPending}>Créer le BC</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
