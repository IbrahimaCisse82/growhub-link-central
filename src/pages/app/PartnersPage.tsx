import { useState } from "react";
import { motion } from "framer-motion";
import RecordActions, { STATUS_OPTIONS } from "@/components/shared/RecordActions";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartners, useAddPartner, useDeletePartner } from "@/hooks/usePartners";
import { usePrograms } from "@/hooks/usePrograms";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const typeLabels: Record<string, { label: string; color: "green" | "blue" | "amber" | "gray" }> = {
  investor: { label: "Investisseur", color: "green" },
  donor: { label: "Bailleur", color: "blue" },
  partner: { label: "Partenaire", color: "amber" },
  sponsor: { label: "Sponsor", color: "green" },
  other: { label: "Autre", color: "gray" },
};

export default function PartnersPage() {
  const { data: partners, isLoading } = usePartners();
  const { data: programs } = usePrograms();
  const { isAdmin } = useAuth();
  const addPartner = useAddPartner();
  const deletePartner = useDeletePartner();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "investor", contact_name: "", contact_email: "", contact_phone: "", website: "", description: "", country: "", sector: "", program_id: "" });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    addPartner.mutate({ ...form, program_id: form.program_id || undefined }, { onSuccess: () => { setOpen(false); setForm({ name: "", type: "investor", contact_name: "", contact_email: "", contact_phone: "", website: "", description: "", country: "", sector: "", program_id: "" }); } });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Partenaires & Investisseurs" subtitle="CRM des relations bailleurs et investisseurs" actions={isAdmin && <GhButton variant="primary" onClick={() => setOpen(true)}>+ Partenaire</GhButton>} />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">{[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : !partners?.length ? (
        <EmptyState icon="🤝" title="Aucun partenaire" description="Ajoutez vos investisseurs, bailleurs et partenaires stratégiques." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {partners.map(p => {
            const t = typeLabels[p.type] ?? typeLabels.other;
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 hover:border-border/80 hover:-translate-y-0.5 transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-foreground truncate">{p.name}</div>
                    {p.country && <div className="text-[11px] text-muted-foreground">{p.country}{p.sector ? ` · ${p.sector}` : ""}</div>}
                  </div>
                  <Pill color={t.color}>{t.label}</Pill>
                </div>
                {p.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}
                <div className="space-y-1 text-[11px]">
                  {p.contact_name && <div className="text-foreground">👤 {p.contact_name}</div>}
                  {p.contact_email && <div className="text-muted-foreground">✉ {p.contact_email}</div>}
                  {p.contact_phone && <div className="text-muted-foreground">☎ {p.contact_phone}</div>}
                </div>
                {(p as any).programs?.name && <div className="mt-2 text-[10px] text-muted-foreground">Programme : <span className="text-foreground">{(p as any).programs.name}</span></div>}
                {isAdmin && (
                  <div className="mt-3 pt-2 border-t border-border ">
                    <RecordActions table="partners" id={p.id} record={p} entityLabel="Partenaire" queryKeys={["partners"]} fields={[{key:"name",label:"Nom",required:true},{key:"country",label:"Pays"},{key:"sector",label:"Secteur"},{key:"contact_name",label:"Contact"},{key:"contact_email",label:"E-mail",type:"email"},{key:"contact_phone",label:"Téléphone"},{key:"website",label:"Site web"},{key:"description",label:"Description",type:"textarea"}]} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouveau partenaire</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="investor">Investisseur</SelectItem>
                  <SelectItem value="donor">Bailleur</SelectItem>
                  <SelectItem value="partner">Partenaire</SelectItem>
                  <SelectItem value="sponsor">Sponsor</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact</Label><Input value={form.contact_name} onChange={e => setForm(f => ({...f, contact_name: e.target.value}))} /></div>
              <div><Label>Email</Label><Input value={form.contact_email} onChange={e => setForm(f => ({...f, contact_email: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={form.contact_phone} onChange={e => setForm(f => ({...f, contact_phone: e.target.value}))} /></div>
              <div><Label>Pays</Label><Input value={form.country} onChange={e => setForm(f => ({...f, country: e.target.value}))} /></div>
            </div>
            <div><Label>Secteur</Label><Input value={form.sector} onChange={e => setForm(f => ({...f, sector: e.target.value}))} /></div>
            <div><Label>Site web</Label><Input value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))} /></div>
            <div><Label>Programme associé</Label>
              <Select value={form.program_id} onValueChange={v => setForm(f => ({...f, program_id: v}))}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  {programs?.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
          </div>
          <DialogFooter><GhButton variant="primary" onClick={handleSubmit} disabled={addPartner.isPending}>{addPartner.isPending ? "Ajout…" : "Ajouter"}</GhButton></DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
