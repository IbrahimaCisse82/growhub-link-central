import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCog, Receipt, ShoppingCart, FolderOpen, MessageCircle, Diamond } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import SectionHeader from "@/components/shared/SectionHeader";
import { useAuth } from "@/hooks/useAuth";
import { useHrEmployees } from "@/hooks/useHrEmployees";
import { useEvents } from "@/hooks/useEvents";

/** Dashboard contextuel pour le Staff Grow Hub (employés non-managériaux). */
export default function StaffDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { employees } = useHrEmployees();
  const { data: events } = useEvents();

  const upcomingEvents = (events ?? []).filter((e) => new Date(e.start_at) >= new Date()).slice(0, 4);
  const dept = profile?.department ?? "Non défini";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <SectionHeader
        title={`Bonjour ${profile?.full_name?.split(" ")[0] ?? ""}`}
        subtitle={`Espace Staff · ${dept}${profile?.job_title ? ` · ${profile.job_title}` : ""}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <div onClick={() => navigate("/app/rh")} className="cursor-pointer">
          <StatCard label="Effectif Grow Hub" value={String(employees.filter((e) => e.is_active).length)} note="" icon={<UserCog size={20} />} color="blue" />
        </div>
        <div onClick={() => navigate("/app/crm")} className="cursor-pointer">
          <StatCard label="Module CRM" value="Accès" note="" icon={<Receipt size={20} />} color="purple" />
        </div>
        <div onClick={() => navigate("/app/bons-de-commande")} className="cursor-pointer">
          <StatCard label="Bons de commande" value="Accès" note="" icon={<ShoppingCart size={20} />} color="amber" />
        </div>
        <div onClick={() => navigate("/app/ressources")} className="cursor-pointer">
          <StatCard label="Ressources" value="Accès" note="" icon={<FolderOpen size={20} />} color="green" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <GhCard title="Mes outils">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "RH & Paie", path: "/app/rh", icon: UserCog },
              { label: "CRM & Facturation", path: "/app/crm", icon: Receipt },
              { label: "Bons de commande", path: "/app/bons-de-commande", icon: ShoppingCart },
              { label: "Ressources", path: "/app/ressources", icon: FolderOpen },
              { label: "Messagerie", path: "/app/messagerie", icon: MessageCircle },
              { label: "Événements", path: "/app/evenements", icon: Diamond },
            ].map((it) => (
              <button
                key={it.path}
                onClick={() => navigate(it.path)}
                className="flex items-center gap-2.5 py-3 px-3 rounded-lg bg-secondary hover:bg-surface-3 text-left transition-colors"
              >
                <it.icon size={16} className="text-primary" />
                <span className="text-[12.5px] font-medium text-foreground">{it.label}</span>
              </button>
            ))}
          </div>
        </GhCard>

        <div className="flex flex-col gap-4">
          {upcomingEvents.length > 0 && (
            <GhCard title="Événements à venir" action={<GhButton variant="ghost" onClick={() => navigate("/app/evenements")}>Voir tout</GhButton>}>
              <div className="flex flex-col gap-2">
                {upcomingEvents.map((e) => {
                  const d = new Date(e.start_at);
                  return (
                    <div key={e.id} className="flex items-center gap-2.5 py-1.5">
                      <div className="text-center flex-shrink-0 w-[36px] bg-secondary rounded-md py-1.5 px-1 border border-border">
                        <div className="font-mono text-sm font-bold text-foreground leading-none">{d.getDate()}</div>
                        <div className="font-mono text-[8px] text-muted-foreground uppercase mt-0.5">
                          {d.toLocaleDateString("fr-FR", { month: "short" })}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-foreground truncate">{e.title}</div>
                        <div className="text-[10px] text-muted-foreground">{e.location ?? (e.is_online ? "En ligne" : "—")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GhCard>
          )}
        </div>
      </div>
    </motion.div>
  );
}
