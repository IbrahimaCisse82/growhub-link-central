import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import SectionHeader from "@/components/shared/SectionHeader";
import MfaSetupCard from "@/components/security/MfaSetupCard";
import { useAuth } from "@/hooks/useAuth";
import { useMfaFactors } from "@/hooks/useMfaFactors";
import { supabase } from "@/integrations/supabase/client";
import GhButton from "@/components/shared/GhButton";
import { toast } from "sonner";

async function signOutEverywhere() {
  if (!window.confirm("Déconnecter ce compte de tous les appareils (ordinateurs, téléphones) ?")) return;
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) { toast.error("Échec : " + error.message); return; }
  window.location.href = "/login";
}

export default function SecurityPage() {
  const { isAdmin } = useAuth();
  const { hasActiveFactor, loading } = useMfaFactors();
  const mustEnroll = isAdmin && !hasActiveFactor && !loading;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
      <SectionHeader title="Sécurité du compte" subtitle="Authentification à deux facteurs et gestion des sessions" />

      {mustEnroll && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
          <ShieldAlert className="text-destructive flex-shrink-0 mt-0.5" size={20} />
          <div>
            <div className="font-medium text-foreground">Activation 2FA requise</div>
            <div className="text-sm text-muted-foreground">
              En tant qu'administrateur, vous devez activer l'authentification à deux facteurs pour protéger les données sensibles
              (RH, finances, PII).
            </div>
          </div>
        </div>
      )}

      <MfaSetupCard />

      <div className="bg-card border border-border rounded-xl p-6 space-y-2">
        <h3 className="font-display font-bold text-foreground">Mot de passe & sessions</h3>
        <p className="text-sm text-muted-foreground">
          Vos mots de passe sont vérifiés contre la base <strong>Have I Been Pwned</strong> à chaque création ou modification.
        </p>
        <p className="text-sm text-muted-foreground">
          Pour modifier votre mot de passe, rendez-vous dans votre <a href="/app/profil" className="text-primary underline">profil</a>.
        </p>
        <div className="pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Appareil perdu ou connexion suspecte ? Fermez toutes les sessions ouvertes sur tous vos appareils.</p>
          <GhButton variant="ghost" onClick={signOutEverywhere}>Se déconnecter de tous les appareils</GhButton>
        </div>
      </div>
    </motion.div>
  );
}
