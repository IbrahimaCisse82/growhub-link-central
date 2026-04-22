import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateContrepartie, type PartyType } from "@/hooks/useCrm";
import { useStartups } from "@/hooks/useStartups";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType?: PartyType;
}

export default function CreateContrepartieDialog({ open, onOpenChange, defaultType = "client" }: Props) {
  const create = useCreateContrepartie();
  const { data: startups } = useStartups();
  const [selectedStartupId, setSelectedStartupId] = useState<string>("");
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
    startup_id: null as string | null,
  });

  const isClient = form.party_type === "client";

  // Charger les infos détaillées (founder email/phone) quand on sélectionne une entreprise
  useEffect(() => {
    if (!selectedStartupId || !startups) return;
    const s = startups.find((x: any) => x.id === selectedStartupId);
    if (!s) return;

    (async () => {
      let founderEmail = "";
      let founderName = "";
      if (s.founder_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("user_id", s.founder_id)
          .maybeSingle();
        founderEmail = prof?.email ?? "";
        founderName = prof?.full_name ?? "";
      }
      setForm((f) => ({
        ...f,
        name: s.name ?? "",
        startup_id: s.id,
        city: s.city ?? f.city,
        country: s.country ?? f.country,
        email: founderEmail || f.email,
        contact_person: founderName || f.contact_person,
        notes: s.description ?? f.notes,
      }));
    })();
  }, [selectedStartupId, startups]);

  const submit = async () => {
    if (!form.name) return;
    await create.mutateAsync(form);
    onOpenChange(false);
    setSelectedStartupId("");
    setForm({
      name: "", party_type: defaultType, email: "", phone: "", address: "",
      city: "", country: "Sénégal", ninea: "", tax_id: "", contact_person: "",
      notes: "", startup_id: null,
    });
  };

  const startupOptions = useMemo(() => startups ?? [], [startups]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle contrepartie</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label>Type *</Label>
            <Select value={form.party_type} onValueChange={(v) => { setForm({ ...form, party_type: v as PartyType, startup_id: v === "client" ? form.startup_id : null }); if (v !== "client") setSelectedStartupId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client (entreprise accompagnée)</SelectItem>
                <SelectItem value="bailleur">Bailleur</SelectItem>
                <SelectItem value="fournisseur">Fournisseur</SelectItem>
                <SelectItem value="partenaire">Partenaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isClient && (
            <div>
              <Label>Entreprise accompagnée</Label>
              <Select value={selectedStartupId} onValueChange={setSelectedStartupId}>
                <SelectTrigger><SelectValue placeholder="— Sélectionner —" /></SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {startupOptions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Auto-remplit les champs ci-dessous</p>
            </div>
          )}

          <div className="col-span-2">
            <Label>Nom *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom de l'entité" />
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
