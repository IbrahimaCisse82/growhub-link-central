import { useNavigate } from "react-router-dom";
import { Rocket, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export default function OnboardingBadge() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!profile || profile.onboarding_completed_at || dismissed) return null;

  return (
    <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 mb-4">
      <Rocket size={14} className="text-primary flex-shrink-0" />
      <span className="text-[12px] text-foreground flex-1">
        Votre onboarding n'est pas terminé.
      </span>
      <button
        onClick={() => { localStorage.removeItem(`gh_onboarded_${profile.user_id}`); window.location.reload(); }}
        className="text-[11px] font-semibold text-primary hover:underline"
      >
        Reprendre
      </button>
      <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground" aria-label="Masquer">
        <X size={12} />
      </button>
    </div>
  );
}
