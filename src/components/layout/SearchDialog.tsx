import { useState, useEffect } from "react";
import { isPathEnabled } from "@/lib/featureFlags";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  type: string;
  id: string;
  name: string;
  subtitle?: string;
  path: string;
}

export default function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); }
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = `%${query}%`;
      const [startups, programs, cohorts, projects, portfolios, grants, events, courses] = await Promise.all([
        supabase.from("startups").select("id, name, sector").ilike("name", q).limit(5),
        supabase.from("programs").select("id, name, code").ilike("name", q).limit(5),
        supabase.from("cohorts").select("id, name").ilike("name", q).limit(5),
        supabase.from("projects").select("id, name, code").ilike("name", q).limit(5),
        supabase.from("portfolios").select("id, name, code").ilike("name", q).limit(3),
        supabase.from("grants").select("id, name, code").ilike("name", q).limit(3),
        supabase.from("events").select("id, title").ilike("title", q).limit(3),
        supabase.from("courses").select("id, title").ilike("title", q).limit(3),
      ]);
      const r: SearchResult[] = [
        ...(startups.data ?? []).map(s => ({ type: "Entreprise", id: s.id, name: s.name, subtitle: s.sector ?? undefined, path: `/app/entreprises/${s.id}` })),
        ...(programs.data ?? []).map(p => ({ type: "Programme", id: p.id, name: p.name, subtitle: p.code, path: `/app/programmes/${p.id}` })),
        ...(cohorts.data ?? []).map(c => ({ type: "Cohorte", id: c.id, name: c.name, path: `/app/cohortes/${c.id}` })),
        ...(projects.data ?? []).map(p => ({ type: "Projet", id: p.id, name: p.name, subtitle: p.code ?? undefined, path: `/app/projets` })),
        ...(portfolios.data ?? []).map(p => ({ type: "Portefeuille", id: p.id, name: p.name, subtitle: p.code, path: `/app/portefeuilles/${p.id}` })),
        ...(grants.data ?? []).map(g => ({ type: "Grant", id: g.id, name: g.name, subtitle: g.code, path: `/app/grants` })),
        ...(events.data ?? []).map(e => ({ type: "Événement", id: e.id, name: e.title, path: `/app/evenements` })),
        ...(courses.data ?? []).map(c => ({ type: "Cours", id: c.id, name: c.title, path: `/app/lms` })),
      ];
      setResults(r.filter((item) => isPathEnabled(item.path)));
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (r: SearchResult) => {
    navigate(r.path);
    onOpenChange(false);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onOpenChange(!open); }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[500px] p-0">
        <div className="p-3 border-b border-border">
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Rechercher entreprises, programmes, cohortes, grants, cours…"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {loading && <div className="px-4 py-3 text-sm text-muted-foreground">Recherche…</div>}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun résultat pour « {query} »</div>
          )}
          {results.map(r => (
            <button key={`${r.type}-${r.id}`} onClick={() => handleSelect(r)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-secondary transition-colors text-left">
              <span className="font-mono text-[10px] bg-muted text-muted-foreground px-1.5 py-px rounded">{r.type}</span>
              <div>
                <div className="text-sm font-medium text-foreground">{r.name}</div>
                {r.subtitle && <div className="text-[11px] text-muted-foreground">{r.subtitle}</div>}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
