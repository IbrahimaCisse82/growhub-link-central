import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DollarSign, PieChart as PieIcon, FolderKanban, FileBarChart, TrendingUp } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import SectionHeader from "@/components/shared/SectionHeader";
import { useAuth } from "@/hooks/useAuth";
import { useGrants } from "@/hooks/useGrants";
import { useProjects } from "@/hooks/useProjects";
import { useAccessibleProjectIds } from "@/hooks/useAccessibleProjects";

const statusColor: Record<string, "green" | "blue" | "amber" | "gray"> = {
  active: "green", disbursing: "green", draft: "gray", paused: "amber", completed: "blue", closed: "gray",
};

/** Dashboard contextuel pour un Bailleur de fonds (funder/investor) — lecture seule. */
export default function FunderDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: grants } = useGrants();
  const { data: projects } = useProjects();
  const { data: accessibleIds } = useAccessibleProjectIds();

  // Scope strict : grants liés à l'organisation OU à un projet accessible via role_assignments
  const myGrants = useMemo(() => {
    if (!grants) return [];
    return grants.filter((g) => {
      const orgMatch = profile?.organization && g.organization === profile.organization;
      const projMatch = g.project_id && accessibleIds?.has(g.project_id);
      return orgMatch || projMatch;
    });
  }, [grants, profile?.organization, accessibleIds]);

  const totalCommitted = myGrants.reduce((s, g) => s + Number(g.amount_total ?? 0), 0);
  const totalDisbursed = myGrants.reduce((s, g) => s + Number(g.amount_disbursed ?? 0), 0);
  const disbursementRate = totalCommitted > 0 ? Math.round((totalDisbursed / totalCommitted) * 100) : 0;
  const fundedProjectIds = new Set<string>();
  myGrants.forEach((g) => { if (g.project_id) fundedProjectIds.add(g.project_id); });
  const fundedProjects = (projects ?? []).filter((p) => fundedProjectIds.has(p.id));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <SectionHeader
        title={`Espace Bailleur ${profile?.organization ? `· ${profile.organization}` : ""}`}
        subtitle="Suivi de votre portefeuille de financements"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard
          label="Engagement total"
          value={new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(totalCommitted)}
          note="FCFA cumulés"
          icon={<DollarSign size={20} />}
          color="blue"
        />
        <StatCard
          label="Décaissé"
          value={new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(totalDisbursed)}
          note={`${disbursementRate}% engagé`}
          icon={<TrendingUp size={20} />}
          color="green"
        />
        <StatCard label="Grants actifs" value={String(myGrants.length)} note="" icon={<PieIcon size={20} />} color="purple" />
        <StatCard label="Projets financés" value={String(fundedProjects.length)} note="" icon={<FolderKanban size={20} />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <GhCard
          title="Mes financements"
          badge={String(myGrants.length)}
          action={<GhButton variant="ghost" onClick={() => navigate("/app/grants")}>Voir tout</GhButton>}
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-secondary">
                  {["Grant", "Engagement", "Décaissé", "%", "Statut"].map((h) => (
                    <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myGrants.length === 0 ? (
                  <tr><td colSpan={5} className="px-3.5 py-8 text-center text-muted-foreground text-sm">Aucun grant</td></tr>
                ) : (
                  myGrants.slice(0, 10).map((g) => {
                    const pct = g.amount_total > 0 ? Math.round((Number(g.amount_disbursed ?? 0) / Number(g.amount_total)) * 100) : 0;
                    return (
                      <tr key={g.id} className="hover:bg-secondary cursor-pointer" onClick={() => navigate(`/app/grants/${g.id}`)}>
                        <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{g.name}</td>
                        <td className="px-3.5 py-2.5 border-b border-border font-mono text-[11px]">
                          {new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(Number(g.amount_total ?? 0))}
                        </td>
                        <td className="px-3.5 py-2.5 border-b border-border font-mono text-[11px]">
                          {new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(Number(g.amount_disbursed ?? 0))}
                        </td>
                        <td className="px-3.5 py-2.5 border-b border-border font-mono text-[11px]">{pct}%</td>
                        <td className="px-3.5 py-2.5 border-b border-border"><Pill color={statusColor[g.status] ?? "gray"}>{g.status}</Pill></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GhCard>

        <div className="flex flex-col gap-4">
          <GhCard title="Accès rapide">
            <div className="flex flex-col gap-1">
              {[
                { label: "Analytics financements", path: "/app/grants-analytics", icon: PieIcon },
                { label: "Rapports", path: "/app/rapports", icon: FileBarChart },
                { label: "Portefeuilles", path: "/app/portefeuilles", icon: FolderKanban },
              ].map((it) => (
                <button key={it.path} onClick={() => navigate(it.path)} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-secondary text-left">
                  <it.icon size={14} className="text-muted-foreground" />
                  <span className="text-[12.5px] font-medium text-foreground">{it.label}</span>
                </button>
              ))}
            </div>
          </GhCard>
        </div>
      </div>
    </motion.div>
  );
}
