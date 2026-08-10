import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, PieChart as PieIcon, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { useStartups } from "@/hooks/useStartups";
import { useCapTable, useUpsertCapEntry, useDeleteCapEntry, useInvestments, useUpsertInvestment, useTermSheets, type CapTableEntry } from "@/hooks/useCapTable";
import { toast } from "@/hooks/use-toast";

const fmtXof = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " XOF";
const COLORS = ["hsl(var(--gh-green))", "hsl(var(--gh-blue))", "hsl(var(--gh-rose))", "#a78bfa", "#fb923c", "#22d3ee", "#facc15"];
const HOLDER_LABELS: Record<string, string> = { founder: "Fondateur", investor: "Investisseur", employee: "Salarié", esop: "ESOP", advisor: "Conseil", other: "Autre" };
const ROUND_LABELS: Record<string, string> = { pre_seed: "Pre-Seed", seed: "Seed", series_a: "Série A", series_b: "Série B", series_c: "Série C", bridge: "Bridge", grant: "Subvention", convertible_note: "Convertible", safe: "SAFE" };
const inputCls = "h-10 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground";

export default function CapTablePage() {
  const { data: startups = [] } = useStartups();
  const [startupId, setStartupId] = useState<string>("");
  const { data: capTable = [] } = useCapTable(startupId);
  const { data: investments = [] } = useInvestments(startupId);
  const { data: termSheets = [] } = useTermSheets(startupId);
  const upsertEntry = useUpsertCapEntry();
  const deleteEntry = useDeleteCapEntry();
  const upsertInv = useUpsertInvestment();
  const [editingEntry, setEditingEntry] = useState<Partial<CapTableEntry> | null>(null);
  const [editingInv, setEditingInv] = useState<any | null>(null);

  const totalShares = capTable.reduce((s, e) => s + Number(e.shares), 0);
  // RG-CAP-02 : la répartition doit totaliser 100 %
  const totalPct = capTable.reduce((s, e) => s + Number(e.ownership_pct ?? 0), 0);
  const pctBalanced = capTable.length === 0 || Math.abs(totalPct - 100) < 0.05;
  const totalRaised = investments.filter((i) => i.status === "closed").reduce((s, i) => s + Number(i.amount_xof), 0);
  const lastValuation = investments.find((i) => i.post_money_valuation_xof)?.post_money_valuation_xof ?? 0;


  const pieData = useMemo(
    () => capTable.map((e) => ({ name: e.holder_name, value: Number(e.ownership_pct ?? 0) })),
    [capTable]
  );

  const saveEntry = async () => {
    if (!startupId || !editingEntry?.holder_name || !editingEntry.shares) {
      toast({ title: "Nom et nombre de parts requis", variant: "destructive" }); return;
    }
    try {
      await upsertEntry.mutateAsync({ ...editingEntry, startup_id: startupId } as any);
      toast({ title: "✓ Enregistré" }); setEditingEntry(null);
    } catch (e) { toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" }); }
  };

  const saveInv = async () => {
    if (!startupId || !editingInv?.round_type || !editingInv.amount_xof) {
      toast({ title: "Type et montant requis", variant: "destructive" }); return;
    }
    try {
      await upsertInv.mutateAsync({ ...editingInv, startup_id: startupId, amount_xof: Number(editingInv.amount_xof) });
      toast({ title: "✓ Enregistré" }); setEditingInv(null);
    } catch (e) { toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" }); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionHeader title="Cap Table & Investissements" subtitle="Répartition du capital, tours de financement, term sheets" />

      <div className="bg-card border border-border rounded-xl p-4">
        <label className="text-xs text-muted-foreground font-mono uppercase mb-2 block">Entreprise</label>
        <select className={inputCls + " max-w-md"} value={startupId} onChange={(e) => setStartupId(e.target.value)}>
          <option value="">— Sélectionner une entreprise —</option>
          {startups.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {!startupId ? (
        <div className="text-sm text-muted-foreground text-center py-12">Choisir une entreprise pour afficher son Cap Table</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Kpi icon={PieIcon} label="Parts totales" value={new Intl.NumberFormat("fr-FR").format(totalShares)} color="blue" />
            <Kpi icon={TrendingUp} label="Total levé" value={fmtXof(totalRaised)} color="green" />
            <Kpi icon={TrendingUp} label="Dernière valorisation" value={lastValuation ? fmtXof(lastValuation) : "—"} color="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-display font-bold text-foreground mb-3">Répartition du capital</h3>
              {pieData.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">Aucune entrée — ajoutez fondateurs et investisseurs.</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.value?.toFixed(1)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-foreground">Tours de financement</h3>
                <GhButton onClick={() => setEditingInv({ round_type: "seed", status: "closed", closed_at: new Date().toISOString().slice(0, 10) })} variant="primary" size="sm"><Plus size={14} /> Tour</GhButton>
              </div>
              {investments.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">Aucun tour enregistré</div>
              ) : (
                <div className="space-y-2">
                  {investments.map((i) => (
                    <div key={i.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg text-sm">
                      <div>
                        <div className="font-medium text-foreground">{ROUND_LABELS[i.round_type] ?? i.round_type} {i.round_name && `· ${i.round_name}`}</div>
                        <div className="text-xs text-muted-foreground">{i.closed_at} {i.lead_investor && `· Lead: ${i.lead_investor}`}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-gh-green">{fmtXof(Number(i.amount_xof))}</div>
                        <Pill color={i.status === "closed" ? "green" : "blue"}>{i.status}</Pill>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">Détenteurs ({capTable.length})</h3>
              <GhButton onClick={() => setEditingEntry({ holder_type: "founder", share_class: "common", shares: 0 })} variant="primary" size="sm"><Plus size={14} /> Détenteur</GhButton>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase font-mono">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4">Nom</th>
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">Classe</th>
                  <th className="text-right py-2 pr-4">Parts</th>
                  <th className="text-right py-2 pr-4">%</th>
                  <th className="text-left py-2">Vesting</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {capTable.map((e) => (
                  <tr key={e.id} className="border-b border-border/40 hover:bg-surface-2">
                    <td className="py-2 pr-4 text-foreground">{e.holder_name}</td>
                    <td className="py-2 pr-4"><Pill color="blue">{HOLDER_LABELS[e.holder_type]}</Pill></td>
                    <td className="py-2 pr-4 text-muted-foreground">{e.share_class}</td>
                    <td className="py-2 pr-4 text-right font-mono">{new Intl.NumberFormat("fr-FR").format(Number(e.shares))}</td>
                    <td className="py-2 pr-4 text-right font-mono font-bold text-gh-blue">{Number(e.ownership_pct ?? 0).toFixed(2)}%</td>
                    <td className="py-2 text-xs text-muted-foreground">{e.vesting_months ? `${e.vesting_months}m / cliff ${e.cliff_months}m` : "—"}</td>
                    <td className="py-2">
                      <button onClick={() => { if (confirm("Supprimer ?")) deleteEntry.mutate({ id: e.id, startup_id: startupId }); }} className="p-1.5 text-destructive hover:bg-destructive/10 rounded"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {capTable.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={4} className="py-2 pr-4 text-right text-xs font-mono uppercase text-muted-foreground">Total</td>
                    <td className={`py-2 pr-4 text-right font-mono font-bold ${pctBalanced ? "text-gh-green" : "text-destructive"}`}>{totalPct.toFixed(2)}%</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
            {!pctBalanced && (
              <p className="mt-3 text-xs text-destructive">
                La répartition du capital ne totalise pas 100 % ({totalPct.toFixed(2)} %). Corrigez les parts détenues avant toute opération.
              </p>
            )}
          </div>


          {termSheets.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-display font-bold text-foreground mb-3">Term sheets en cours</h3>
              <div className="space-y-2">
                {termSheets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg text-sm">
                    <div>
                      <div className="font-medium text-foreground">{t.investor_name}</div>
                      <div className="text-xs text-muted-foreground">{fmtXof(Number(t.amount_xof))} {t.valuation_xof && `· valo ${fmtXof(Number(t.valuation_xof))}`}</div>
                    </div>
                    <Pill color={t.status === "signed" ? "green" : t.status === "rejected" ? "rose" : "blue"}>{t.status}</Pill>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {editingEntry && (
        <Modal onClose={() => setEditingEntry(null)} title={editingEntry.id ? "Modifier détenteur" : "Nouveau détenteur"}>
          <input className={inputCls} placeholder="Nom du détenteur *" value={editingEntry.holder_name ?? ""} onChange={(e) => setEditingEntry({ ...editingEntry, holder_name: e.target.value })} />
          <input className={inputCls} placeholder="Email" value={editingEntry.holder_email ?? ""} onChange={(e) => setEditingEntry({ ...editingEntry, holder_email: e.target.value })} />
          <select className={inputCls} value={editingEntry.holder_type ?? "founder"} onChange={(e) => setEditingEntry({ ...editingEntry, holder_type: e.target.value as any })}>
            {Object.entries(HOLDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={inputCls} value={editingEntry.share_class ?? "common"} onChange={(e) => setEditingEntry({ ...editingEntry, share_class: e.target.value })}>
            <option value="common">Common</option><option value="preferred_a">Preferred A</option><option value="preferred_b">Preferred B</option>
            <option value="option">Option</option><option value="warrant">Warrant</option><option value="safe">SAFE</option><option value="convertible">Convertible</option>
          </select>
          <input type="number" className={inputCls} placeholder="Nombre de parts *" value={editingEntry.shares ?? ""} onChange={(e) => setEditingEntry({ ...editingEntry, shares: Number(e.target.value) })} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className={inputCls} placeholder="Vesting (mois)" value={editingEntry.vesting_months ?? ""} onChange={(e) => setEditingEntry({ ...editingEntry, vesting_months: e.target.value ? Number(e.target.value) : null })} />
            <input type="number" className={inputCls} placeholder="Cliff (mois)" value={editingEntry.cliff_months ?? ""} onChange={(e) => setEditingEntry({ ...editingEntry, cliff_months: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div className="flex justify-end gap-2"><GhButton onClick={() => setEditingEntry(null)} variant="secondary" size="sm">Annuler</GhButton><GhButton onClick={saveEntry} variant="primary" size="sm">Enregistrer</GhButton></div>
        </Modal>
      )}

      {editingInv && (
        <Modal onClose={() => setEditingInv(null)} title="Nouveau tour de financement">
          <select className={inputCls} value={editingInv.round_type} onChange={(e) => setEditingInv({ ...editingInv, round_type: e.target.value })}>
            {Object.entries(ROUND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className={inputCls} placeholder="Nom du tour (optionnel)" value={editingInv.round_name ?? ""} onChange={(e) => setEditingInv({ ...editingInv, round_name: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Montant XOF *" value={editingInv.amount_xof ?? ""} onChange={(e) => setEditingInv({ ...editingInv, amount_xof: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Pre-money valuation XOF" value={editingInv.pre_money_valuation_xof ?? ""} onChange={(e) => setEditingInv({ ...editingInv, pre_money_valuation_xof: e.target.value ? Number(e.target.value) : null })} />
          <input type="number" className={inputCls} placeholder="Post-money valuation XOF" value={editingInv.post_money_valuation_xof ?? ""} onChange={(e) => setEditingInv({ ...editingInv, post_money_valuation_xof: e.target.value ? Number(e.target.value) : null })} />
          <input className={inputCls} placeholder="Lead investor" value={editingInv.lead_investor ?? ""} onChange={(e) => setEditingInv({ ...editingInv, lead_investor: e.target.value })} />
          <input type="date" className={inputCls} value={editingInv.closed_at ?? ""} onChange={(e) => setEditingInv({ ...editingInv, closed_at: e.target.value })} />
          <select className={inputCls} value={editingInv.status} onChange={(e) => setEditingInv({ ...editingInv, status: e.target.value })}>
            <option value="pipeline">Pipeline</option><option value="negotiation">Négociation</option><option value="closed">Closé</option><option value="cancelled">Annulé</option>
          </select>
          <div className="flex justify-end gap-2"><GhButton onClick={() => setEditingInv(null)} variant="secondary" size="sm">Annuler</GhButton><GhButton onClick={saveInv} variant="primary" size="sm">Enregistrer</GhButton></div>
        </Modal>
      )}
    </motion.div>
  );
}

function Kpi({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: "green" | "rose" | "blue" }) {
  const colorCls = { green: "text-gh-green", rose: "text-gh-rose", blue: "text-gh-blue" }[color];
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-mono uppercase">{label}</span>
        <Icon className={colorCls} size={18} />
      </div>
      <div className={`text-xl font-display font-bold ${colorCls}`}>{value}</div>
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-foreground">{title}</h3>
        {children}
      </div>
    </div>
  );
}
