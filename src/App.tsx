import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { I18nProvider } from "@/lib/i18n";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import AppLayout from "@/components/layout/AppLayout";
import PWAInstallPrompt from "@/components/shared/PWAInstallPrompt";
import KeyboardShortcutsProvider from "@/components/shared/KeyboardShortcutsProvider";
import { CookieConsentProvider } from "@/hooks/useCookieConsent";
import CookieConsentBanner from "@/components/security/CookieConsentBanner";
import { lazy, Suspense } from "react";

// Auth pages (small, loaded eagerly)
import LoginPage from "@/pages/auth/LoginPage";
// SignupPage removed — access by invitation only
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

// App pages (lazy loaded for performance)
const DashboardPage = lazy(() => import("@/pages/app/DashboardPage"));
const PortfoliosPage = lazy(() => import("@/pages/app/PortfoliosPage"));
const PortfolioDetailPage = lazy(() => import("@/pages/app/PortfolioDetailPage"));
const ProgrammesPage = lazy(() => import("@/pages/app/ProgrammesPage"));
const ProgramDetailPage = lazy(() => import("@/pages/app/ProgramDetailPage"));
const CohortesPage = lazy(() => import("@/pages/app/CohortesPage"));
const CohortDetailPage = lazy(() => import("@/pages/app/CohortDetailPage"));
const StartupsPage = lazy(() => import("@/pages/app/StartupsPage"));
const StartupDetailPage = lazy(() => import("@/pages/app/StartupDetailPage"));
const CandidaturesPage = lazy(() => import("@/pages/app/CandidaturesPage"));
const MentorsPage = lazy(() => import("@/pages/app/MentorsPage"));
const CoachingPage = lazy(() => import("@/pages/app/CoachingPage"));
const LmsPage = lazy(() => import("@/pages/app/LmsPage"));
const ProjetsPage = lazy(() => import("@/pages/app/ProjetsPage"));
const ProjetDetailPage = lazy(() => import("@/pages/app/ProjetDetailPage"));
const JalonsPage = lazy(() => import("@/pages/app/JalonsPage"));
const TachesPage = lazy(() => import("@/pages/app/TachesPage"));
const ProjectWizardPage = lazy(() => import("@/pages/app/ProjectWizardPage"));
const GanttPage = lazy(() => import("@/pages/app/GanttPage"));
const RisquesPage = lazy(() => import("@/pages/app/RisquesPage"));
const GrantsPage = lazy(() => import("@/pages/app/GrantsPage"));
const GrantDetailPage = lazy(() => import("@/pages/app/GrantDetailPage"));
const GrantsAnalyticsPage = lazy(() => import("@/pages/app/GrantsAnalyticsPage"));
const BudgetsPage = lazy(() => import("@/pages/app/BudgetsPage"));
const EvenementsPage = lazy(() => import("@/pages/app/EvenementsPage"));
const MessagingPage = lazy(() => import("@/pages/app/MessagingPage"));
const ResourcesPage = lazy(() => import("@/pages/app/ResourcesPage"));
const AnalyticsPage = lazy(() => import("@/pages/app/AnalyticsPage"));
const ImpactPage = lazy(() => import("@/pages/app/ImpactPage"));
const AfriDataHubPage = lazy(() => import("@/pages/app/AfriDataHubPage"));
const RapportsPage = lazy(() => import("@/pages/app/RapportsPage"));
const UsersPage = lazy(() => import("@/pages/app/UsersPage"));
const ProfilePage = lazy(() => import("@/pages/app/ProfilePage"));
const ActivitesPage = lazy(() => import("@/pages/app/ActivitesPage"));
const PartnersPage = lazy(() => import("@/pages/app/PartnersPage"));
const SurveysPage = lazy(() => import("@/pages/app/SurveysPage"));
const AlumniPage = lazy(() => import("@/pages/app/AlumniPage"));
const DataCollectionPage = lazy(() => import("@/pages/app/DataCollectionPage"));
const WebhooksPage = lazy(() => import("@/pages/app/WebhooksPage"));
const MarketplacePage = lazy(() => import("@/pages/app/MarketplacePage"));
const SchedulingPage = lazy(() => import("@/pages/app/SchedulingPage"));
const SettingsPage = lazy(() => import("@/pages/app/SettingsPage"));
const ImportPage = lazy(() => import("@/pages/app/ImportPage"));
const SecurityPage = lazy(() => import("@/pages/app/SecurityPage"));
const TreasuryPage = lazy(() => import("@/pages/app/TreasuryPage"));
const CapTablePage = lazy(() => import("@/pages/app/CapTablePage"));
const CompliancePage = lazy(() => import("@/pages/app/CompliancePage"));
const PiiAuditPage = lazy(() => import("@/pages/app/PiiAuditPage"));
const MePage = lazy(() => import("@/pages/app/MePage"));
const DonorReportsPage = lazy(() => import("@/pages/app/DonorReportsPage"));
const FieldCollectionPage = lazy(() => import("@/pages/app/FieldCollectionPage"));
const SystemHealthPage = lazy(() => import("@/pages/app/SystemHealthPage"));
const MatchingPage = lazy(() => import("@/pages/app/MatchingPage"));
const ApiKeysPage = lazy(() => import("@/pages/app/ApiKeysPage"));

