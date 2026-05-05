import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { useAuth } from "@/hooks/useAuth";
import { useEntityDocuments, useCreateEntityDocument, useDeleteEntityDocument, uploadEntityFile, type EntityDocument } from "@/hooks/useEntityDocuments";
import { toast } from "@/hooks/use-toast";
import SignedDownloadLink from "@/components/shared/SignedDownloadLink";

const inputCls = "flex h-10 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";

const categoryMap: Record<string, { label: string; color: "green" | "amber" | "blue" | "gray"; icon: string }> = {
  convention: { label: "Convention", color: "blue", icon: "📄" },
  rapport: { label: "Rapport", color: "gray", icon: "📊" },
  plan: { label: "Plan", color: "green", icon: "📋" },
  juridique: { label: "Juridique", color: "amber", icon: "⚖️" },
  financier: { label: "Financier", color: "amber", icon: "💰" },
  technique: { label: "Technique", color: "blue", icon: "⚙️" },
  autre: { label: "Autre", color: "gray", icon: "📎" },
};

interface Props {
  entityType: "project" | "program" | "startup";
  entityId: string;
  label?: string;
}

export default function EntityDocumentsTab({ entityType, entityId, label = "Documents" }: Props) {
  const { user } = useAuth();
  const { data: documents, isLoading } = useEntityDocuments(entityType, entityId);
  const deleteMutation = useDeleteEntityDocument(entityType, entityId);
  const [showForm, setShowForm] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<EntityDocument | null>(null);

  const grouped: Record<string, EntityDocument[]> = (documents ?? []).reduce((acc: Record<string, EntityDocument[]>, d) => {
    const cat = d.category || "autre";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-foreground">{label}</span>
          <span className="font-mono text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{documents?.length ?? 0} fichiers</span>
        </div>
        <GhButton onClick={() => setShowForm(true)}>+ Ajouter</GhButton>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />)}</div>
      ) : !documents || documents.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="text-2xl mb-2">📁</div>
          <div className="text-sm text-muted-foreground mb-3">Aucun document rattaché</div>
          <GhButton onClick={() => setShowForm(true)}>+ Premier document</GhButton>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, docs]) => {
            const catInfo = categoryMap[cat] ?? categoryMap.autre;
            return (
              <div key={cat} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-secondary/50 flex items-center gap-2">
                  <span>{catInfo.icon}</span>
                  <span className="text-xs font-bold text-foreground">{catInfo.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">({docs.length})</span>
                </div>
                <div className="divide-y divide-border">
                  {docs.map(d => (
                    <div key={d.id} className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{d.title}</div>
                        {d.description && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{d.description}</div>}
                        <div className="text-[10px] text-muted-foreground font-mono mt-1">
                          {d.file_name ?? "—"} · {new Date(d.created_at).toLocaleDateString("fr-FR")}
                          {d.file_size && ` · ${(d.file_size / 1024).toFixed(0)} Ko`}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.file_url && (
                          <SignedDownloadLink bucket="entity-documents" pathOrUrl={d.file_url} className="text-[11px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
                            ⤓ Télécharger
                          </SignedDownloadLink>
                        )}
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

      <DocumentFormDialog open={showForm} onOpenChange={setShowForm} entityType={entityType} entityId={entityId} userId={user?.id} />

      <AlertDialog open={!!deleteDoc} onOpenChange={(o) => { if (!o) setDeleteDoc(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>Le document « {deleteDoc?.title} » sera définitivement supprimé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDoc && deleteMutation.mutate(deleteDoc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DocumentFormDialog({ open, onOpenChange, entityType, entityId, userId }: {
  open: boolean; onOpenChange: (o: boolean) => void; entityType: string; entityId: string; userId?: string;
}) {
  const createMutation = useCreateEntityDocument(entityType, entityId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("autre");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  const reset = () => { setTitle(""); setCategory("autre"); setDescription(""); setFileUrl(null); setFileName(null); setFileSize(null); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadEntityFile(entityType, entityId, file);
      setFileUrl(result.url); setFileName(result.name); setFileSize(result.size);
      toast({ title: "Fichier uploadé" });
    } catch (err) {
      toast({ title: "Erreur upload", description: (err as Error).message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({
      title,
      description: description || undefined,
      category,
      file_url: fileUrl ?? undefined,
      file_name: fileName ?? undefined,
      file_size: fileSize ?? undefined,
      uploaded_by: userId,
    }, {
      onSuccess: () => { reset(); onOpenChange(false); },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) reset(); onOpenChange(o); }}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader><DialogTitle className="font-display">Ajouter un document</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Titre *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required className={inputCls} placeholder="Ex: Business Plan 2026" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Catégorie</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              <option value="convention">Convention</option>
              <option value="rapport">Rapport</option>
              <option value="plan">Plan</option>
              <option value="juridique">Juridique</option>
              <option value="financier">Financier</option>
              <option value="technique">Technique</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputCls + " h-auto"} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Fichier</label>
            {fileUrl ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary truncate flex-1">📎 {fileName}</span>
                <button type="button" onClick={() => { setFileUrl(null); setFileName(null); }} className="text-destructive text-xs hover:underline">Retirer</button>
              </div>
            ) : (
              <div>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,image/*" onChange={handleFileUpload} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={`${inputCls} justify-center items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground`}>
                  {uploading ? "Upload en cours…" : "📎 Choisir un fichier"}
                </button>
              </div>
            )}
          </div>
          <button type="submit" disabled={createMutation.isPending || uploading} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50">
            {createMutation.isPending ? "Enregistrement…" : "Ajouter"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
