import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function useMentorsForMatching() {
  return useQuery({
    queryKey: ["mentors-matching"],
    queryFn: async () => {
      const { data: mentorProfiles, error } = await supabase
        .from("mentor_profiles")
        .select("*");
      if (error) throw error;
      const userIds = mentorProfiles.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, organization")
        .in("user_id", userIds);
      return mentorProfiles.map(m => ({
        ...m,
        full_name: profiles?.find(p => p.user_id === m.user_id)?.full_name ?? "Mentor",
        organization: profiles?.find(p => p.user_id === m.user_id)?.organization ?? "",
      }));
    },
  });
}

function useStartupsForMatching() {
  return useQuery({
    queryKey: ["startups-matching"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startups")
        .select("id, name, sector, stage, description")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

function useExistingMatches() {
  return useQuery({
    queryKey: ["mentor-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_matches")
        .select("*")
        .order("matched_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ── Matching algorithm ──
function computeMatchScore(
  mentor: { expertise_areas: string[] | null; max_startups: number | null; availability: string | null; user_id: string },
  startup: { sector: string | null; stage: string | null },
  existingMatches: any[]
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const expertise = (mentor.expertise_areas ?? []).map(e => e.toLowerCase());
  const sector = (startup.sector ?? "").toLowerCase();

  // Sector match
  if (sector && expertise.some(e => sector.includes(e) || e.includes(sector))) {
    score += 35;
    reasons.push("Secteur aligné avec l'expertise");
  }

  // Stage keywords
  const stageKeywords: Record<string, string[]> = {
    "idéation": ["stratégie", "business model", "idéation", "lean"],
    "mvp": ["produit", "tech", "développement", "mvp"],
    "lancement": ["marketing", "ventes", "go-to-market", "growth"],
    "croissance": ["scale", "finance", "levée", "management"],
    "scale-up": ["international", "m&a", "gouvernance", "leadership"],
  };
  const stage = (startup.stage ?? "").toLowerCase();
  const stageKeys = stageKeywords[stage] ?? [];
  if (stageKeys.some(k => expertise.some(e => e.includes(k)))) {
    score += 25;
    reasons.push("Expertise adaptée au stade");
  }

  // Availability
  if (mentor.availability === "available") {
    score += 20;
    reasons.push("Mentor disponible");
  } else if (mentor.availability === "partial") {
    score += 10;
    reasons.push("Disponibilité partielle");
  }

  // Capacity
  const currentMatches = existingMatches.filter(m => m.mentor_id === mentor.user_id && m.status === "active").length;
  const maxStartups = mentor.max_startups ?? 5;
  if (currentMatches < maxStartups) {
    score += 20;
    reasons.push(`Capacité: ${currentMatches}/${maxStartups}`);
  } else {
    reasons.push("⚠ Capacité maximale atteinte");
  }

  return { score: Math.min(score, 100), reasons };
}

// ── Match Card ──
function MatchCard({ mentor, startup, score, reasons, existingMatch, onMatch }: {
  mentor: any; startup: any; score: number; reasons: string[];
  existingMatch: any | null; onMatch: () => void;
}) {
  const scoreColor = score >= 70 ? "green" : score >= 40 ? "amber" : "rose";
  const initials = mentor.full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">{mentor.full_name}</div>
            <div className="text-[10px] text-muted-foreground">{mentor.organization}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-mono font-bold ${scoreColor === "green" ? "text-gh-green" : scoreColor === "amber" ? "text-gh-amber" : "text-gh-rose"}`}>
            {score}%
          </div>
          <div className="text-[9px] text-muted-foreground font-mono">SCORE</div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="mb-3">
        <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${scoreColor === "green" ? "bg-gh-green" : scoreColor === "amber" ? "bg-gh-amber" : "bg-gh-rose"}`}
            style={{ width: `${score}%` }} />
        </div>
      </div>

      {/* Reasons */}
      <div className="space-y-1 mb-3">
        {reasons.map((r, i) => (
          <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <span className={r.startsWith("⚠") ? "text-gh-amber" : "text-gh-green"}>
              {r.startsWith("⚠") ? "⚠" : "✓"}
            </span>
            {r}
          </div>
        ))}
      </div>

      {/* Expertise tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(mentor.expertise_areas ?? []).slice(0, 4).map((e: string) => (
          <span key={e} className="text-[9px] font-mono bg-muted text-muted-foreground px-1.5 py-px rounded">{e}</span>
        ))}
      </div>

      {existingMatch ? (
        <Pill color={existingMatch.status === "active" ? "green" : "amber"}>
          {existingMatch.status === "active" ? "✓ Matché" : existingMatch.status}
        </Pill>
      ) : (
        <GhButton variant="primary" size="sm" onClick={onMatch} className="w-full">
          Matcher →
        </GhButton>
      )}
    </div>
  );
}

export default function MatchingPage() {
  const { isAdmin } = useAuth();
  const { data: mentors, isLoading: loadingMentors } = useMentorsForMatching();
  const { data: startups, isLoading: loadingStartups } = useStartupsForMatching();
  const { data: matches } = useExistingMatches();
  const qc = useQueryClient();
  const [selectedStartup, setSelectedStartup] = useState<string | null>(null);

  const createMatch = useMutation({
    mutationFn: async ({ mentorId, startupId, score }: { mentorId: string; startupId: string; score: number }) => {
      const { error } = await supabase.from("mentor_matches").insert({
        mentor_id: mentorId,
        startup_id: startupId,
        match_score: score,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentor-matches"] });
      toast({ title: "✓ Matching confirmé" });
    },
  });

  const isLoading = loadingMentors || loadingStartups;
  const currentStartup = startups?.find(s => s.id === selectedStartup);
  const activeMatches = matches?.filter(m => m.status === "active") ?? [];

  // RG-MENT-02 : une exclusion déclarée interdit toute mise en relation
  const { isBlacklisted } = useMentorBlacklists(selectedStartup ?? undefined);

  // Compute scores for selected startup
  const matchResults = currentStartup && mentors
    ? mentors
        .filter(mentor => !isBlacklisted(mentor.user_id))
        .map(mentor => {
          const mentorForAlgo = { expertise_areas: mentor.expertise_areas, max_startups: mentor.max_startups, availability: mentor.availability, user_id: mentor.user_id };
          const { score, reasons } = computeMatchScore(mentorForAlgo, currentStartup, matches ?? []);
          const existingMatch = matches?.find(m => m.mentor_id === mentor.user_id && m.startup_id === currentStartup.id);
          // RG-MENT-01 : capacité déclarée non dépassable
          const currentLoad = (matches ?? []).filter(m => m.mentor_id === mentor.user_id && m.status === "active").length;
          const atCapacity = currentLoad >= (mentor.max_startups ?? 5);
          return { mentor, score, reasons, existingMatch, atCapacity };
        }).sort((a, b) => b.score - a.score)
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader
        title="Matching Mentors ↔ Entreprises"
        subtitle="Algorithme de correspondance basé sur l'expertise, le secteur et la disponibilité"
      />


      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Mentors disponibles" value={String(mentors?.filter(m => m.availability !== "unavailable").length ?? 0)} note="" color="green" />
        <StatCard label="Entreprises" value={String(startups?.length ?? 0)} note="" color="blue" />
        <StatCard label="Matchs actifs" value={String(activeMatches.length)} note="" color="purple" />
        <StatCard label="Score moyen" value={
          activeMatches.length > 0
            ? `${Math.round(activeMatches.reduce((s, m) => s + (m.match_score ?? 0), 0) / activeMatches.length)}%`
            : "—"
        } note="" color="amber" />
      </div>

      {/* Startup selector */}
      <GhCard title="1. Sélectionner l'entreprise" className="mb-5">
        <div className="flex flex-wrap gap-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-32 rounded-lg" />)
          ) : startups?.length === 0 ? (
            <EmptyState icon="△" title="Aucune entreprise" description="Ajoutez des entreprises pour commencer le matching" />
          ) : (
            startups?.map(s => (
              <button key={s.id} onClick={() => setSelectedStartup(selectedStartup === s.id ? null : s.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm transition-all ${
                  selectedStartup === s.id
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-foreground hover:border-primary/30 hover:bg-surface-2"
                }`}>
                <span className="text-xs">△</span>
                <span>{s.name}</span>
                {s.sector && <span className="text-[10px] text-muted-foreground font-mono">{s.sector}</span>}
              </button>
            ))
          )}
        </div>
      </GhCard>

      {/* Match results */}
      {currentStartup && (
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-sm font-bold text-foreground">
              2. Mentors recommandés pour <span className="text-primary">{currentStartup.name}</span>
            </h3>
            <Pill color="blue">{currentStartup.sector ?? "—"}</Pill>
            <Pill color="amber">{currentStartup.stage ?? "—"}</Pill>
          </div>

          {matchResults.length === 0 ? (
            <EmptyState icon="🧑‍🏫" title="Aucun mentor disponible" description="Invitez des mentors pour activer le matching" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchResults.map(({ mentor, score, reasons, existingMatch, atCapacity }) => (
                <MatchCard
                  key={mentor.user_id}
                  mentor={mentor}
                  startup={currentStartup}
                  score={score}
                  reasons={atCapacity ? [...reasons, "Capacité maximale atteinte — mise en relation bloquée"] : reasons}
                  existingMatch={existingMatch}
                  onMatch={() => {
                    if (atCapacity) {
                      toast({ title: "Capacité maximale atteinte", description: "Ce mentor accompagne déjà le nombre maximal d'entreprises déclaré.", variant: "destructive" });
                      return;
                    }
                    createMatch.mutate({
                      mentorId: mentor.user_id,
                      startupId: currentStartup.id,
                      score,
                    });
                  }}
                />
              ))}

            </div>
          )}
        </div>
      )}

      {/* Existing matches */}
      {activeMatches.length > 0 && (
        <GhCard title="Matchs actifs" badge={String(activeMatches.length)} noPadding>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-secondary">
                {["Mentor", "Entreprise", "Score", "Date", "Statut"].map(h => (
                  <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeMatches.map(m => (
                <tr key={m.id} className="hover:bg-secondary transition-colors">
                  <td className="px-3.5 py-2.5 border-b border-border text-foreground">
                    {mentors?.find(mt => mt.user_id === m.mentor_id)?.full_name ?? "—"}
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-border text-foreground">
                    {startups?.find(s => s.id === m.startup_id)?.name ?? "—"}
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-border">
                    <span className={`font-mono font-bold ${(m.match_score ?? 0) >= 70 ? "text-gh-green" : (m.match_score ?? 0) >= 40 ? "text-gh-amber" : "text-gh-rose"}`}>
                      {m.match_score ?? 0}%
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-border font-mono text-muted-foreground">
                    {new Date(m.matched_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-border">
                    <Pill color="green">Actif</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GhCard>
      )}
    </motion.div>
  );
}
