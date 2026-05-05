import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useGrantDocuments, useDeleteDocument, type GrantDocument } from "@/hooks/useGrantDetail";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GhButton from "@/components/shared/GhButton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import SignedDownloadLink from "@/components/shared/SignedDownloadLink";

const inputCls = "flex h-10 w-full rounded-lg border border-input bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";

const categoryMap: Record<string, { label: string; color: "green" | "amber" | "blue" | "gray"; icon: string }> = {
  convention: { label: "Convention", color: "blue", icon: "📄" }, avenant: { label: "Avenant", color: "amber", icon: "📝" },
  pv: { label: "PV Comité", color: "green", icon: "📋" }, rapport: { label: "Rapport", color: "gray", icon: "📊" },
  facture: { label: "Facture", color: "amber", icon: "🧾" }, autre: { label: "Autre", color: "gray", icon: "📎" },
};

export { useGrantDocuments };

export default function GrantDocumentsTab({ grantId }: { grantId: string }) {
  const { user } = useAuth();
  const deleteMutation = useDeleteDocument(grantId);
  const { data: documents, isLoading } = useGrantDocuments(grantId);
  const [showForm, setShowForm] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<GrantDocument | null>(null);

  const grouped: Record<string, GrantDocument[]> = (documents ?? []).reduce((acc: Record<string, GrantDocument[]>, d) => {
    const cat = d.category || "autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-foreground">Documents contractuels</span>
          <span className="font-mono text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{documents?.length ?? 0} fichiers</span>
        </div>
        <GhButton onClick={() => setShowForm(true)}>+ Ajouter un document</GhButton>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}</div>
      ) : !documents || documents.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="text-2xl mb-2">📁</div><div className="text-sm text-muted-foreground mb-3">Aucun document rattaché</div>
          <GhButton onClick={() => setShowForm(true)}>+ Premier document</GhButton>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, docs]) => {
            const catInfo = categoryMap[cat] ?? categoryMap.autre;
            return (
              <div key={cat} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-secondary/50 flex items-center gap-2">
                  <span>{catInfo.icon}</span><span className="text-xs font-bold text-foreground">{catInfo.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">({docs.length})</span>
                </div>
                <div className="divide-y divide-border">
                  {docs.map(d => (
                    <div key={d.id} className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{d.title}</div>
                        {d.description && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{d.description}</div>}
                        <div className="text-[10px] text-muted-foreground font-mono mt-1">{d.file_name ?? "—"} · {new Date(d.created_at).toLocaleDateString("fr-FR")}</div>
                      </div>
                      <div className="flex gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.file_url && <SignedDownloadLink bucket="grant-documents" pathOrUrl={d.file_url} className="text-[11px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">⤓ Télécharger</SignedDownloadLink>}
                        <button onClick={() => setDeleteDoc(d)} className="text-[11px] text-muted-foreground hover:text-destructive">🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DocumentFormDialog open={showForm} onOpenChange={setShowForm} grantId={grantId} userId={user?.id} />

      <AlertDialog open={!!deleteDoc} onOpenChange={(o) => { if (!o) setDeleteDoc(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle><AlertDialogDescription>Le document « {deleteDoc?.title} » sera définitivement supprimé.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteDoc && deleteMutation.mutate(deleteDoc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DocumentFormDialog({ open, onOpenChange, grantId, userId }: {
  open: boolean; onOpenChange: (o: boolean) => void; grantId: string; userId?: string;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("convention");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  const handleOpenChange = (o: boolean) => {
    if (o) { setTitle(""); setCategory("convention"); setDescription(""); setFileUrl(null); setFileName(null); setFileSize(null); }
    onOpenChange(o);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${grantId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("grant-documents").upload(path, file, { upsert: false });
      if (error) throw error;
      setFileUrl(path); setFileName(file.name); setFileSize(file.size);
      toast({ title: "Fichier uploadé" });
    } catch (err) {
      toast({ title: "Erreur upload", description: (err as Error).message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("grant_documents").insert({
        grant_id: grantId, title, category, description: description || null,
        file_url: fileUrl, file_name: fileName, file_size: fileSize, uploaded_by: userId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_documents", grantId] }); onOpenChange(false); toast({ title: "Document ajouté" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader><DialogTitle className="font-display">Ajouter un document</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Titre *</label><input value={title} onChange={e => setTitle(e.target.value)} required className={inputCls} placeholder="Ex: Convention de financement" /></div>
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Catégorie</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              <option value="convention">Convention</option><option value="avenant">Avenant</option><option value="pv">PV Comité</option>
              <option value="rapport">Rapport</option><option value="facture">Facture</option><option value="autre">Autre</option>
            </select></div>
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputCls + " h-auto"} /></div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Fichier</label>
            {fileUrl ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary truncate flex-1">📎 {fileName}</span>
                <button type="button" onClick={() => { setFileUrl(null); setFileName(null); }} className="text-destructive text-xs hover:underline">Retirer</button>
              </div>
            ) : (
              <div>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" onChange={handleFileUpload} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={`${inputCls} justify-center items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground`}>
                  {uploading ? "Upload en cours…" : "📎 Choisir un fichier"}
                </button>
              </div>
            )}
          </div>
          <button type="submit" disabled={saveMutation.isPending} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50">
            {saveMutation.isPending ? "Enregistrement…" : "Ajouter"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
