import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useHrDeclarations } from "@/hooks/useHrDeclarations";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import {
  exportDeclarationPdf,
  exportDeclarationXlsx,
  exportEtatChargesXlsx,
  type DeclarationKind,
} from "@/lib/declarationsExport";
import { MOIS } from "@/lib/payroll";
import { Building2, FileDown, Printer, Receipt, ShieldCheck, Wallet, Layers, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const fmtXOF = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + " FCFA";

const CAISSE_META: Record<
  DeclarationKind,
  { label: string; description: string; icon: typeof Building2; tone: string }
> = {
  IPRES: {
    label: "IPRES",
    description: "Régime Général + Régime Complémentaire (retraite)",
    icon: ShieldCheck,
    tone: "text-primary",
  },
  CSS: {
    label: "CSS",
    description: "Allocations familiales (7%) + Accidents du travail",
    icon: Wallet,
    tone: "text-primary",
  },
  IR_TRIMF: {
    label: "IR / TRIMF",
    description: "Impôt sur le revenu et minimum fiscal",
    icon: Receipt,
    tone: "text-primary",
  },
  CFCE: {
    label: "CFCE",
    description: "Contribution forfaitaire à la charge des employeurs (3%)",
    icon: Building2,
    tone: "text-primary",
  },
};

interface KpiTileProps {
  label: string;
  value: string;
  icon: typeof Building2;
}
function KpiTile({ label, value, icon: Icon }: KpiTileProps) {
  return (
    <Card className="p-4 flex items-start justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-lg font-bold mt-1">{value}</div>
      </div>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </Card>
  );
}

export default function HrDeclarationsPanel() {
  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState<number | "all">(now.getMonth());
  const moisFilter = mois === "all" ? undefined : mois;

  const { totals, payslips, runs, isLoading } = useHrDeclarations({
    annee,
    mois: moisFilter,
    onlyClosed: true,
  });
  const { data: orgSettings } = useOrgSettings();

  const hasData = payslips.length > 0;
  const periodLabel = useMemo(
    () => (mois === "all" ? `Année ${annee}` : `${MOIS[mois as number]} ${annee}`),
    [mois, annee],
  );

  const handlePdf = async (kind: DeclarationKind) => {
    if (!hasData) {
      toast.error("Aucun bulletin clôturé pour cette période");
      return;
    }
    try {
      await exportDeclarationPdf(kind, totals, payslips, { mois: moisFilter, annee }, orgSettings ?? null);
      toast.success(`Déclaration ${kind} exportée (PDF)`);
    } catch (e: any) {
      toast.error(e.message ?? "Export PDF impossible");
    }
  };

  const handleXlsx = (kind: DeclarationKind) => {
    if (!hasData) {
      toast.error("Aucun bulletin clôturé pour cette période");
      return;
    }
    try {
      exportDeclarationXlsx(kind, totals, payslips, { mois: moisFilter, annee });
      toast.success(`Déclaration ${kind} exportée (Excel)`);
    } catch (e: any) {
      toast.error(e.message ?? "Export Excel impossible");
    }
  };

  const handleEtat = () => {
    if (!hasData) {
      toast.error("Aucun bulletin clôturé pour cette période");
      return;
    }
    exportEtatChargesXlsx(totals, payslips, { mois: moisFilter, annee });
    toast.success("État des charges exporté");
  };

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  return (
    <div className="space-y-6">
      {/* Filtres période */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Année</Label>
            <Select value={String(annee)} onValueChange={(v) => setAnnee(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Période</Label>
            <Select
              value={mois === "all" ? "all" : String(mois)}
              onValueChange={(v) => setMois(v === "all" ? "all" : Number(v))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Année complète (annuel)</SelectItem>
                {MOIS.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline">{runs.length} paie(s) clôturée(s)</Badge>
            <Badge variant="outline">{payslips.length} bulletin(s)</Badge>
          </div>
        </div>
      </Card>

      {!hasData && !isLoading && (
        <Card className="p-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-foreground">Aucun bulletin clôturé pour {periodLabel}</div>
              Les déclarations sont calculées à partir des paies validées ou clôturées. Clôturez la
              paie du mois concerné depuis l'onglet « Paie ».
            </div>
          </div>
        </Card>
      )}

      {/* KPI synthèse */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile label="Masse salariale brute" value={fmtXOF(totals.masseSalarialeBrute)} icon={Wallet} />
        <KpiTile label="Total IPRES" value={fmtXOF(totals.ipresTotal)} icon={ShieldCheck} />
        <KpiTile label="Total CSS" value={fmtXOF(totals.cssTotal)} icon={Building2} />
        <KpiTile label="IR + TRIMF + CFCE" value={fmtXOF(totals.ir + totals.trimf + totals.cfce)} icon={Receipt} />
      </div>

      {/* Cartes par caisse */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(CAISSE_META) as DeclarationKind[]).map((kind) => {
          const meta = CAISSE_META[kind];
          const Icon = meta.icon;
          let amount = 0;
          if (kind === "IPRES") amount = totals.ipresTotal;
          if (kind === "CSS") amount = totals.cssTotal;
          if (kind === "IR_TRIMF") amount = totals.ir + totals.trimf;
          if (kind === "CFCE") amount = totals.cfce;
          return (
            <Card key={kind} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <Icon className={`h-5 w-5 ${meta.tone}`} />
                  </div>
                  <div>
                    <div className="font-semibold">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">{meta.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">À verser</div>
                  <div className="text-lg font-bold">{fmtXOF(amount)}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePdf(kind)} disabled={!hasData}>
                  <Printer className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleXlsx(kind)} disabled={!hasData}>
                  <FileDown className="h-4 w-4 mr-1" />
                  Excel
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* État global des charges */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">État global des charges sociales & fiscales</div>
              <div className="text-xs text-muted-foreground">
                Synthèse multi-caisses (IPRES, CSS, IR, TRIMF, CFCE, IPM, BRS) — utile pour la
                comptabilité et le contrôle interne
              </div>
            </div>
          </div>
          <Button onClick={handleEtat} disabled={!hasData}>
            <FileDown className="h-4 w-4 mr-1" />
            Télécharger l'état complet (Excel)
          </Button>
        </div>
      </Card>
    </div>
  );
}
