import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GhButton from "@/components/shared/GhButton";
import { useAuth, type Persona } from "@/hooks/useAuth";
import {
  CheckCircle, Rocket, Users, BarChart3, MessageCircle, FolderKanban, Headphones,
  DollarSign, BookOpen, Triangle, UserCog, type LucideIcon,
} from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
  tips: string[];
}

const COMMON_INTRO: Step = {
  icon: Rocket,
  title: "Bienvenue sur Grow Hub Management System",
  description: "Votre plateforme tout-en-un pour gérer programmes d'accélération, cohortes, entreprises et accompagnement.",
  tips: [
    "Naviguez grâce au menu latéral pour accéder à vos modules",
    "Utilisez ⌘K pour rechercher rapidement",
    "Cliquez sur votre avatar pour accéder à votre profil",
  ],
};

const STEPS_BY_PERSONA: Record<Persona, Step[]> = {
  super_admin: [
    COMMON_INTRO,
    {
      icon: Users,
      title: "Pilotez la plateforme",
      description: "En tant que Super-Admin, vous gérez utilisateurs, rôles, programmes et paramètres globaux.",
      tips: [
        "Module Utilisateurs : invitez, approuvez et assignez des rôles scopés",
        "Module Webhooks : connectez Grow Hub à vos outils externes",
        "Paramètres : configurez l'organisation, l'email, les paramètres RH",
      ],
    },
    {
      icon: BarChart3,
      title: "Suivez la performance globale",
      description: "Tableaux de bord, KPIs consolidés et rapports cross-modules.",
      tips: [
        "Dashboard : vue 360° sur tous les portefeuilles",
        "AfriDataHub : benchmarks sectoriels et données macro",
        "Rapports : exports PDF/Excel personnalisables",
      ],
    },
  ],
  coordinator: [
    COMMON_INTRO,
    {
      icon: FolderKanban,
      title: "Coordonnez vos programmes",
      description: "Vous orchestrez programmes, cohortes et chefs de projet.",
      tips: [
        "Hiérarchie : Portefeuille → Programme → Projet → Cohorte → Entreprise",
        "Assignez des chefs de projet à chaque projet",
        "Validez budgets et grants avant lancement",
      ],
    },
    {
      icon: MessageCircle,
      title: "Animez la communauté",
      description: "Coaching, événements, messagerie et matching mentor↔entreprise.",
      tips: [
        "Le matching utilise l'algorithme 35/25/20/20",
        "Coaching : planifiez et suivez les sessions",
        "Événements : organisez démo days et masterclass",
      ],
    },
  ],
  project_manager: [
    COMMON_INTRO,
    {
      icon: FolderKanban,
      title: "Gérez vos projets",
      description: "Vous pilotez vos projets PAERID au quotidien : jalons, tâches, risques, budget.",
      tips: [
        "Wizard PAERID en 11 étapes pour structurer un nouveau projet",
        "Jalons et tâches assignables à votre équipe",
        "Suivi du budget vs réalisé via la nomenclature Enabel A32",
      ],
    },
    {
      icon: BarChart3,
      title: "Anticipez les risques",
      description: "Matrice des risques, alertes automatiques sur jalons en retard et dépassements budgétaires.",
      tips: [
        "Module Risques : matrice probabilité × impact",
        "Gantt : visualisez les dépendances entre activités",
        "Rapports d'avancement exportables pour les bailleurs",
      ],
    },
  ],
  consultant: [
    COMMON_INTRO,
    {
      icon: Headphones,
      title: "Accompagnez vos entreprises",
      description: "Mentor, expert ou coach : suivez vos sessions et les entreprises qui vous sont rattachées.",
      tips: [
        "Module Coaching : enregistrez les sessions et notes",
        "Module RDV : gérez vos disponibilités et réservations",
        "Évaluations bidirectionnelles après chaque session",
      ],
    },
    {
      icon: BookOpen,
      title: "Partagez votre expertise",
      description: "Bibliothèque de ressources, LMS et messagerie pour fluidifier l'accompagnement.",
      tips: [
        "LMS : créez ou suivez des cours pour vos entreprises",
        "Ressources : mutualisez templates et documents",
        "Messagerie : threads dédiés par entreprise",
      ],
    },
  ],
  entrepreneur: [
    COMMON_INTRO,
    {
      icon: Triangle,
      title: "Pilotez votre entreprise",
      description: "Renseignez votre fiche entreprise, KPIs et livrables attendus dans la cohorte.",
      tips: [
        "Fiche entreprise : présentez votre projet, équipe et traction",
        "KPIs : déclarez vos indicateurs clés mensuels",
        "Documents : déposez vos livrables et rapports",
      ],
    },
    {
      icon: Headphones,
      title: "Profitez de l'accompagnement",
      description: "Coaching, formations et événements pour faire grandir votre entreprise.",
      tips: [
        "Réservez vos sessions avec mentors via le module RDV",
        "Suivez les cours du LMS de votre programme",
        "Participez aux événements et démo days",
      ],
    },
  ],
  funder: [
    COMMON_INTRO,
    {
      icon: DollarSign,
      title: "Suivez vos financements",
      description: "Vue lecture seule sur les grants et projets que vous financez.",
      tips: [
        "Dashboard : engagement, décaissement et taux de consommation",
        "Module Grants : détail par convention de financement",
        "Analytics : indicateurs d'impact agrégés",
      ],
    },
    {
      icon: BarChart3,
      title: "Recevez vos rapports",
      description: "Rapports périodiques, indicateurs IRIS+ et exports formats bailleurs (Enabel, AFD, UE).",
      tips: [
        "Rapports : téléchargez les rapports d'activité et financiers",
        "Notifications par email à chaque jalon clé",
        "Contact direct via la messagerie intégrée",
      ],
    },
  ],
  staff: [
    COMMON_INTRO,
    {
      icon: UserCog,
      title: "Vos modules métier",
      description: "Selon votre département : RH, CRM, Achats, Communication, Documents.",
      tips: [
        "RH & Paie : gestion employés, contrats, bulletins (paie sénégalaise)",
        "CRM : devis, factures, recouvrement",
        "Bons de commande : workflow d'achats validés",
      ],
    },
    {
      icon: MessageCircle,
      title: "Collaborez avec l'équipe",
      description: "Messagerie, ressources partagées et événements internes.",
      tips: [
        "Threads par projet ou par département",
        "Ressources : politique interne, modèles de documents",
        "Calendrier événements : démo days, AG, formations",
      ],
    },
  ],
  user: [COMMON_INTRO],
};

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { profile, persona } = useAuth();
  const steps = STEPS_BY_PERSONA[persona] ?? STEPS_BY_PERSONA.user;
  const step = steps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <div className="flex gap-1 px-6 pt-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${i <= currentStep ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Icon size={28} className="text-primary" />
              </div>
              {currentStep === 0 && profile?.full_name && (
                <div className="text-sm text-muted-foreground mb-1">
                  Bonjour {profile.full_name.split(" ")[0]}
                </div>
              )}
              <h2 className="text-lg font-bold text-foreground">{step.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{step.description}</p>
            </div>

            <div className="space-y-2.5 mb-6">
              {step.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-surface-2 rounded-lg p-3">
                  <CheckCircle size={14} className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-[12.5px] text-foreground">{tip}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground font-mono">
                {currentStep + 1} / {steps.length}
              </div>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <GhButton variant="ghost" size="md" onClick={() => setCurrentStep((s) => s - 1)}>
                    Précédent
                  </GhButton>
                )}
                {!isLast && (
                  <GhButton variant="ghost" size="md" onClick={onComplete}>
                    Passer
                  </GhButton>
                )}
                <GhButton
                  variant="primary"
                  size="md"
                  onClick={() => (isLast ? onComplete() : setCurrentStep((s) => s + 1))}
                >
                  {isLast ? "Commencer →" : "Suivant →"}
                </GhButton>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
