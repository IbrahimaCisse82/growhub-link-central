import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpdateSubscription, type SubscriptionFrequency, type SubscriptionStatus } from "@/hooks/useCrm";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; subscription: any | null; }

export default function EditSubscriptionDialog({ open, onOpenChange, subscription }: Props) {
  const update = useUpdateSubscription();
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (subscription) setForm({ ...subscription }); }, [subscription]);

  const submit = async () => {
    const { id, contrepartie: _, ...payload } = form;
    await update.mutateAsync({ id: subscription.id, ...payload, end_date: payload.end_date || null });
    onOpenChange(false);
  };

  if (!subscription) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Modifier l'abonnement</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2">
            <Label>Nom</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Catégorie</Label>
            <Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SubscriptionStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="suspendu">Suspendu</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fréquence</Label>
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
            <Label>Montant</Label>
            <Input type="number" step="0.01" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Prochaine échéance</Label>
            <Input type="date" value={form.next_due_date?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} />
          </div>
          <div>
            <Label>Fin (optionnel)</Label>
            <Input type="date" value={form.end_date?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Génération auto des factures</div>
              <div className="text-xs text-muted-foreground">Crée une facture automatiquement à chaque échéance</div>
            </div>
            <Switch checked={!!form.auto_invoice} onCheckedChange={(v) => setForm({ ...form, auto_invoice: v })} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={update.isPending}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
