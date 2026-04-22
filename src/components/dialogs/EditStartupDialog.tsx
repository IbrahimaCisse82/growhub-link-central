import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SECTORS, STARTUP_STAGES } from "@/lib/sectors";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  startup: any | null;
}

export default function EditStartupDialog({ open, onOpenChange, startup }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (startup) setForm({ ...startup });
  }, [startup]);

  const update = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name,
        sector: form.sector || null,
        stage: form.stage || null,
        city: form.city || null,
        country: form.country || null,
        description: form.description || null,
        website: form.website || null,
        team_size: form.team_size ? Number(form.team_size) : null,
        revenue_monthly: form.revenue_monthly ? Number(form.revenue_monthly) : null,
        // Client / facturation fields
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        contact_person: form.contact_person || null,
        ninea: form.ninea || null,
        tax_id: form.tax_id || null,
      };
      const { error } = await supabase.from("startups").update(payload).eq("id", startup.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["startups"] });
      qc.invalidateQueries({ queryKey: ["startup"] });
      qc.invalidateQueries({ queryKey: ["cohort-startups"] });
      onOpenChange(false);
      toast({ title: "Entreprise mise à jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  if (!startup) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader><DialogTitle className="font-display">Modifier l'entreprise</DialogTitle></DialogHeader>

        {/* Section 1 : Identité */}
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Identité</div>
          </div>
          <div className="col-span-2">
            <Label>Nom *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Secteur</Label>
            <Select value={form.sector || ""} onValueChange={(v) => setForm({ ...form, sector: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir un secteur" /></SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Stade</Label>
            <Select value={form.stage || ""} onValueChange={(v) => setForm({ ...form, stage: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir un stade" /></SelectTrigger>
              <SelectContent>
                {STARTUP_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Site web</Label>
            <Input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
          </div>
          <div>
            <Label>Taille équipe</Label>
            <Input type="number" value={form.team_size || ""} onChange={(e) => setForm({ ...form, team_size: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Revenu mensuel (XOF)</Label>
            <Input type="number" value={form.revenue_monthly || ""} onChange={(e) => setForm({ ...form, revenue_monthly: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>

        {/* Section 2 : Contact & Facturation (champs client) */}
        <div className="grid grid-cols-2 gap-4 py-2 border-t border-border pt-4 mt-2">
          <div className="col-span-2">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              Contact & Facturation (utilisé pour la création de contrepartie client)
            </div>
          </div>
          <div>
            <Label>Personne de contact</Label>
            <Input value={form.contact_person || ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Nom du dirigeant / référent" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@entreprise.com" />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+221 ..." />
          </div>
          <div>
            <Label>Adresse</Label>
            <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label>Ville</Label>
            <Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <Label>Pays</Label>
            <Input value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div>
            <Label>NINEA</Label>
            <Input value={form.ninea || ""} onChange={(e) => setForm({ ...form, ninea: e.target.value })} />
          </div>
          <div>
            <Label>N° fiscal</Label>
            <Input value={form.tax_id || ""} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => update.mutate()} disabled={!form.name || update.isPending}>
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
