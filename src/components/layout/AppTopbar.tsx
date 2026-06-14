import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllRead } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import GlobalSearchDialog from "./GlobalSearchDialog";
import { useTheme } from "@/hooks/useTheme";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation, LOCALE_LABELS, LOCALE_FLAGS, type Locale } from "@/lib/i18n";
import OfflineIndicator from "@/components/shared/OfflineIndicator";

const pageTitles: Record<string, string> = {
  "/app/dashboard": "Dashboard",
  "/app/activites": "Activités",
  "/app/portefeuilles": "Portefeuilles",
  "/app/programmes": "Programmes",
  "/app/cohortes": "Cohortes",
  "/app/entreprises": "Entreprises",
  "/app/candidatures": "Candidatures",
  "/app/mentors": "Mentors",
  "/app/coaching": "Coaching & Sessions",
  "/app/lms": "LMS & Formation",
  "/app/projets": "Projets & Tâches",
  "/app/gantt": "Gantt",
  "/app/risques": "Risques",
  "/app/grants": "Grants & Subventions",
  "/app/budgets": "Budgets",
  "/app/evenements": "Événements",
  "/app/messagerie": "Messagerie",
  "/app/ressources": "Ressources",
  "/app/analytics": "Analytics",
  "/app/rapports": "Rapports",
  "/app/utilisateurs": "Utilisateurs",
  "/app/profil": "Mon profil",
  "/app/collecte-donnees": "Collecte de données",
  "/app/webhooks": "Intégrations & Webhooks",
};

interface AppTopbarProps {
  onToggleSidebar?: () => void;
  showMenuButton?: boolean;
}

export default function AppTopbar({ onToggleSidebar, showMenuButton }: AppTopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const title = pageTitles[location.pathname] || "Dashboard";
  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();

  return (
    <>
      <div className="h-14 bg-card/90 backdrop-blur-xl border-b border-border px-4 md:px-7 flex items-center justify-between sticky top-0 z-[100] flex-shrink-0">
        <div className="flex items-center gap-3">
          {showMenuButton && (
            <button onClick={onToggleSidebar} className="p-2 rounded-lg hover:bg-secondary text-foreground transition-colors md:hidden">
              ☰
            </button>
          )}
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span>GrowHub</span>
            <span>›</span>
            <span className="text-foreground/70">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex bg-secondary border border-border rounded-lg px-3 py-[7px] font-body text-[12.5px] text-muted-foreground outline-none transition-colors hover:border-primary/50 w-[180px] md:w-[220px] text-left"
          >
            🔍 {t("common.search")} <span className="font-mono text-[10px] ml-2 opacity-50">⌘K</span>
          </button>
          <button onClick={() => setSearchOpen(true)} className="sm:hidden bg-secondary border border-border text-muted-foreground p-[7px] w-[34px] h-[34px] rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-sm">🔍</button>

          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="bg-secondary border border-border text-muted-foreground p-[7px] w-[34px] h-[34px] rounded-lg flex items-center justify-center hover:bg-muted hover:text-foreground transition-colors text-sm">
                {LOCALE_FLAGS[locale]}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card border-border" align="end">
              {(Object.keys(LOCALE_LABELS) as Locale[]).map(l => (
                <DropdownMenuItem key={l} onClick={() => setLocale(l)} className={`cursor-pointer text-foreground hover:bg-secondary ${locale === l ? "bg-primary/10" : ""}`}>
                  <span className="mr-2">{LOCALE_FLAGS[l]}</span> {LOCALE_LABELS[l]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Offline / sync indicator */}
          <OfflineIndicator />

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="bg-secondary border border-border text-muted-foreground p-[7px] w-[34px] h-[34px] rounded-lg flex items-center justify-center hover:bg-muted hover:text-foreground transition-colors text-sm">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative bg-secondary border border-border text-muted-foreground p-[7px] w-[34px] h-[34px] rounded-lg flex items-center justify-center hover:bg-muted hover:text-foreground transition-colors text-sm">
                🔔
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute top-1 right-1 w-[8px] h-[8px] bg-destructive rounded-full border-[1.5px] border-card" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 bg-card border-border" align="end">
              <div className="px-4 py-3 border-b border-border flex justify-between items-center">
                <span className="text-sm font-bold text-foreground">Notifications</span>
                {(unreadCount ?? 0) > 0 && (
                  <button onClick={() => markAll.mutate()} className="text-[11px] text-primary hover:underline">Tout marquer lu</button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {!notifications || notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Aucune notification</div>
                ) : notifications.map(n => (
                  <div key={n.id} onClick={() => { if (!n.is_read) markRead.mutate(n.id); if (n.link) navigate(n.link); }}
                    className={`px-4 py-2.5 border-b border-border cursor-pointer hover:bg-secondary transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}>
                    <div className="text-[12px] font-medium text-foreground">{n.title}</div>
                    {n.content && <div className="text-[11px] text-muted-foreground mt-0.5">{n.content}</div>}
                    <div className="font-mono text-[9px] text-muted-foreground mt-1">{format(new Date(n.created_at), "dd MMM HH:mm", { locale: fr })}</div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Quick create */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg font-body text-xs font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all">
                + <span className="hidden sm:inline">Nouveau</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card border-border" align="end">
              {[
                { label: "Portefeuille", path: "/app/portefeuilles", icon: "◈" },
                { label: "Programme", path: "/app/programmes", icon: "◇" },
                { label: "Cohorte", path: "/app/cohortes", icon: "◉" },
                { label: "Entreprise", path: "/app/entreprises", icon: "△" },
                { label: "Projet", path: "/app/projets", icon: "▦" },
                { label: "Événement", path: "/app/evenements", icon: "◆" },
              ].map(a => (
                <DropdownMenuItem key={a.path} onClick={() => navigate(a.path)} className="cursor-pointer text-foreground hover:bg-secondary">
                  <span className="mr-2">{a.icon}</span> {a.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
