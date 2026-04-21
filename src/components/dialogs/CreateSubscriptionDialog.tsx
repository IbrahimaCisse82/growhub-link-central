import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSubscription, useContreparties, type SubscriptionFrequency } from "@/hooks/useCrm";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export default function CreateSubscriptionDialog({ open, onOpenChange }: Props) {
  const create = useCreateSubscription();
  const { data: parties } = useContreparties("fournisseur");
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    name: "",
    contrepartie_id: "",
    description: "",
    amount: 0,
    currency: "XOF",
    frequency: "mensuel" as SubscriptionFrequency,
    start_date: today,
    end_date: "",
    next_due_date: today,
    category: "",
    auto_invoice: true,
  });

  const submit = async () => {
    if (!form.name || !form.contrepartie_id || !form.amount) return;
    await create.mutateAsync({
      ...form,
      end_date: form.end_date || null,
    });
    onOpenChange(false);
    setForm({ ...form, name: "", description: "", amount: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouvel abonnement</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2">
            <Label>Nom *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Hébergement AWS" />
          </div>
          <div className="col-span-2">
            <Label>Fournisseur *</Label>
            <Select value={form.contrepartie_id} onValueChange={(v) => setForm({ ...form, contrepartie_id: v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {parties?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Catégorie</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Cloud, SaaS, Loyer..." />
          </div>
          <div>
            <Label>Fréquence *</Label>
            <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as SubscriptionFrequency })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mensuel">Mensuel</SelectItem>
                <SelectItem value="trimestriel">Trimestriel</SelectItem>
                <SelectItem value="semestriel">Semestriel</SelectItem>
                <SelectItem value="annuel">Annuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Montant *</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Devise</Label>
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="XOF">XOF</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Début *</Label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value, next_due_date: e.target.value })} />
          </div>
          <div>
            <Label>Fin (optionnel)</Label>
            <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!form.name || !form.contrepartie_id || !form.amount || create.isPending}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
