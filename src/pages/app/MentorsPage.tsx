import { useState } from "react";
import { motion } from "framer-motion";
import RecordActions from "@/components/shared/RecordActions";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useMentors, type MentorWithProfile } from "@/hooks/useMentors";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";
import MentorDetailSheet from "@/components/mentors/MentorDetailSheet";

const availabilityMap: Record<string, { label: string; color: "green" | "amber" | "rose" }> = {
  available: { label: "Disponible", color: "green" },
  partial: { label: "Partiel", color: "amber" },
  unavailable: { label: "Indisponible", color: "rose" },
};

const gradients = [
  "from-gh-green to-gh-blue", "from-gh-amber to-gh-rose",
  "from-gh-purple to-gh-blue", "from-gh-rose to-gh-amber",
  "from-gh-green to-gh-purple",
];

export default function MentorsPage() {
  const { data: mentors, isLoading } = useMentors();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selected, setSelected] = useState<MentorWithProfile | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader
        title="Mentors"
        subtitle="Réseau d'experts et matching avec les entreprises"
        actions={<GhButton onClick={() => setInviteOpen(true)}>+ Inviter mentor</GhButton>}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-xl" />
          ))
        ) : mentors?.length === 0 ? (
          <div className="col-span-full">
            <EmptyState icon="🧑‍🏫" title="Aucun mentor" description="Invitez des experts pour accompagner vos entreprises" actionLabel="+ Inviter" onAction={() => setInviteOpen(true)} />
          </div>
        ) : (
          mentors?.map((m, idx) => {
            const mentorName = m.profile.full_name || "Mentor";
            const initials = mentorName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            const avail = availabilityMap[m.availability ?? "available"] ?? availabilityMap.available;
            return (
              <div key={m.id} className="bg-card border border-border rounded-xl p-[18px] hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 mb-3.5">
                  <div className={`w-[42px] h-[42px] rounded-full bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
                    {initials}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-foreground">{mentorName}</div>
                    <div className="text-[11px] text-muted-foreground mt-px">{m.bio?.slice(0, 40) ?? "—"}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(m.expertise_areas ?? []).map((t) => (
                    <span key={t} className="font-mono text-[10px] bg-muted text-muted-foreground px-2 py-px rounded">{t}</span>
                  ))}
                </div>
                <div className="flex gap-3.5 text-[11px] text-muted-foreground">
                  <span>Sessions: <span className="font-mono font-semibold text-foreground">{m.total_sessions ?? 0}</span></span>
                  <span>Note: <span className="font-mono font-semibold text-gh-amber">{m.average_rating ?? "—"}★</span></span>
                  <span>Max: <span className="font-mono font-semibold text-foreground">{m.max_startups ?? 5}</span></span>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <Pill color={avail.color}>● {avail.label}</Pill>
                  <div className="flex items-center gap-1"><RecordActions table="mentor_profiles" id={m.id} record={m} entityLabel="Profil mentor" queryKeys={["mentors","mentor_profiles","mentor-profiles"]} fields={[{key:"bio",label:"Biographie",type:"textarea"},{key:"availability",label:"Disponibilité",type:"select",options:[{value:"available",label:"Disponible"},{value:"partial",label:"Partiel"},{value:"unavailable",label:"Indisponible"}]},{key:"max_startups",label:"Nombre max d'entreprises",type:"number"},{key:"hourly_rate",label:"Tarif horaire (XOF)",type:"number"},{key:"linkedin_url",label:"LinkedIn"}]} /><GhButton variant="accent" onClick={() => setSelected(m)}>Voir profil →</GhButton></div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <MentorDetailSheet mentor={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </motion.div>
  );
}
