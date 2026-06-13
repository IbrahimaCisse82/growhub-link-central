import { useState, useMemo } from "react";
import SectionHeader from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, Loader2 } from "lucide-react";
import { useGrants } from "@/hooks/useGrants";
import { generateDonorReport, DONOR_TEMPLATE_LABELS, type DonorTemplate } from "@/lib/donorReportTemplates";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { toast } from "sonner";

export default function DonorReportsPage() {
  const { data: grants = [] } = useGrants();
  const { data: settings } = useOrgSettings();
  const [grantId, setGrantId] = useState<string>("");
  const [template, setTemplate] = useState<DonorTemplate>("eu_intpa");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [progress, setProgress] = useState("");
  const [challenges, setChallenges] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [lessons, setLessons] = useState("");
  const [loading, setLoading] = useState(false);

  const grant = useMemo(() => grants.find((g) => g.id === grantId), [grants, grantId]);

  const handleGenerate = async () => {
    if (!grant) { toast.error("Sélectionne une subvention"); return; }
    if (!periodLabel) { toast.error("Renseigne le libellé de période"); return; }
    setLoading(true);
    try {
      await generateDonorReport({
        grant,
        template,
        periodLabel,
        startDate: startDate || null,
        endDate: endDate || null,
        orgName: settings?.organization_name ?? undefined,
        narrative: { progress, challenges, nextSteps, lessons },
      });
      toast.success("Rapport généré");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Rapports bailleurs" subtitle="Génération multi-templates : UE, USAID, AFD, World Bank" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Subvention</Label>
              <Select value={grantId} onValueChange={setGrantId}>
                <SelectTrigger><SelectValue placeholder="Choisir une subvention" /></SelectTrigger>
                <SelectContent>
                  {grants.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.code ? `[${g.code}] ` : ""}{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template bailleur</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as DonorTemplate)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DONOR_TEMPLATE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Début</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>Fin</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Libellé de période</Label>
              <Input placeholder="Q1 2026 / S1 2026 / Janvier-Juin 2026" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
            </div>
            <Button onClick={handleGenerate} disabled={loading || !grantId} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
              Générer le PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Sections narratives</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Progrès / résumé exécutif</Label>
              <Textarea rows={3} value={progress} onChange={(e) => setProgress(e.target.value)} />
            </div>
            <div>
              <Label>Difficultés rencontrées & atténuation</Label>
              <Textarea rows={3} value={challenges} onChange={(e) => setChallenges(e.target.value)} />
            </div>
            <div>
              <Label>Activités prévues / prochaines étapes</Label>
              <Textarea rows={3} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
            </div>
            <div>
              <Label>Leçons apprises / bonnes pratiques</Label>
              <Textarea rows={2} value={lessons} onChange={(e) => setLessons(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
