import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarCounts } from "@/hooks/useSidebarCounts";
import { useTranslation } from "@/lib/i18n";
import logo from "@/assets/logo-growhublink.png";
import {
  LayoutDashboard, Activity, Briefcase, FolderKanban, ListChecks, Flag, CheckSquare, GanttChart,
  AlertTriangle, FileText, Settings as SettingsIcon, Filter, Triangle, CircleDot, GraduationCap,
  Users, Link2, Headphones, CalendarDays, BookOpen, ClipboardList, BarChart3, DollarSign,
  PieChart, Wallet, Store, Handshake, Diamond, MessageCircle, FolderOpen, LineChart,
  FileBarChart, Zap, LogOut, Globe, UserCog, Receipt, ShoppingCart, Target, Upload, ShieldCheck, FileLock2, Eye, Smartphone, HeartPulse, KeyRound, Calculator, ChevronDown, type LucideIcon
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  badgeKey?: string;
  badgeType?: "default" | "alert" | "new";
  children?: { label: string; path: string }[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
}

function useNavGroups() {
  const { t } = useTranslation();
  const navGroups: NavGroup[] = [
    {
      label: t("nav.overview"),
      items: [
        { label: t("nav.dashboard"), icon: LayoutDashboard, path: "/app/dashboard" },
        { label: t("nav.activities"), icon: Activity, path: "/app/activites", badgeKey: "activities", badgeType: "new" },
      ],
    },
    {
      label: t("nav.projectMgmt"),
      items: [
        { label: t("nav.portfolios"), icon: Briefcase, path: "/app/portefeuilles" },
        { label: t("nav.programs"), icon: FolderKanban, path: "/app/programmes" },
        { label: t("nav.projects"), icon: ListChecks, path: "/app/projets" },
        { label: t("nav.milestones"), icon: Flag, path: "/app/jalons" },
        { label: t("nav.tasks"), icon: CheckSquare, path: "/app/taches" },
        { label: t("nav.gantt"), icon: GanttChart, path: "/app/gantt" },
        { label: t("nav.risks"), icon: AlertTriangle, path: "/app/risques", badgeKey: "openRisks", badgeType: "alert" },
      ],
    },
    {
      label: t("nav.acceleration"),
      items: [
        { label: t("nav.applications"), icon: FileText, path: "/app/candidatures", badgeKey: "pendingApps", badgeType: "alert" },
        { label: "Funnel Builder", icon: Filter, path: "/app/funnel-builder" },
        { label: t("nav.startups"), icon: Triangle, path: "/app/entreprises", badgeKey: "startups" },
        { label: t("nav.cohorts"), icon: CircleDot, path: "/app/cohortes", badgeKey: "activeCohorts" },
        { label: t("nav.alumni"), icon: GraduationCap, path: "/app/alumni" },
      ],
    },
    {
      label: t("nav.support"),
      items: [
        { label: t("nav.mentors"), icon: Users, path: "/app/mentors" },
        { label: t("nav.matching"), icon: Link2, path: "/app/matching" },
        { label: t("nav.coaching"), icon: Headphones, path: "/app/coaching" },
        { label: t("nav.scheduling"), icon: CalendarDays, path: "/app/rdv" },
        { label: t("nav.lms"), icon: BookOpen, path: "/app/lms" },
        { label: t("nav.surveys"), icon: ClipboardList, path: "/app/enquetes" },
        { label: t("nav.dataCollection"), icon: BarChart3, path: "/app/collecte-donnees" },
      ],
    },
    {
      label: t("nav.funding"),
      items: [
        { label: t("nav.grants"), icon: DollarSign, path: "/app/grants" },
        { label: t("nav.grantsAnalytics"), icon: PieChart, path: "/app/grants-analytics" },
        { label: t("nav.budgets"), icon: Wallet, path: "/app/budgets" },
        { label: "Trésorerie", icon: LineChart, path: "/app/finance/tresorerie" },
        { label: "Cap Table", icon: PieChart, path: "/app/finance/cap-table" },
      ],
    },
    {
      label: t("nav.network"),
      items: [
        { label: t("nav.marketplace"), icon: Store, path: "/app/marketplace" },
        { label: t("nav.partners"), icon: Handshake, path: "/app/partenaires" },
        { label: t("nav.events"), icon: Diamond, path: "/app/evenements" },
        { label: t("nav.messaging"), icon: MessageCircle, path: "/app/messagerie", badgeKey: "unreadNotifs", badgeType: "alert" },
        { label: t("nav.resources"), icon: FolderOpen, path: "/app/ressources" },
      ],
    },
    {
      label: t("nav.management") || "Management",
      items: [
        { label: "RH & Paie", icon: UserCog, path: "/app/rh" },
        { label: "CRM & Facturation", icon: Receipt, path: "/app/crm" },
        { label: "Bons de commande", icon: ShoppingCart, path: "/app/bons-de-commande" },
        {
          label: "Comptabilité", icon: Calculator, path: "/app/comptabilite",
          children: [
            { label: "Plan comptable", path: "/app/comptabilite/plan" },
            { label: "Journaux", path: "/app/comptabilite/journaux" },
            { label: "Saisie d'écritures", path: "/app/comptabilite/ecritures" },
            { label: "Grand livre", path: "/app/comptabilite/grand-livre" },
            { label: "Balance", path: "/app/comptabilite/balance" },
            { label: "Lettrage", path: "/app/comptabilite/lettrage" },
            { label: "États financiers", path: "/app/comptabilite/etats" },
            { label: "Exercices & clôture", path: "/app/comptabilite/exercices" },
          ],
        },
      ],
    },
    {
      label: t("nav.insights"),
      items: [
        { label: t("nav.analytics"), icon: LineChart, path: "/app/analytics" },
        { label: "Impact ODD", icon: Target, path: "/app/analytics/impact" },
        { label: "Suivi-Évaluation", icon: Activity, path: "/app/me" },
        { label: "Rapports bailleurs", icon: FileBarChart, path: "/app/rapports/bailleurs" },
        { label: "Collecte terrain", icon: Smartphone, path: "/app/terrain" },
      ],
    },

    {
      label: t("nav.insightsAdmin"),
      adminOnly: true,
      items: [
        { label: t("nav.reports"), icon: FileBarChart, path: "/app/rapports" },
        { label: "AfriDataHub", icon: Globe, path: "/app/afridatahub" },

      ],
    },
    {
      label: t("nav.admin"),
      adminOnly: true,
      items: [
        { label: t("nav.users"), icon: Users, path: "/app/utilisateurs", badgeType: "alert" },
        { label: t("nav.webhooks"), icon: Zap, path: "/app/webhooks" },
        { label: "Bus d'événements", icon: Activity, path: "/app/events" },
        { label: "Import de données", icon: Upload, path: "/app/parametres/import" },
        { label: "Registre RGPD", icon: FileLock2, path: "/app/parametres/conformite" },
        { label: "Audit PII", icon: Eye, path: "/app/parametres/audit-pii" },
        { label: "Santé système", icon: HeartPulse, path: "/app/admin/system-health" },
        { label: "Clés API", icon: KeyRound, path: "/app/admin/api-keys" },

      ],
    },
    {
      label: "Compte",
      items: [
        { label: "Sécurité (2FA)", icon: ShieldCheck, path: "/app/parametres/securite" },
      ],
    },
  ];
  return navGroups;
}

const badgeClasses: Record<string, string> = {
  default: "bg-surface-3 text-muted-foreground",
  alert: "bg-destructive/15 text-destructive",
  new: "bg-primary/15 text-primary",
};

interface AppSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

/** Chemins autorisés par persona (null = tout autorisé). */
const PERSONA_ALLOWED_PATHS: Record<string, string[] | null> = {
  super_admin: null,
  coordinator: null,
  project_manager: [
    "/app/dashboard", "/app/activites",
    "/app/portefeuilles", "/app/programmes", "/app/projets", "/app/jalons",
    "/app/taches", "/app/gantt", "/app/risques",
    "/app/budgets", "/app/grants", "/app/grants-analytics",
    "/app/cohortes", "/app/entreprises", "/app/candidatures",
    "/app/rdv", "/app/messagerie", "/app/ressources",
    "/app/analytics", "/app/analytics/impact", "/app/rapports", "/app/me", "/app/terrain",
    "/app/parametres/securite",
  ],
  consultant: [
    "/app/dashboard", "/app/activites",
    "/app/coaching", "/app/rdv", "/app/mentors", "/app/matching",
    "/app/entreprises", "/app/cohortes",
    "/app/lms", "/app/ressources", "/app/messagerie",
    "/app/evenements",
    "/app/parametres/securite",
  ],
  entrepreneur: [
    "/app/dashboard", "/app/activites",
    "/app/entreprises", "/app/cohortes",
    "/app/coaching", "/app/rdv", "/app/mentors",
    "/app/lms", "/app/enquetes", "/app/ressources",
    "/app/marketplace", "/app/evenements", "/app/messagerie",
    "/app/parametres/securite",
  ],
  funder: [
    "/app/dashboard",
    "/app/portefeuilles", "/app/programmes", "/app/projets",
    "/app/grants", "/app/grants-analytics", "/app/budgets",
    "/app/analytics", "/app/analytics/impact", "/app/rapports", "/app/rapports/bailleurs", "/app/me", "/app/terrain",
    "/app/messagerie", "/app/ressources",
    "/app/parametres/securite",
  ],
  staff: [
    "/app/dashboard", "/app/activites",
    "/app/rh", "/app/crm", "/app/bons-de-commande", "/app/comptabilite",
    "/app/ressources", "/app/messagerie",
    "/app/evenements", "/app/partenaires",
    "/app/parametres/securite",
  ],
  user: ["/app/dashboard", "/app/profil", "/app/parametres/securite"],
};

export default function AppSidebar({ mobile, onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, isAdmin, persona, signOut } = useAuth();
  const { t } = useTranslation();
  const { data: counts } = useSidebarCounts();
  const navGroups = useNavGroups();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const initials = profile?.full_name ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "??";
  const mainRole = profile?.job_title || roles[0] || persona;
  const allowedPaths = PERSONA_ALLOWED_PATHS[persona] ?? null;

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const getBadge = (item: NavItem): string | undefined => {
    if (!item.badgeKey || !counts) return undefined;
    const val = counts[item.badgeKey as keyof typeof counts];
    return val && val > 0 ? String(val) : undefined;
  };

  return (
    <aside className={mobile
      ? "w-full h-full bg-card flex flex-col scrollbar-hidden overflow-y-auto"
      : "fixed left-0 top-0 bottom-0 w-[240px] bg-card border-r border-border flex flex-col z-[200] scrollbar-hidden overflow-y-auto"
    }>
      <div className="px-[18px] py-[22px] border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Grow Hub Management System" className="h-8 w-auto" />
        </div>
      </div>

      <nav className="p-3 flex-1">
        {navGroups.map((group) => {
          if (group.adminOnly && !isAdmin) return null;
          // Filtrage par persona : on garde uniquement les items autorisés
          const visibleItems = allowedPaths === null
            ? group.items
            : group.items.filter((it) => allowedPaths.includes(it.path));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="mb-5">
              <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground px-2 mb-1">
                {group.label}
              </div>
              {visibleItems.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                const badge = getBadge(item);
                const Icon = item.icon;
                if (item.children) {
                  const isOpen = openMenus[item.path] ?? isActive;
                  return (
                    <div key={item.path}>
                      <button
                        onClick={() => setOpenMenus({ ...openMenus, [item.path]: !isOpen })}
                        aria-expanded={isOpen}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] font-medium mb-0.5 transition-all select-none ${isActive ? "text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"}`}
                      >
                        <Icon size={15} className="flex-shrink-0" />
                        <span>{item.label}</span>
                        <ChevronDown size={13} className={`ml-auto transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                      </button>
                      {isOpen && (
                        <div className="ml-4 pl-2 border-l border-border mb-1">
                          {item.children.map((c) => {
                            const active = location.pathname === c.path;
                            return (
                              <button key={c.path} onClick={() => handleNav(c.path)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-md text-[12px] mb-0.5 ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"}`}>
                                {c.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] font-medium mb-0.5 transition-all relative select-none
                      ${isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                      }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r" />
                    )}
                    <Icon size={15} className="flex-shrink-0" />
                    <span>{item.label}</span>
                    {badge && (
                      <span className={`ml-auto font-mono text-[10px] px-1.5 py-px rounded-full ${badgeClasses[item.badgeType || "default"]}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface-2 cursor-pointer transition-colors" onClick={() => handleNav("/app/profil")}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-bold text-foreground flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">{profile?.full_name || "Utilisateur"}</div>
            <div className="font-mono text-[9px] text-muted-foreground mt-px">{mainRole}</div>
          </div>
        </div>
        <div className="flex gap-1 mt-1">
          <button onClick={() => handleNav("/app/parametres")} className="flex-1 px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors text-left flex items-center gap-1.5">
            <SettingsIcon size={12} /> Paramètres
          </button>
          <button onClick={signOut} className="flex-1 px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors text-left flex items-center gap-1.5">
            <LogOut size={12} /> {t("nav.logout")}
          </button>
        </div>
      </div>
    </aside>
  );
}
