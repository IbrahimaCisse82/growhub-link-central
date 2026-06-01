import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, FileDown, Target } from "lucide-react";
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, Legend,
} from "recharts";
import html2canvas from "html2canvas";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import StatCard from "@/components/shared/StatCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { usePrograms } from "@/hooks/usePrograms";
import { useProjects } from "@/hooks/useProjects";
import { SDG_LABELS, useImpactIndicators, type ImpactIndicator } from "@/hooks/useImpactIndicators";
import { exportImpactOddReportPdf } from "@/lib/impactOddReportPdf";

type Form = Partial<ImpactIndicator>;

export default function ImpactPage() {
  const { data: programs = [] } = usePrograms();
  const { data: projects = [] } = useProjects();

  const [programId, setProgramId] = useState<string>("all");
  const [projectId, setProjectId] = useState<string>("all");

  const filters = {
    program_id: programId !== "all" ? programId : null,
    project_id: projectId !== "all" ? projectId : null,
  };
  const { indicators, isLoading, upsert, remove } = useImpactIndicators(filters);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Form>({});
  const radarRef = useRef<HTMLDivElement>(null);

  const radarData = useMemo(() => {
    const map = new Map<number, { target: number; actual: number }>();
    for (const i of indicators) {
      const g = map.get(i.sdg_number) ?? { target: 0, actual: 0 };
      g.target += Number(i.target_value ?? 0);
      g.actual += Number(i.actual_value ?? 0);
      map.set(i.sdg_number, g);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([sdg, g]) => ({
        sdg: `ODD ${sdg}`,
        Atteinte: g.target > 0 ? Math.min(100, Math.round((g.actual / g.target) * 100)) : 0,
        Cible: 100,
      }));
  }, [indicators]);

  const totals = useMemo(() => {
    const totalTarget = indicators.reduce((s, i) => s + Number(i.target_value ?? 0), 0);
    const totalActual = indicators.reduce((s, i) => s + Number(i.actual_value ?? 0), 0);
    const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
    const sdgCount = new Set(indicators.map((i) => i.sdg_number)).size;
    return { totalTarget, totalActual, pct, sdgCount };
  }, [indicators]);

  const scopeLabel = useMemo(() => {
    if (projectId !== "all") return projects.find((p: any) => p.id === projectId)?.name ?? "Projet";
    if (programId !== "all") return programs.find((p: any) => p.id === programId)?.name ?? "Programme";
    return "Tous programmes";
  }, [programId, projectId, programs, projects]);

  function openCreate() {
    setForm({ sdg_number: 5, program_id: programId !== "all" ? programId : null, project_id: projectId !== "all" ? projectId : null });
    setDialogOpen(true);
  }

  function openEdit(i: ImpactIndicator) {
    setForm(i);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.indicator_name || !form.sdg_number) return;
    await upsert.mutateAsync(form);
    setDialogOpen(false);
  }

  async function handleExportPdf() {
    let radarPng: string | undefined;
    if (radarRef.current) {
      try {
        const canvas = await html2canvas(radarRef.current, { backgroundColor: "#ffffff", scale: 2 });
        radarPng = canvas.toDataURL("image/png");
      } catch {
        // ignore
      }
    }
    exportImpactOddReportPdf({ indicators, scopeLabel, radarPngDataUrl: radarPng });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <SectionHeader
        title="Impact ODD"
        subtitle="Suivi des indicateurs liés aux 17 Objectifs de Développement Durable"
        actions={
          <div className="flex gap-2">
            <GhButton variant="ghost" onClick={handleExportPdf} disabled={indicators.length === 0}>
              <FileDown size={14} /> Exporter PDF
            </GhButton>
            <GhButton onClick={openCreate}>
              <Plus size={14} /> Nouvel indicateur
            </GhButton>
          </div>
        }
      />

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger><SelectValue placeholder="Programme" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les programmes</SelectItem>
            {programs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger><SelectValue placeholder="Projet" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les projets</SelectItem>
            {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Indicateurs" value={String(indicators.length)} note="" icon={<Target size={20} />} color="blue" />
        <StatCard label="ODD couverts" value={`${totals.sdgCount}/17`} note="" icon={<Target size={20} />} color="purple" />
        <StatCard label="% atteinte global" value={`${totals.pct}%`} note="" icon={<Target size={20} />} color={totals.pct >= 75 ? "green" : totals.pct >= 50 ? "amber" : "rose" as any} />
        <StatCard label="Périmètre" value={scopeLabel.slice(0, 18)} note="" icon={<Target size={20} />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        <GhCard title="Couverture ODD (radar)">
          <div ref={radarRef} className="w-full h-[360px] bg-card">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="sdg" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name="% Atteinte" dataKey="Atteinte" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
                  <Radar name="Cible (100%)" dataKey="Cible" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeDasharray="4 4" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Aucun indicateur</div>
            )}
          </div>
        </GhCard>

        <GhCard title={`Indicateurs (${indicators.length})`}>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Chargement…</div>
          ) : indicators.length === 0 ? (
            <div className="text-muted-foreground text-sm">Aucun indicateur pour ce périmètre.</div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto scrollbar-thin">
              {indicators.map((i) => {
                const pct = i.target_value && i.target_value > 0
                  ? Math.min(100, Math.round(((i.actual_value ?? 0) / i.target_value) * 100))
                  : 0;
                return (
                  <button
                    key={i.id}
                    onClick={() => openEdit(i)}
                    className="text-left p-3 rounded-lg bg-secondary hover:bg-surface-3 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">ODD {i.sdg_number}</Badge>
                        <span className="text-[12.5px] font-semibold text-foreground">{i.indicator_name}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm("Supprimer cet indicateur ?")) remove.mutate(i.id); }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="text-[10.5px] text-muted-foreground mb-1.5">{SDG_LABELS[i.sdg_number]}</div>
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-[11px] font-mono text-foreground">
                        {i.actual_value ?? 0}/{i.target_value ?? 0} {i.unit ?? ""}
                      </span>
                      <span className={`text-[11px] font-bold ${pct >= 75 ? "text-gh-green" : pct >= 50 ? "text-amber-500" : "text-gh-rose"}`}>
                        {pct}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </GhCard>
      </div>

      {/* Dialog création/édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Modifier l'indicateur" : "Nouvel indicateur ODD"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label>Objectif ODD</Label>
              <Select value={String(form.sdg_number ?? 5)} onValueChange={(v) => setForm({ ...form, sdg_number: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SDG_LABELS).map(([n, label]) => (
                    <SelectItem key={n} value={n}>ODD {n} — {label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom de l'indicateur *</Label>
              <Input value={form.indicator_name ?? ""} onChange={(e) => setForm({ ...form, indicator_name: e.target.value })} placeholder="ex : Nombre de femmes entrepreneures accompagnées" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Unité</Label>
                <Input value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="ex : personnes" />
              </div>
              <div>
                <Label>Cible</Label>
                <Input type="number" value={form.target_value ?? ""} onChange={(e) => setForm({ ...form, target_value: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
              <div>
                <Label>Réalisé</Label>
                <Input type="number" value={form.actual_value ?? ""} onChange={(e) => setForm({ ...form, actual_value: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Programme</Label>
                <Select value={form.program_id ?? "none"} onValueChange={(v) => setForm({ ...form, program_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucun —</SelectItem>
                    {programs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Projet</Label>
                <Select value={form.project_id ?? "none"} onValueChange={(v) => setForm({ ...form, project_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucun —</SelectItem>
                    {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <GhButton variant="ghost" onClick={() => setDialogOpen(false)}>Annuler</GhButton>
            <GhButton onClick={handleSave} disabled={!form.indicator_name}>Enregistrer</GhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
