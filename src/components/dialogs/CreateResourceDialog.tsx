import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePrograms } from "@/hooks/usePrograms";

const inputCls = "flex h-10 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";

export default function CreateResourceDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("document");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [programId, setProgramId] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: programs } = usePrograms();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `resources/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("resources").upload(path, file);
      if (error) throw error;
      // Espace privé : on stocke le chemin, l'affichage passe par une URL signée.
      setFileUrl(path);
      setFileName(file.name);
      toast({ title: "Fichier uploadé" });
    } catch (err) {
      toast({ title: "Erreur upload", description: (err as Error).message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const reset = () => {
    setTitle(""); setDescription(""); setCategory(""); setType("document"); setFileUrl(""); setFileName(null); setProgramId(""); setIsPublic(false);
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("resources").insert({
        title, description: description || null, category: category || null,
        type, file_url: fileUrl || null, program_id: programId || null,
        is_public: isPublic, uploaded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resources"] });
      setOpen(false); reset();
      toast({ title: "✓ Ressource ajoutée" });
    },
    onError: (e) => toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) reset(); setOpen(o); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle className="font-display">Nouvelle ressource</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; create.mutate(); }} className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Titre *</label><input value={title} onChange={e => setTitle(e.target.value)} required className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
                <option value="document">Document</option><option value="video">Vidéo</option><option value="template">Template</option><option value="link">Lien</option><option value="presentation">Présentation</option>
              </select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Catégorie</label><input value={category} onChange={e => setCategory(e.target.value)} className={inputCls} placeholder="formation, guide…" /></div>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Programme</label>
            <select value={programId} onChange={e => setProgramId(e.target.value)} className={inputCls}>
              <option value="">— Aucun</option>
              {programs?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Fichier</label>
            {fileUrl && fileName ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-primary truncate flex-1">📎 {fileName}</span>
                <button type="button" onClick={() => { setFileUrl(""); setFileName(null); }} className="text-destructive text-xs hover:underline">Retirer</button>
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
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className={inputCls + " h-16 resize-none"} /></div>
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded" /> Public</label>
          <button type="submit" disabled={create.isPending || uploading} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50">
            {create.isPending ? "Ajout…" : "Ajouter"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
