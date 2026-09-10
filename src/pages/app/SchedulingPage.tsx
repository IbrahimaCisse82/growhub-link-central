import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import StatCard from "@/components/shared/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format, addDays, addMonths, subMonths, startOfWeek, startOfMonth, isSameDay, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, CalendarDays, Trash2, X, Download, CalendarPlus } from "lucide-react";
import { exportToCSV } from "@/lib/exportUtils";
import { downloadICS } from "@/lib/icsExport";
import AddAvailabilityDialog from "@/components/scheduling/AddAvailabilityDialog";
import BookSlotDialog from "@/components/scheduling/BookSlotDialog";
import MonthCalendarView from "@/components/scheduling/MonthCalendarView";
import { useEvents } from "@/hooks/useEvents";

function useAvailabilitySlots() {
  return useQuery({
    queryKey: ["availability-slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_availability_slots")
        .select("*")
        .gte("start_at", new Date().toISOString())
        .order("start_at");
      if (error) throw error;
      return data;
    },
  });
}

function useMentorProfiles() {
  return useQuery({
    queryKey: ["mentor-profiles-scheduling"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_profiles")
        .select("user_id, expertise_areas, bio, availability");
      if (error) throw error;
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles_safe")
        .select("user_id, full_name")
        .in("user_id", userIds);
      return data.map(m => ({
        ...m,
        full_name: profiles?.find(p => p.user_id === m.user_id)?.full_name ?? "Mentor",
      }));
    },
  });
}

