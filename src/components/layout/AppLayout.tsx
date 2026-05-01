import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import AppSidebar from "./AppSidebar";
import AppTopbar from "./AppTopbar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { useAuth } from "@/hooks/useAuth";

export default function AppLayout() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, profile } = useAuth();
  useRealtimeNotifications();

  const storageKey = user ? `gh_onboarded_${user.id}` : null;
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    const dbDone = !!profile.onboarding_completed_at;
    const localDone = storageKey ? !!localStorage.getItem(storageKey) : false;
    setShowOnboarding(!dbDone && !localDone);
  }, [user, profile, storageKey]);

  const completeOnboarding = () => {
    if (storageKey) localStorage.setItem(storageKey, "1");
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen relative z-[1]">
      {showOnboarding && <OnboardingWizard onComplete={completeOnboarding} />}
      {isMobile ? (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[240px] bg-card border-border">
            <AppSidebar mobile onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      ) : (
        <AppSidebar />
      )}
      <div className={`${isMobile ? "" : "ml-[240px]"} min-h-screen flex flex-col`}>
        <AppTopbar onToggleSidebar={() => setSidebarOpen(true)} showMenuButton={isMobile} />
        <main className="flex-1 p-4 md:p-7 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
