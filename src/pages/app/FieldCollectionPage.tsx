import { useState } from "react";
import SectionHeader from "@/components/shared/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CloudUpload, WifiOff, Smartphone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import { useMeMeasurements, type MePhase } from "@/hooks/useMeMeasurements";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { enqueueOffline } from "@/lib/offline/db";

const PHASES: { value: MePhase; label: string }[] = [
  { value: "baseline", label: "Baseline" },
  { value: "midline", label: "Midline" },
  { value: "endline", label: "Endline" },
  { value: "adhoc", label: "Ad hoc" },
];

export default function FieldCollectionPage() {
  const { data: projects = [] } = useProjects();
  const [projectId, setProjectId] = useState<string>("");
  const { progress } = useMeMeasurements({ project_id: projectId || undefined });
  const { online, pending, flush, syncing } = useOfflineSync();

  const [form, setForm] = useState({
    project_indicator_id: "",
    phase: "baseline" as MePhase,
    measured_value: "",
    sample_size: "",
    methodology: "",
    notes: "",
  });
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const indicators = progress.filter((p) => p.source === "project");

  const handleSave = async () => {
    if (!form.project_indicator_id || !form.measured_value) {
      toast.error("Indicateur et valeur requis");
      return;
    }
    const payload = {
      project_indicator_id: form.project_indicator_id,
      project_id: projectId || null,
      phase: form.phase,
      measured_value: Number(form.measured_value),
      measured_at: new Date().toISOString().slice(0, 10),
      sample_size: form.sample_size ? Number(form.sample_size) : null,
      methodology: form.methodology || null,
      notes: form.notes || null,
    };
    await enqueueOffline({ kind: "me_measurement", payload });
    setLastSaved(new Date().toLocaleTimeString());
    setForm({ ...form, measured_value: "", sample_size: "", methodology: "", notes: "" });
    if (online) {
      toast.success("Mesure envoyée");
      void flush();
    } else {
      toast.info("Hors-ligne — sauvegardée localement");
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20">
      <SectionHeader
        title="Collecte terrain"
        subtitle="Saisie mobile optimisée — fonctionne hors-ligne"
        actions={
          <div className="flex items-center gap-2">
            {online ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 gap-1"><Smartphone className="w-3 h-3" /> En ligne</Badge>
            ) : (
              <Badge className="bg-rose-500/15 text-rose-400 gap-1"><WifiOff className="w-3 h-3" /> Hors-ligne</Badge>
            )}
            {pending > 0 && (
              <Badge variant="outline" className="gap-1">
                <CloudUpload className="w-3 h-3" /> {pending} en file
              </Badge>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Nouvelle mesure</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Projet</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Indicateur</Label>
            <Select value={form.project_indicator_id} onValueChange={(v) => setForm({ ...form, project_indicator_id: v })}>
              <SelectTrigger><SelectValue placeholder={indicators.length === 0 ? "Aucun indicateur" : "Sélectionner"} /></SelectTrigger>
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
                  {PHASES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valeur mesurée</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={form.measured_value} onChange={(e) => setForm({ ...form, measured_value: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Taille échantillon</Label>
            <Input type="number" inputMode="numeric" value={form.sample_size} onChange={(e) => setForm({ ...form, sample_size: e.target.value })} />
          </div>
          <div>
            <Label>Méthodologie</Label>
            <Input value={form.methodology} onChange={(e) => setForm({ ...form, methodology: e.target.value })} placeholder="Enquête CAP, observation directe..." />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button onClick={handleSave} className="w-full" size="lg">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
          {lastSaved && (
            <p className="text-xs text-muted-foreground text-center">Dernière sauvegarde : {lastSaved}</p>
          )}
        </CardContent>
      </Card>

      {pending > 0 && online && (
        <Button onClick={() => flush()} disabled={syncing} variant="outline" className="w-full">
          <CloudUpload className="w-4 h-4 mr-2" />
          {syncing ? "Synchronisation..." : `Synchroniser ${pending} mesure(s)`}
        </Button>
      )}
    </div>
  );
}