export default function SchedulingPage() {
  const { user, roles } = useAuth();
  const { data: slots, isLoading } = useAvailabilitySlots();
  const { data: mentors } = useMentorProfiles();
  const { data: events } = useEvents();
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [monthDate, setMonthDate] = useState(new Date());
  const isMentor = roles.includes("mentor");

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getMentorName = (mentorId: string) =>
    mentors?.find(m => m.user_id === mentorId)?.full_name ?? "Mentor";

  const availableSlots = slots?.filter(s => !s.is_booked && isAfter(new Date(s.start_at), new Date())) ?? [];
  const myBookings = slots?.filter(s => s.booked_by === user?.id) ?? [];
  const mySlots = isMentor ? slots?.filter(s => s.mentor_id === user?.id) ?? [] : [];

  // Cancel booking mutation
  const cancelBooking = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from("mentor_availability_slots").update({
        is_booked: false,
        booked_by: null,
        booked_at: null,
      }).eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
      toast({ title: "✓ Réservation annulée" });
    },
  });

  // Delete slot mutation (mentor only)
  const deleteSlot = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from("mentor_availability_slots").delete().eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
      toast({ title: "✓ Créneau supprimé" });
    },
  });

  // Upcoming events for calendar integration
  const upcomingEvents = useMemo(() => {
    if (!events) return [];
    return events
      .filter(e => isAfter(new Date(e.start_at), new Date()))
      .slice(0, 5);
  }, [events]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader
        title="Prise de rendez-vous"
        subtitle="Réservez un créneau avec un mentor ou gérez vos disponibilités"
        actions={
          <div className="flex items-center gap-2">
            <GhButton variant="ghost" size="sm" onClick={() => {
              const exportData = (slots ?? []).map(s => ({
                date: format(new Date(s.start_at), "yyyy-MM-dd"),
                début: format(new Date(s.start_at), "HH:mm"),
                fin: format(new Date(s.end_at), "HH:mm"),
                mentor: getMentorName(s.mentor_id),
                statut: s.is_booked ? "Réservé" : "Disponible",
              }));
              exportToCSV(exportData, `planning-${format(new Date(), "yyyy-MM-dd")}`, [
                { key: "date", label: "Date" }, { key: "début", label: "Début" }, { key: "fin", label: "Fin" },
                { key: "mentor", label: "Mentor" }, { key: "statut", label: "Statut" },
              ]);
            }}><Download size={13} className="mr-1" />CSV</GhButton>
            <GhButton variant="ghost" size="sm" onClick={() => {
              const myEvents = myBookings.map(b => ({
                uid: b.id,
                title: `Coaching avec ${getMentorName(b.mentor_id)}`,
                description: "Session de coaching réservée via Grow Hub",
                startAt: new Date(b.start_at),
                endAt: new Date(b.end_at),
              }));
              if (myEvents.length === 0) {
                toast({ title: "Aucune réservation à exporter" });
                return;
              }
              downloadICS(myEvents, `mes-rdv-${format(new Date(), "yyyy-MM-dd")}`, "Grow Hub — Mes RDV");
            }}><CalendarPlus size={13} className="mr-1" />.ics</GhButton>
            <div className="flex items-center bg-surface-2 border border-border rounded-lg p-0.5">
              <button onClick={() => setViewMode("week")} className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${viewMode === "week" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}>
                <CalendarDays size={13} className="inline mr-1" />Semaine
              </button>
              <button onClick={() => setViewMode("month")} className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${viewMode === "month" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}>
                <Calendar size={13} className="inline mr-1" />Mois
              </button>
            </div>
            {isMentor && <AddAvailabilityDialog />}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Créneaux disponibles" value={String(availableSlots.length)} note="" color="green" />
        <StatCard label="Mes réservations" value={String(myBookings.length)} note="" color="blue" />
        <StatCard label="Mentors actifs" value={String(new Set(availableSlots.map(s => s.mentor_id)).size)} note="" color="purple" />
        {isMentor && <StatCard label="Mes créneaux" value={String(mySlots.length)} note="" color="amber" />}
      </div>

      {viewMode === "month" ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <GhButton variant="ghost" size="sm" onClick={() => setMonthDate(m => subMonths(m, 1))}>← Mois précédent</GhButton>
            <GhButton variant="ghost" size="sm" onClick={() => setMonthDate(m => addMonths(m, 1))}>Mois suivant →</GhButton>
          </div>
          <MonthCalendarView currentMonth={monthDate} availableSlots={availableSlots} getMentorName={getMentorName} userId={user?.id} />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <GhButton variant="ghost" size="sm" onClick={() => setWeekOffset(p => p - 1)}>← Semaine précédente</GhButton>
            <span className="text-sm font-semibold text-foreground">
              {format(weekDays[0], "dd MMM", { locale: fr })} — {format(weekDays[6], "dd MMM yyyy", { locale: fr })}
            </span>
            <GhButton variant="ghost" size="sm" onClick={() => setWeekOffset(p => p + 1)}>Semaine suivante →</GhButton>
          </div>

          <GhCard title="Créneaux de la semaine" noPadding>
            <div className="grid grid-cols-7 border-b border-border">
              {weekDays.map(day => (
                <div key={day.toISOString()} className={`text-center py-3 text-xs font-medium border-r border-border last:border-r-0 ${isSameDay(day, new Date()) ? "bg-primary/5 text-primary" : "text-muted-foreground"}`}>
                  <div className="font-mono uppercase">{format(day, "EEE", { locale: fr })}</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">{format(day, "dd")}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[300px]">
              {weekDays.map(day => {
                const daySlots = availableSlots.filter(s => isSameDay(new Date(s.start_at), day));
                const dayEvents = upcomingEvents.filter(e => isSameDay(new Date(e.start_at), day));
                return (
                  <div key={day.toISOString()} className="border-r border-border last:border-r-0 p-2 space-y-1.5">
                    {daySlots.length === 0 && dayEvents.length === 0 && (
                      <div className="text-[10px] text-muted-foreground text-center py-4">—</div>
                    )}
                    {dayEvents.map(ev => (
                      <div key={ev.id} className="bg-gh-blue/5 border border-gh-blue/20 rounded-lg p-2 space-y-1">
                        <div className="text-[10px] font-mono text-gh-blue font-semibold">
                          {format(new Date(ev.start_at), "HH:mm")}
                        </div>
                        <div className="text-[10px] text-foreground truncate">{ev.title}</div>
                        <Pill color="blue">{ev.event_type}</Pill>
                      </div>
                    ))}
                    {daySlots.map(slot => (
                      <div key={slot.id} className="bg-primary/5 border border-primary/20 rounded-lg p-2 space-y-1">
                        <div className="text-[10px] font-mono text-primary font-semibold">
                          {format(new Date(slot.start_at), "HH:mm")} - {format(new Date(slot.end_at), "HH:mm")}
                        </div>
                        <div className="text-[10px] text-foreground truncate">{getMentorName(slot.mentor_id)}</div>
                        {slot.mentor_id !== user?.id && (
                          <BookSlotDialog slot={slot} mentorName={getMentorName(slot.mentor_id)} />
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </GhCard>
        </>
      )}

      {/* My bookings with cancel */}
      {myBookings.length > 0 && (
        <GhCard title="Mes réservations" badge={String(myBookings.length)} className="mt-5">
          <div className="space-y-2">
            {myBookings.map(b => (
              <div key={b.id} className="flex items-center justify-between bg-surface-2 rounded-lg p-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{getMentorName(b.mentor_id)}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {format(new Date(b.start_at), "EEEE dd MMM · HH:mm", { locale: fr })} — {format(new Date(b.end_at), "HH:mm")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill color="green">Confirmé</Pill>
                  <button
                    onClick={() => cancelBooking.mutate(b.id)}
                    disabled={cancelBooking.isPending}
                    className="text-muted-foreground hover:text-gh-rose transition-colors p-1 rounded-lg hover:bg-gh-rose/10"
                    title="Annuler la réservation"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GhCard>
      )}

      {/* Mentor: my slots with delete */}
      {isMentor && mySlots.length > 0 && (
        <GhCard title="Mes créneaux" badge={String(mySlots.length)} className="mt-5">
          <div className="space-y-2">
            {mySlots.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-surface-2 rounded-lg p-3">
                <div>
                  <div className="text-sm font-mono text-foreground">
                    {format(new Date(s.start_at), "EEEE dd MMM · HH:mm", { locale: fr })} — {format(new Date(s.end_at), "HH:mm")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill color={s.is_booked ? "blue" : "green"}>{s.is_booked ? "Réservé" : "Disponible"}</Pill>
                  {!s.is_booked && (
                    <button
                      onClick={() => deleteSlot.mutate(s.id)}
                      disabled={deleteSlot.isPending}
                      className="text-muted-foreground hover:text-gh-rose transition-colors p-1 rounded-lg hover:bg-gh-rose/10"
                      title="Supprimer le créneau"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GhCard>
      )}

      {isLoading && (
        <div className="space-y-3 mt-5">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      )}
    </motion.div>
  );
}
