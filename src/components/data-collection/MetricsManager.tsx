import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface MetricCategory {
  id: string;
  name: string;
  metrics: MetricDef[];
}

interface MetricDef {
  id: string;
  name: string;
  assigned_to: string;
  conditions: Condition[];
  better_is: "higher" | "lower";
}

interface Condition {
  field: string;
  op: "is" | "is_not";
  value: string;
  join: "and" | "or";
}

// We store metric definitions in data_collection_forms with a special frequency='metric'
function useMetricCategories() {
  return useQuery({
    queryKey: ["metric-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_collection_forms")
        .select("*")
        .eq("frequency", "metric")
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map(d => ({
        id: d.id,
        name: d.title,
        metrics: Array.isArray(d.fields) ? (d.fields as any[]) : [],
      }));
    },
  });
}

function AddCategoryDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { user } = useAuth();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("data_collection_forms").insert({
        title: name,
        frequency: "metric",
        fields: [],
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metric-categories"] });
      toast({ title: "✓ Catégorie ajoutée" });
      setOpen(false);
      setName("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <GhButton>+ Add new metric category</GhButton>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle className="text-foreground">Nouvelle catégorie de métrique</DialogTitle></DialogHeader>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de la catégorie (ex: Cash allocation)"
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-[12.5px] text-foreground" />
        <GhButton onClick={() => create.mutate()} disabled={!name || create.isPending}>Créer</GhButton>
      </DialogContent>
    </Dialog>
  );
}

function AddMetricDialog({ categoryId, categoryName, existingMetrics }: { categoryId: string; categoryName: string; existingMetrics: any[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [assignedTo, setAssignedTo] = useState("Entreprises sélectionnées");
  const [betterIs, setBetterIs] = useState<"higher" | "lower">("higher");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const qc = useQueryClient();

  const addCondition = () => setConditions(prev => [...prev, { field: "launched", op: "is", value: "", join: "and" }]);

  const save = useMutation({
    mutationFn: async () => {
      const newMetric = { id: crypto.randomUUID(), name, assigned_to: assignedTo, conditions, better_is: betterIs };
      const updatedFields = [...existingMetrics, newMetric];
      const { error } = await supabase.from("data_collection_forms").update({ fields: updatedFields as any }).eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metric-categories"] });
      toast({ title: "✓ Métrique ajoutée" });
      setOpen(false);
      setName("");
      setConditions([]);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-[11px] px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          + Add a {categoryName.toLowerCase()} related metric
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-[520px]">
        <DialogHeader><DialogTitle className="text-foreground">Ajouter une métrique</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de la métrique"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-[12.5px] text-foreground" />
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted-foreground uppercase">Assigned to</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-[12px] text-foreground">
              <option>Entreprises sélectionnées</option>
              <option>Toutes les entreprises</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted-foreground uppercase">Conditions</label>
            {conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px]">
                {i > 0 && (
                  <select value={c.join} onChange={e => setConditions(prev => prev.map((x, j) => j === i ? { ...x, join: e.target.value as "and" | "or" } : x))}
                    className="bg-surface-2 border border-border rounded px-1.5 py-1 text-[10px]">
                    <option value="and">and</option>
                    <option value="or">or</option>
                  </select>
                )}
                <span className="text-muted-foreground">if</span>
                <select value={c.op} onChange={e => setConditions(prev => prev.map((x, j) => j === i ? { ...x, op: e.target.value as "is" | "is_not" } : x))}
                  className="bg-surface-2 border border-border rounded px-1.5 py-1 text-[10px]">
                  <option value="is">is</option>
                  <option value="is_not">not</option>
                </select>
                <input
                  value={c.value}
                  onChange={e => setConditions(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                  placeholder="condition value"
                  className="flex-1 bg-surface-2 border border-border rounded px-2 py-1 text-[11px] text-foreground"
                />
                <button onClick={() => setConditions(prev => prev.filter((_, j) => j !== i))} className="text-destructive text-[10px]">✕</button>
              </div>
            ))}
            <button onClick={addCondition} className="text-[10px] text-primary hover:underline">+ Add condition</button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Better is:</span>
            <button onClick={() => setBetterIs("higher")} className={`text-[11px] px-2 py-1 rounded ${betterIs === "higher" ? "bg-gh-green/15 text-gh-green" : "text-muted-foreground"}`}>↑ Higher</button>
            <button onClick={() => setBetterIs("lower")} className={`text-[11px] px-2 py-1 rounded ${betterIs === "lower" ? "bg-gh-blue/15 text-gh-blue" : "text-muted-foreground"}`}>↓ Lower</button>
          </div>

          <GhButton onClick={() => save.mutate()} disabled={!name || save.isPending}>Ajouter</GhButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MetricsManager() {
  const { data: categories, isLoading } = useMetricCategories();
  const [search, setSearch] = useState("");

  const filteredCategories = categories?.map(c => ({
    ...c,
    metrics: c.metrics.filter((m: any) => !search || m.name?.toLowerCase().includes(search.toLowerCase())),
  })) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-foreground">Data collection</h3>
        <AddCategoryDialog />
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[12px]">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by metric name"
          className="w-full bg-surface-2 border border-border rounded-lg pl-8 pr-3 py-2 text-[12px] text-foreground"
        />
      </div>

      {isLoading ? (
        <div className="text-[12px] text-muted-foreground py-8 text-center">Chargement…</div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-[12px] text-muted-foreground py-8 text-center">Aucune catégorie de métrique</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-secondary">
                <th className="px-4 py-2.5 text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Name of metric</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Assigned to</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Better is</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map(cat => (
                <>
                  <tr key={cat.id} className="bg-card border-t border-border">
                    <td className="px-4 py-2.5 font-semibold text-foreground">{cat.name}</td>
                    <td></td>
                    <td className="px-4 py-2.5 text-right">
                      <AddMetricDialog categoryId={cat.id} categoryName={cat.name} existingMetrics={cat.metrics} />
                    </td>
                  </tr>
                  {cat.metrics.map((m: any) => (
                    <tr key={m.id} className="border-t border-border hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-2.5 text-foreground pl-8">• {m.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span>{m.assigned_to ?? "Toutes les entreprises"}</span>
                          {m.conditions?.map((c: Condition, i: number) => (
                            <span key={i} className="inline-flex items-center gap-0.5">
                              {i > 0 && <Pill color={c.join === "and" ? "blue" : "amber"}>{c.join}</Pill>}
                              <span className="text-[10px]">{c.op === "is_not" ? "not" : ""} {c.value}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-[10px] ${m.better_is === "higher" ? "text-gh-green" : "text-gh-blue"}`}>
                            {m.better_is === "higher" ? "↑" : "↓"}
                          </span>
                          <button className="text-muted-foreground hover:text-foreground text-[10px]">✏️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