const EventDetailPage = lazy(() => import("@/pages/app/EventDetailPage"));
const FunnelBuilderPage = lazy(() => import("@/pages/app/FunnelBuilderPage"));
const HrPage = lazy(() => import("@/pages/app/HrPage"));
const CrmPage = lazy(() => import("@/pages/app/CrmPage"));
const PurchaseOrdersPage = lazy(() => import("@/pages/app/PurchaseOrdersPage"));
const EventsPage = lazy(() => import("@/pages/app/EventsPage"));
const PublicApplicationPage = lazy(() => import("@/pages/public/PublicApplicationPage"));
const UnsubscribePage = lazy(() => import("@/pages/public/UnsubscribePage"));
const PrivacyPolicyPage = lazy(() => import("@/pages/public/PrivacyPolicyPage"));
const LegalNoticePage = lazy(() => import("@/pages/public/LegalNoticePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min — data stays fresh, no refetch on navigation
      gcTime: 1000 * 60 * 5,    // 5 min cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CookieConsentProvider>
          <KeyboardShortcutsProvider>
            <PWAInstallPrompt />
            <CookieConsentBanner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<Navigate to="/login" replace />} />
              <Route path="/postuler" element={<PublicApplicationPage />} />
              <Route path="/unsubscribe" element={<UnsubscribePage />} />
              <Route path="/politique-confidentialite" element={<PrivacyPolicyPage />} />
              <Route path="/mentions-legales" element={<LegalNoticePage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="activites" element={<ActivitesPage />} />
                <Route path="portefeuilles" element={<PortfoliosPage />} />
                <Route path="portefeuilles/:id" element={<PortfolioDetailPage />} />
                <Route path="programmes" element={<ProgrammesPage />} />
                <Route path="programmes/:id" element={<ProgramDetailPage />} />
                <Route path="cohortes" element={<CohortesPage />} />
                <Route path="cohortes/:id" element={<CohortDetailPage />} />
                <Route path="entreprises" element={<StartupsPage />} />
                <Route path="entreprises/:id" element={<StartupDetailPage />} />
                <Route path="candidatures" element={<CandidaturesPage />} />
                <Route path="mentors" element={<MentorsPage />} />
                <Route path="coaching" element={<CoachingPage />} />
                <Route path="rdv" element={<SchedulingPage />} />
                <Route path="matching" element={<MatchingPage />} />
                <Route path="lms" element={<LmsPage />} />
                <Route path="projets" element={<ProjetsPage />} />
                <Route path="projets/nouveau" element={<ProjectWizardPage />} />
                <Route path="projets/:id" element={<ProjetDetailPage />} />
                <Route path="jalons" element={<JalonsPage />} />
                <Route path="taches" element={<TachesPage />} />
                <Route path="gantt" element={<GanttPage />} />
                <Route path="risques" element={<RisquesPage />} />
                <Route path="grants" element={<GrantsPage />} />
                <Route path="grants/:id" element={<GrantDetailPage />} />
                <Route path="grants-analytics" element={<GrantsAnalyticsPage />} />
                <Route path="budgets" element={<BudgetsPage />} />
                <Route path="evenements" element={<EvenementsPage />} />
                <Route path="evenements/:id" element={<EventDetailPage />} />
                <Route path="funnel-builder" element={<AdminRoute><FunnelBuilderPage /></AdminRoute>} />
                <Route path="messagerie" element={<MessagingPage />} />
                <Route path="ressources" element={<ResourcesPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="analytics/impact" element={<ImpactPage />} />
                <Route path="afridatahub" element={<AdminRoute><AfriDataHubPage /></AdminRoute>} />
                <Route path="rapports" element={<AdminRoute><RapportsPage /></AdminRoute>} />
                <Route path="partenaires" element={<PartnersPage />} />
                <Route path="enquetes" element={<SurveysPage />} />
                <Route path="alumni" element={<AlumniPage />} />
                <Route path="collecte-donnees" element={<DataCollectionPage />} />
                <Route path="marketplace" element={<MarketplacePage />} />
                <Route path="webhooks" element={<AdminRoute><WebhooksPage /></AdminRoute>} />
                <Route path="events" element={<AdminRoute><EventsPage /></AdminRoute>} />
                <Route path="utilisateurs" element={<AdminRoute><UsersPage /></AdminRoute>} />
                <Route path="profil" element={<ProfilePage />} />
                <Route path="parametres" element={<SettingsPage />} />
                <Route path="parametres/import" element={<AdminRoute><ImportPage /></AdminRoute>} />
                <Route path="parametres/securite" element={<SecurityPage />} />
                <Route path="parametres/conformite" element={<AdminRoute><CompliancePage /></AdminRoute>} />
                <Route path="parametres/audit-pii" element={<AdminRoute><PiiAuditPage /></AdminRoute>} />
                <Route path="rh" element={<HrPage />} />
                <Route path="crm" element={<CrmPage />} />
                <Route path="bons-de-commande" element={<PurchaseOrdersPage />} />
                <Route path="finance/tresorerie" element={<AdminRoute><TreasuryPage /></AdminRoute>} />
                <Route path="finance/cap-table" element={<CapTablePage />} />
                <Route path="me" element={<MePage />} />
                <Route path="rapports/bailleurs" element={<DonorReportsPage />} />
                <Route path="terrain" element={<FieldCollectionPage />} />
                <Route path="admin/system-health" element={<AdminRoute><SystemHealthPage /></AdminRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </KeyboardShortcutsProvider>
          </CookieConsentProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
