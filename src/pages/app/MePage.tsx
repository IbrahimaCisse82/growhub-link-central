import { useState, useMemo } from "react";
import SectionHeader from "@/components/shared/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckCircle2, Trash2, Activity, Target, Calendar } from "lucide-react";
import { useMeMeasurements, type MePhase } from "@/hooks/useMeMeasurements";
import { useMonitoringPlans } from "@/hooks/useMonitoringPlans";
import { useProjects } from "@/hooks/useProjects";

const PHASE_LABEL: Record<MePhase, string> = {
  baseline: "Baseline",
  midline: "Midline",
  endline: "Endline",
  adhoc: "Ad hoc",
};

const PHASE_COLOR: Record<MePhase, string> = {
  baseline: "bg-blue-500/15 text-blue-400",
  midline: "bg-amber-500/15 text-amber-400",
  endline: "bg-emerald-500/15 text-emerald-400",
  adhoc: "bg-muted text-muted-foreground",
};

export default function MePage() {
  const { data: projects = [] } = useProjects();
  const [projectId, setProjectId] = useState<string>("");
  const { measurements, progress, upsert, remove, validate } = useMeMeasurements({ project_id: projectId || undefined });
  const { plans, upsert: upsertPlan, remove: removePlan } = useMonitoringPlans({ project_id: projectId || undefined });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ project_indicator_id: string; phase: MePhase; measured_value: string; measured_at: string; sample_size: string; methodology: string; notes: string }>({
    project_indicator_id: "",
    phase: "baseline",
    measured_value: "",
    measured_at: new Date().toISOString().slice(0, 10),
    sample_size: "",
    methodology: "",
    notes: "",
  });

  const indicators = useMemo(() => progress.filter((p) => p.source === "project"), [progress]);

  const handleSave = async () => {
    if (!form.project_indicator_id || !form.measured_value) return;
    await upsert.mutateAsync({
      project_indicator_id: form.project_indicator_id,
      project_id: projectId || null,
      phase: form.phase,
      measured_value: Number(form.measured_value),
      measured_at: form.measured_at,
      sample_size: form.sample_size ? Number(form.sample_size) : null,
      methodology: form.methodology || null,
      notes: form.notes || null,
    });
    setDialogOpen(false);
    setForm({ ...form, measured_value: "", sample_size: "", methodology: "", notes: "" });
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Suivi-Évaluation (M&E)"
        subtitle="Mesures baseline / midline / endline + plan de suivi (PMP)"
        actions={
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Filtrer par projet" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les projets</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <Tabs defaultValue="indicators">
        <TabsList>
          <TabsTrigger value="indicators"><Target className="w-4 h-4 mr-1" />Progression indicateurs</TabsTrigger>
          <TabsTrigger value="measurements"><Activity className="w-4 h-4 mr-1" />Mesures</TabsTrigger>
          <TabsTrigger value="pmp"><Calendar className="w-4 h-4 mr-1" />Plan de suivi (PMP)</TabsTrigger>
        </TabsList>

        <TabsContent value="indicators" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Baseline → Endline</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicateur</TableHead>
                    <TableHead className="text-right">Baseline</TableHead>
                    <TableHead className="text-right">Midline</TableHead>
                    <TableHead className="text-right">Endline</TableHead>
                    <TableHead className="text-right">Cible</TableHead>
                    <TableHead className="text-right">% atteinte</TableHead>
                    <TableHead className="text-right">Δ vs baseline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicators.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Aucun indicateur</TableCell></TableRow>
                  ) : indicators.map((i) => (
                    <TableRow key={i.indicator_id}>
                      <TableCell className="font-medium">{i.name} <span className="text-xs text-muted-foreground">({i.unit ?? "—"})</span></TableCell>
                      <TableCell className="text-right">{i.baseline_measured ?? i.baseline_value ?? "—"}</TableCell>
                      <TableCell className="text-right">{i.midline_measured ?? "—"}</TableCell>
                      <TableCell className="text-right">{i.endline_measured ?? "—"}</TableCell>
                      <TableCell className="text-right">{i.target_value ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {i.achievement_pct != null ? (
                          <Badge className={i.achievement_pct >= 80 ? "bg-emerald-500/15 text-emerald-400" : i.achievement_pct >= 50 ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400"}>
                            {i.achievement_pct} %
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">{i.variation_vs_baseline_pct != null ? `${i.variation_vs_baseline_pct} %` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nouvelle mesure</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Enregistrer une mesure</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Indicateur</Label>
                    <Select value={form.project_indicator_id} onValueChange={(v) => setForm({ ...form, project_indicator_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {indicators.map((i) => <SelectItem key={i.indicator_id} value={i.indicator_id}>{i.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Phase</Label>
                      <Select value={form.phase} onValueChange={(v) => setForm({ ...form, phase: v as MePhase })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PHASE_LABEL) as MePhase[]).map((p) => <SelectItem key={p} value={p}>{PHASE_LABEL[p]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valeur</Label>
                      <Input type="number" step="0.01" value={form.measured_value} onChange={(e) => setForm({ ...form, measured_value: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Date</Label>
                      <Input type="date" value={form.measured_at} onChange={(e) => setForm({ ...form, measured_at: e.target.value })} />
                    </div>
                    <div>
                      <Label>Taille échantillon</Label>
                      <Input type="number" value={form.sample_size} onChange={(e) => setForm({ ...form, sample_size: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Méthodologie</Label>
                    <Input value={form.methodology} onChange={(e) => setForm({ ...form, methodology: e.target.value })} placeholder="Enquête CAP, observation directe, registre..." />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                  <Button onClick={handleSave}>Enregistrer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead className="text-right">Valeur</TableHead>
                    <TableHead className="text-right">Échantillon</TableHead>
                    <TableHead>Méthodologie</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {measurements.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Aucune mesure</TableCell></TableRow>
                  ) : measurements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.measured_at}</TableCell>
                      <TableCell><Badge className={PHASE_COLOR[m.phase]}>{PHASE_LABEL[m.phase]}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{m.measured_value}</TableCell>
                      <TableCell className="text-right">{m.sample_size ?? "—"}</TableCell>
                      <TableCell className="text-xs">{m.methodology ?? "—"}</TableCell>
                      <TableCell>{m.validated_at ? <Badge className="bg-emerald-500/15 text-emerald-400">Validée</Badge> : <Badge variant="outline">En attente</Badge>}</TableCell>
                      <TableCell className="text-right">
                        {!m.validated_at && <Button size="icon" variant="ghost" onClick={() => validate.mutate(m.id)}><CheckCircle2 className="w-4 h-4" /></Button>}
                        <Button size="icon" variant="ghost" onClick={() => remove.mutate(m.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pmp" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => upsertPlan.mutate({
              project_id: projectId || null,
              data_source: "À définir",
              collection_frequency: "trimestriel",
              target_phases: ["baseline", "endline"],
            })}><Plus className="w-4 h-4 mr-1" />Nouvelle ligne PMP</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source données</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Fréquence</TableHead>
                    <TableHead>Phases ciblées</TableHead>
                    <TableHead>Prochaine mesure</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aucun plan de suivi</TableCell></TableRow>
                  ) : plans.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.data_source}</TableCell>
                      <TableCell className="text-xs">{p.collection_method ?? "—"}</TableCell>
                      <TableCell>{p.collection_frequency}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(p.target_phases ?? []).map((ph) => <Badge key={ph} variant="outline" className="text-xs">{ph}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell>{p.next_measurement_due ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => removePlan.mutate(p.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
