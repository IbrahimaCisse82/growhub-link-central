import { useState, useMemo } from "react";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useHrAgreements, useHrSalaryCategories, type HrAgreement, type HrSalaryCategory } from "@/hooks/useHrAgreements";
import { fmtXOF } from "@/lib/payroll";

const STATUTS = ["employés", "agents de maîtrise", "cadres"];

export default function HrAgreementsPanel() {
  const { agreements, isLoading, upsertAgreement, removeAgreement } = useHrAgreements();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [editAgreement, setEditAgreement] = useState<Partial<HrAgreement> | null>(null);
  const [editCategory, setEditCategory] = useState<Partial<HrSalaryCategory> | null>(null);

  const selected = useMemo(() => agreements.find(a => a.id === selectedId), [agreements, selectedId]);
  const { categories, upsertCategory, removeCategory } = useHrSalaryCategories(selectedId);

  const saveAgreement = async () => {
    if (!editAgreement?.code || !editAgreement?.nom) { toast.error("Code et nom requis"); return; }
    try {
      await upsertAgreement.mutateAsync(editAgreement);
      toast.success("Convention enregistrée");
      setEditAgreement(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const saveCategory = async () => {
    if (!selectedId) return;
    if (!editCategory?.code || !editCategory?.libelle) { toast.error("Code et libellé requis"); return; }
    try {
      await upsertCategory.mutateAsync({ ...editCategory, agreement_id: selectedId });
      toast.success("Catégorie enregistrée");
      setEditCategory(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* Liste des conventions */}
      <GhCard title={`Conventions (${agreements.length})`}>
        <div className="flex justify-end mb-3">
          <GhButton size="sm" onClick={() => setEditAgreement({ is_active: true })}>
            <Plus size={13} className="mr-1" /> Nouvelle
          </GhButton>
        </div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : agreements.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            <BookOpen className="mx-auto mb-2 text-muted-foreground/50" size={28} />
            Aucune convention enregistrée
          </div>
        ) : (
          <ul className="space-y-1">
            {agreements.map(a => (
              <li key={a.id}>
                <button
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors ${
                    selectedId === a.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  }`}
                >
                  <span>
                    <span className="font-medium">{a.nom}</span>
                    <span className="text-muted-foreground text-[11px] block">{a.code} · {a.secteur ?? "—"}</span>
                  </span>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </GhCard>

      {/* Détail + catégories */}
      <GhCard title={selected ? `${selected.nom}` : "Sélectionnez une convention"}>
        {!selected ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Cliquez sur une convention pour voir ses catégories.
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="text-xs text-muted-foreground space-y-1">
                <div><b>Code :</b> {selected.code}</div>
                <div><b>Secteur :</b> {selected.secteur ?? "—"}</div>
                <div><b>Signée le :</b> {selected.date_signature ?? "—"}</div>
                {selected.description && <div className="max-w-xl">{selected.description}</div>}
              </div>
              <div className="flex gap-2">
                <GhButton size="sm" variant="ghost" onClick={() => setEditAgreement(selected)}>
                  <Pencil size={12} className="mr-1" /> Modifier
                </GhButton>
                <GhButton size="sm" variant="ghost" className="text-destructive" onClick={async () => {
                  if (!confirm(`Supprimer "${selected.nom}" et toutes ses catégories ?`)) return;
                  await removeAgreement.mutateAsync(selected.id!);
                  setSelectedId(undefined);
                  toast.success("Convention supprimée");
                }}>
                  <Trash2 size={12} />
                </GhButton>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2 mt-4">
              <h4 className="text-sm font-semibold">Grille salariale ({categories.length})</h4>
              <GhButton size="sm" onClick={() => setEditCategory({ statut: "employés", salaire_minima: 0, sort_order: categories.length })}>
                <Plus size={13} className="mr-1" /> Ajouter
              </GhButton>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 px-3">Code</th>
                    <th className="py-2 px-3">Libellé</th>
                    <th className="py-2 px-3">Statut</th>
                    <th className="py-2 px-3 text-right">Salaire min.</th>
                    <th className="py-2 px-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Aucune catégorie</td></tr>
                  ) : categories.map(c => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-2 px-3 font-medium">{c.code}</td>
                      <td className="py-2 px-3">{c.libelle}</td>
                      <td className="py-2 px-3 text-muted-foreground">{c.statut}</td>
                      <td className="py-2 px-3 text-right">{fmtXOF(c.salaire_minima)}</td>
                      <td className="py-2 px-3 text-right">
                        <button onClick={() => setEditCategory(c)} className="text-muted-foreground hover:text-primary mr-2"><Pencil size={12} /></button>
                        <button onClick={async () => {
                          if (!confirm(`Supprimer la catégorie "${c.libelle}" ?`)) return;
                          await removeCategory.mutateAsync(c.id!);
                          toast.success("Supprimée");
                        }} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </GhCard>

      {/* Dialog convention */}
      <Dialog open={!!editAgreement} onOpenChange={o => !o && setEditAgreement(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editAgreement?.id ? "Modifier" : "Nouvelle"} convention</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Code *</Label><Input value={editAgreement?.code ?? ""} onChange={e => setEditAgreement({ ...editAgreement, code: e.target.value })} /></div>
            <div><Label className="text-xs">Nom *</Label><Input value={editAgreement?.nom ?? ""} onChange={e => setEditAgreement({ ...editAgreement, nom: e.target.value })} /></div>
            <div><Label className="text-xs">Secteur</Label><Input value={editAgreement?.secteur ?? ""} onChange={e => setEditAgreement({ ...editAgreement, secteur: e.target.value })} /></div>
            <div><Label className="text-xs">Date de signature</Label><Input type="date" value={editAgreement?.date_signature ?? ""} onChange={e => setEditAgreement({ ...editAgreement, date_signature: e.target.value })} /></div>
            <div className="col-span-2"><Label className="text-xs">Description</Label><Input value={editAgreement?.description ?? ""} onChange={e => setEditAgreement({ ...editAgreement, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <GhButton variant="ghost" onClick={() => setEditAgreement(null)}>Annuler</GhButton>
            <GhButton onClick={saveAgreement}>Enregistrer</GhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog catégorie */}
      <Dialog open={!!editCategory} onOpenChange={o => !o && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCategory?.id ? "Modifier" : "Nouvelle"} catégorie salariale</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Code *</Label><Input value={editCategory?.code ?? ""} onChange={e => setEditCategory({ ...editCategory, code: e.target.value })} /></div>
            <div><Label className="text-xs">Libellé *</Label><Input value={editCategory?.libelle ?? ""} onChange={e => setEditCategory({ ...editCategory, libelle: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Statut</Label>
              <Select value={editCategory?.statut ?? "employés"} onValueChange={v => setEditCategory({ ...editCategory, statut: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Salaire minimum (XOF)</Label><Input type="number" value={editCategory?.salaire_minima ?? 0} onChange={e => setEditCategory({ ...editCategory, salaire_minima: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Ordre</Label><Input type="number" value={editCategory?.sort_order ?? 0} onChange={e => setEditCategory({ ...editCategory, sort_order: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <GhButton variant="ghost" onClick={() => setEditCategory(null)}>Annuler</GhButton>
            <GhButton onClick={saveCategory}>Enregistrer</GhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
