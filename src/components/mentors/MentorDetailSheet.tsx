import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import Pill from "@/components/shared/Pill";
import type { MentorWithProfile } from "@/hooks/useMentors";

interface Props {
  mentor: MentorWithProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MentorDetailSheet({ mentor, open, onOpenChange }: Props) {
  if (!mentor) return null;
  const name = mentor.profile.full_name || "Mentor";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">{name}</SheetTitle>
          <SheetDescription>{mentor.profile.email ?? "—"}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5 text-sm">
          <section>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Bio</div>
            <p className="text-foreground">{mentor.bio || "Aucune biographie renseignée."}</p>
          </section>
          <section>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Expertises</div>
            <div className="flex flex-wrap gap-1.5">
              {(mentor.expertise_areas ?? []).length === 0
                ? <span className="text-muted-foreground text-xs">—</span>
                : mentor.expertise_areas!.map(a => (
                    <span key={a} className="font-mono text-[10px] bg-muted text-muted-foreground px-2 py-px rounded">{a}</span>
                  ))}
            </div>
          </section>
          <section className="grid grid-cols-2 gap-3">
            <Stat label="Sessions" value={String(mentor.total_sessions ?? 0)} />
            <Stat label="Note moyenne" value={mentor.average_rating ? `${mentor.average_rating}★` : "—"} />
            <Stat label="Entreprises max" value={String(mentor.max_startups ?? 5)} />
            <Stat label="Tarif/h" value={mentor.hourly_rate ? `${mentor.hourly_rate} XOF` : "—"} />
          </section>
          <section>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Disponibilité</div>
            <Pill color={mentor.availability === "available" ? "green" : mentor.availability === "partial" ? "amber" : "rose"}>
              {mentor.availability ?? "available"}
            </Pill>
          </section>
          {mentor.linkedin_url && (
            <section>
              <a href={mentor.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">
                LinkedIn ↗
              </a>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-2 rounded-lg p-2.5">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-bold text-foreground mt-0.5">{value}</div>
    </div>
  );
}
