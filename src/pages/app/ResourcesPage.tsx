import { useState } from "react";
import SignedDownloadLink from "@/components/shared/SignedDownloadLink";
import { motion } from "framer-motion";
import RecordActions, { STATUS_OPTIONS } from "@/components/shared/RecordActions";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useResources } from "@/hooks/useResources";
import CreateResourceDialog from "@/components/dialogs/CreateResourceDialog";

const typeIcon: Record<string, string> = { document: "📄", video: "🎥", template: "📋", link: "🔗", presentation: "📊" };
const categoryColor: Record<string, "green" | "blue" | "purple" | "amber" | "gray"> = { formation: "blue", template: "purple", guide: "green", outil: "amber" };

export default function ResourcesPage() {
  const { data: resources, isLoading } = useResources();
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Collect all unique tags
  const allTags = Array.from(new Set((resources ?? []).flatMap((r: any) => r.tags ?? [])));

  const filtered = tagFilter
    ? (resources ?? []).filter((r: any) => (r.tags ?? []).includes(tagFilter))
    : resources;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Ressources" subtitle="Bibliothèque de ressources partagées" actions={<CreateResourceDialog><GhButton>+ Ajouter</GhButton></CreateResourceDialog>} />

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">Tags :</span>
          <button onClick={() => setTagFilter(null)} className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${!tagFilter ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>Tous</button>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)} className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${tagFilter === tag ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>{tag}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[160px] rounded-xl" />) : !filtered || filtered.length === 0 ? (
          <div className="col-span-full"><EmptyState icon="📚" title="Aucune ressource" description="Ajoutez des documents, templates ou guides" /></div>
        ) : filtered.map((r: any) => (
          <div key={r.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-border/80 hover:-translate-y-0.5 transition-all cursor-pointer">
            <div className="h-16 flex items-center justify-center text-3xl bg-gradient-to-br from-accent/20 to-primary/10">{typeIcon[r.type ?? "document"] ?? "📄"}</div>
            <div className="p-3.5">
              <div className="text-[13px] font-bold text-foreground">{r.title}</div>
              <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{r.description ?? "Aucune description"}</div>
              {r.program_id && <div className="text-[10px] text-muted-foreground mt-1 font-mono">Programme lié</div>}
              {/* Tags */}
              {r.tags && r.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.tags.map((tag: string) => (
                    <span key={tag} className="text-[9px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="px-3.5 py-2 bg-secondary border-t border-border flex justify-between items-center">
              <div className="flex gap-1.5 items-center">
                <RecordActions table="resources" id={r.id} record={r} entityLabel="Ressource" queryKeys={["resources"]} fields={[{key:"title",label:"Titre",required:true},{key:"category",label:"Catégorie"},{key:"type",label:"Type"},{key:"file_url",label:"Lien du fichier"},{key:"description",label:"Description",type:"textarea"}]} />
                {r.category && <Pill color={categoryColor[r.category.toLowerCase()] ?? "gray"}>{r.category}</Pill>}
                {r.is_public && <Pill color="green">Public</Pill>}
              </div>
              {r.file_url && <span onClick={e => e.stopPropagation()}><SignedDownloadLink bucket="resources" pathOrUrl={r.file_url}><GhButton variant="ghost">↓</GhButton></SignedDownloadLink></span>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
