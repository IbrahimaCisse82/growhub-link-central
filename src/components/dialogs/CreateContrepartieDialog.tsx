import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateContrepartie, type PartyType } from "@/hooks/useCrm";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType?: PartyType;
}

export default function CreateContrepartieDialog({ open, onOpenChange, defaultType = "client" }: Props) {
  const create = useCreateContrepartie();
  const [form, setForm] = useState({
    name: "",
    party_type: defaultType,
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Sénégal",
    ninea: "",
    tax_id: "",
    contact_person: "",
    notes: "",
  });

  const submit = async () => {
    if (!form.name) return;
    await create.mutateAsync(form);
    onOpenChange(false);
    setForm({ ...form, name: "", email: "", phone: "", address: "", ninea: "", tax_id: "", contact_person: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle contrepartie</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2">
            <Label>Nom *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom de l'entité" />
          </div>
          <div>
            <Label>Type *</Label>
            <Select value={form.party_type} onValueChange={(v) => setForm({ ...form, party_type: v as PartyType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client (entreprise accompagnée)</SelectItem>
                <SelectItem value="bailleur">Bailleur</SelectItem>
                <SelectItem value="fournisseur">Fournisseur</SelectItem>
                <SelectItem value="partenaire">Partenaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Personne contact</Label>
            <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Adresse</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label>Ville</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <Label>Pays</Label>
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div>
            <Label>NINEA</Label>
            <Input value={form.ninea} onChange={(e) => setForm({ ...form, ninea: e.target.value })} />
          </div>
          <div>
            <Label>N° fiscal</Label>
            <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!form.name || create.isPending}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
