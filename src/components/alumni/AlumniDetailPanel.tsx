import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileDown, Trash2, TrendingUp } from "lucide-react";
import { useAlumniKpis, ALUMNI_STATUS_LABEL, type AlumniRecord, type AlumniKpi } from "@/hooks/useAlumni";
import { exportAlumniImpactPdf } from "@/lib/alumniImpactPdf";
import { fmtXOF } from "@/lib/payroll";

interface Props {
  record: AlumniRecord;
  canEdit: boolean;
}

const EMPTY: Partial<AlumniKpi> = {
  recorded_at: new Date().toISOString().slice(0, 10),
  revenue_xof: 0, jobs_total: 0, jobs_women: 0, jobs_youth: 0,
  funding_raised_xof: 0, exports_xof: 0, customers_count: 0, notes: "",
};

export default function AlumniDetailPanel({ record, canEdit }: Props) {
  const { kpis, isLoading, insert, remove } = useAlumniKpis(record.id);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<AlumniKpi>>(EMPTY);

  const chartData = kpis.map((k) => ({
    date: new Date(k.recorded_at).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
    "CA (M XOF)": Math.round(Number(k.revenue_xof ?? 0) / 1_000_000),
    Emplois: Number(k.jobs_total ?? 0),
    "Levées (M)": Math.round(Number(k.funding_raised_xof ?? 0) / 1_000_000),
  }));

  const last = kpis[kpis.length - 1];

  const save = async () => {
    await insert.mutateAsync({ ...draft, alumni_id: record.id } as AlumniKpi);
    setDlgOpen(false);
    setDraft(EMPTY);
  };

  return (
    <>
      <GhCard
        title={
          <div className="flex items-center gap-2">
            <TrendingUp size={14} />
            {record.startup?.name ?? "Alumni"} <Badge variant="outline" className="ml-2 text-[10px]">{ALUMNI_STATUS_LABEL[record.status]}</Badge>
          </div> as any
        }
        action={
          <div className="flex gap-2">
            <GhButton size="sm" variant="ghost" onClick={() => exportAlumniImpactPdf(record, kpis)} disabled={!kpis.length}>
              <FileDown size={13} className="mr-1" /> PDF impact
            </GhButton>
            {canEdit && (
              <GhButton size="sm" onClick={() => { setDraft(EMPTY); setDlgOpen(true); }}>
                <Plus size={13} className="mr-1" /> Enregistrer KPIs
              </GhButton>
            )}
          </div>
        }
      >
        {/* KPIs Récap */}
        {last && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-[12px]">
            <div className="bg-muted/40 rounded p-2">
              <div className="text-muted-foreground text-[10px] uppercase">CA actuel</div>
              <div className="font-mono font-bold text-primary">{fmtXOF(last.revenue_xof ?? 0)} F</div>
            </div>
            <div className="bg-muted/40 rounded p-2">
              <div className="text-muted-foreground text-[10px] uppercase">Emplois</div>
              <div className="font-bold">{last.jobs_total} <span className="text-[10px] text-muted-foreground">({last.jobs_women}♀ / {last.jobs_youth}🧑)</span></div>
            </div>
            <div className="bg-muted/40 rounded p-2">
              <div className="text-muted-foreground text-[10px] uppercase">Levées cumulées</div>
              <div className="font-mono font-bold">{fmtXOF(kpis.reduce((s, k) => s + Number(k.funding_raised_xof ?? 0), 0))} F</div>
            </div>
            <div className="bg-muted/40 rounded p-2">
              <div className="text-muted-foreground text-[10px] uppercase">Clients</div>
              <div className="font-bold">{last.customers_count ?? 0}</div>
            </div>
          </div>
        )}

        {/* Timeline */}
        {isLoading ? (
          <div className="text-xs text-muted-foreground">Chargement…</div>
        ) : kpis.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">Aucun KPI enregistré pour cet alumni.</div>
        ) : (
          <>
            <div className="h-56 mb-4">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="CA (M XOF)" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="Emplois" stroke="hsl(var(--gh-green))" strokeWidth={2} />
                  <Line type="monotone" dataKey="Levées (M)" stroke="hsl(var(--gh-blue))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1.5 px-2">Date</th><th className="py-1.5 px-2 text-right">CA</th>
                  <th className="py-1.5 px-2 text-right">Emplois</th><th className="py-1.5 px-2 text-right">Levée</th>
                  <th className="py-1.5 px-2 text-right">Clients</th>
                  {canEdit && <th></th>}
                </tr></thead>
                <tbody>
                  {kpis.slice().reverse().map((k) => (
                    <tr key={k.id} className="border-b border-border/50">
                      <td className="py-1.5 px-2">{new Date(k.recorded_at).toLocaleDateString("fr-FR")}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{fmtXOF(k.revenue_xof ?? 0)}</td>
                      <td className="py-1.5 px-2 text-right">{k.jobs_total ?? 0}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{fmtXOF(k.funding_raised_xof ?? 0)}</td>
                      <td className="py-1.5 px-2 text-right">{k.customers_count ?? 0}</td>
                      {canEdit && (
                        <td className="text-right">
                          <GhButton size="sm" variant="ghost" onClick={() => remove.mutate(k.id!)}>
                            <Trash2 size={11} className="text-destructive" />
                          </GhButton>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </GhCard>

      {/* Dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Enregistrer les KPIs</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2"><Label className="text-[11px]">Date de relevé</Label>
              <Input type="date" value={draft.recorded_at} onChange={(e) => setDraft({ ...draft, recorded_at: e.target.value })} /></div>
            <div><Label className="text-[11px]">Chiffre d'affaires (XOF)</Label>
              <Input type="number" value={draft.revenue_xof} onChange={(e) => setDraft({ ...draft, revenue_xof: Number(e.target.value) })} /></div>
            <div><Label className="text-[11px]">Levée période (XOF)</Label>
              <Input type="number" value={draft.funding_raised_xof} onChange={(e) => setDraft({ ...draft, funding_raised_xof: Number(e.target.value) })} /></div>
            <div><Label className="text-[11px]">Emplois (total)</Label>
              <Input type="number" value={draft.jobs_total} onChange={(e) => setDraft({ ...draft, jobs_total: Number(e.target.value) })} /></div>
            <div><Label className="text-[11px]">Dont femmes</Label>
              <Input type="number" value={draft.jobs_women} onChange={(e) => setDraft({ ...draft, jobs_women: Number(e.target.value) })} /></div>
            <div><Label className="text-[11px]">Dont jeunes</Label>
              <Input type="number" value={draft.jobs_youth} onChange={(e) => setDraft({ ...draft, jobs_youth: Number(e.target.value) })} /></div>
            <div><Label className="text-[11px]">Clients</Label>
              <Input type="number" value={draft.customers_count} onChange={(e) => setDraft({ ...draft, customers_count: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label className="text-[11px]">Exports (XOF)</Label>
              <Input type="number" value={draft.exports_xof} onChange={(e) => setDraft({ ...draft, exports_xof: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label className="text-[11px]">Notes</Label>
              <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <GhButton variant="ghost" onClick={() => setDlgOpen(false)}>Annuler</GhButton>
            <GhButton onClick={save} disabled={insert.isPending}>Enregistrer</GhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
