import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SectionHeader from "@/components/shared/SectionHeader";
import Pill from "@/components/shared/Pill";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GhButton from "@/components/shared/GhButton";
import GhCard from "@/components/shared/GhCard";
import { Plus } from "lucide-react";
import { useAlumni, useAlumniRecords, ALUMNI_STATUS_LABEL, type AlumniStatus, type AlumniRecord } from "@/hooks/useAlumni";
import CertificateDialog from "@/components/alumni/CertificateDialog";
import AlumniDetailPanel from "@/components/alumni/AlumniDetailPanel";
import { useStartups } from "@/hooks/useStartups";
import { usePrograms } from "@/hooks/usePrograms";
import { useAuth } from "@/hooks/useAuth";

export default function AlumniPage() {
  const { data: alumni, isLoading } = useAlumni();
  const { records, upsert: upsertRecord } = useAlumniRecords();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("graduates");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { isAdmin, roles } = useAuth();
  const canEdit = isAdmin || roles.includes("coordinator" as any) || roles.includes("project_manager" as any);
  const { data: startups = [] } = useStartups();
  const { data: programs = [] } = usePrograms();

  // Add new alumni record dialog state
  const [newDlg, setNewDlg] = useState(false);
  const [newDraft, setNewDraft] = useState<Partial<AlumniRecord>>({ status: "active", graduation_date: new Date().toISOString().slice(0, 10) });

  const filtered = alumni?.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.sector?.toLowerCase().includes(search.toLowerCase())) ?? [];
  const selected = records.find((r) => r.id === selectedId);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Alumni" subtitle="Suivi des entreprises diplômées du programme" />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="graduates">Diplômées ({filtered.length})</TabsTrigger>
          <TabsTrigger value="tracking">Suivi & KPIs ({records.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">Suivi post-programme : KPIs économiques, emplois et impact.</div>
            {canEdit && (
              <GhButton size="sm" onClick={() => { setNewDraft({ status: "active", graduation_date: new Date().toISOString().slice(0, 10) }); setNewDlg(true); }}>
                <Plus size={13} className="mr-1" /> Ajouter un alumni
              </GhButton>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <GhCard title="Liste alumni">
              {records.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-6">Aucun alumni suivi.</div>
              ) : (
                <ul className="space-y-1">
                  {records.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => setSelectedId(r.id)}
                        className={`w-full text-left p-2 rounded text-xs hover:bg-muted/50 ${selectedId === r.id ? "bg-muted" : ""}`}
                      >
                        <div className="font-medium">{r.startup?.name ?? "—"}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                          <span>{ALUMNI_STATUS_LABEL[r.status]}</span>
                          <span>·</span>
                          <span>{new Date(r.graduation_date).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </GhCard>

            <div className="lg:col-span-2">
              {selected ? (
                <AlumniDetailPanel record={selected} canEdit={canEdit} />
              ) : (
                <div className="text-xs text-muted-foreground text-center py-12 border border-dashed border-border rounded">
                  Sélectionnez un alumni pour voir ses KPIs.
                </div>
              )}
            </div>
          </div>

          {/* Dialog new */}
          {newDlg && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setNewDlg(false)}>
              <div className="bg-card border border-border rounded-lg p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="font-semibold mb-3">Nouvel alumni</div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Entreprise</label>
                    <Select value={newDraft.startup_id ?? ""} onValueChange={(v) => setNewDraft({ ...newDraft, startup_id: v })}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Choisir une entreprise" /></SelectTrigger>
                      <SelectContent>
                        {startups.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Programme d'origine</label>
                    <Select value={newDraft.program_id ?? ""} onValueChange={(v) => setNewDraft({ ...newDraft, program_id: v })}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Programme" /></SelectTrigger>
                      <SelectContent>
                        {programs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground">Date de graduation</label>
                      <input type="date" className="w-full h-8 px-2 bg-secondary border border-border rounded text-xs"
                        value={newDraft.graduation_date} onChange={(e) => setNewDraft({ ...newDraft, graduation_date: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Statut</label>
                      <Select value={newDraft.status} onValueChange={(v) => setNewDraft({ ...newDraft, status: v as AlumniStatus })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ALUMNI_STATUS_LABEL) as AlumniStatus[]).map((s) =>
                            <SelectItem key={s} value={s}>{ALUMNI_STATUS_LABEL[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <GhButton variant="ghost" size="sm" onClick={() => setNewDlg(false)}>Annuler</GhButton>
                  <GhButton size="sm" onClick={async () => {
                    if (!newDraft.startup_id) return;
                    const id = await upsertRecord.mutateAsync(newDraft);
                    setNewDlg(false);
                    if (typeof id === "string") setSelectedId(id);
                    setTab("tracking");
                  }}>Créer</GhButton>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="graduates" className="mt-4">
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une entreprise alumni…"
          className="w-full max-w-sm px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : !filtered.length ? (
        <EmptyState icon="🎓" title="Aucune entreprise alumni" description="Les entreprises ayant complété un programme apparaîtront ici." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map(a => {
            const cohort = a.cohorts as any;
            const program = cohort?.projects?.programs?.name;
            return (
              <div
                key={a.id}
                onClick={() => navigate(`/app/entreprises/${a.id}`)}
                className="bg-card border border-border rounded-xl p-4 hover:border-border/80 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-foreground truncate">{a.name}</div>
                    <div className="text-[11px] text-muted-foreground">{a.sector ?? "—"} · {a.city ?? ""}, {a.country ?? ""}</div>
                  </div>
                  <Pill color="green">🎓 Alumni</Pill>
                </div>
                {a.alumni_date && (
                  <div className="text-[10px] text-muted-foreground mt-1">Diplômée le {new Date(a.alumni_date).toLocaleDateString("fr-FR")}</div>
                )}
                {program && <div className="text-[10px] text-muted-foreground mt-1">Programme : <span className="text-foreground">{program}</span></div>}
                {cohort?.name && <div className="text-[10px] text-muted-foreground">Cohorte : <span className="text-foreground">{cohort.name}</span></div>}
                {a.alumni_notes && <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{a.alumni_notes}</p>}
                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border">
                  <div className="text-[10px] text-muted-foreground">Score: <span className="text-foreground font-medium">{a.score ?? "—"}</span></div>
                  <div className="text-[10px] text-muted-foreground">Équipe: <span className="text-foreground font-medium">{a.team_size ?? "—"}</span></div>
                  {a.revenue_monthly && <div className="text-[10px] text-muted-foreground">Revenu: <span className="text-foreground font-medium">{new Intl.NumberFormat("fr-FR").format(a.revenue_monthly)} XOF</span></div>}
                  <div className="ml-auto">
                    <CertificateDialog
                      startupName={a.name}
                      programName={program}
                      cohortName={cohort?.name}
                      alumniDate={a.alumni_date}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats summary */}
      {filtered.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox icon="🎓" label="Total Alumni" value={String(filtered.length)} />
          <StatBox icon="👥" label="Emplois créés" value={String(filtered.reduce((s, a) => s + (a.team_size ?? 0), 0))} />
          <StatBox icon="💰" label="Revenu total" value={`${new Intl.NumberFormat("fr-FR").format(filtered.reduce((s, a) => s + (a.revenue_monthly ?? 0), 0))} XOF/mois`} />
          <StatBox icon="⭐" label="Score moyen" value={filtered.filter(a => a.score).length ? (filtered.reduce((s, a) => s + (a.score ?? 0), 0) / filtered.filter(a => a.score).length).toFixed(0) + "/100" : "—"} />
        </div>
      )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function StatBox({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <span className="text-lg">{icon}</span>
      <div className="min-w-0">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-foreground font-semibold text-sm mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}
