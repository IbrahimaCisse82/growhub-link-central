import { motion } from "framer-motion";
import { Bell, BellOff, Info } from "lucide-react";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export default function PushNotificationsCard() {
  const { supported, configured, subscribed, loading, subscribe, unsubscribe } = usePushSubscription();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <GhCard title="Notifications push">
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-gh-green" />
                Notifications push
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Recevez les alertes importantes directement dans votre navigateur, même quand l'onglet est fermé.
              </p>
            </div>
            {subscribed ? (
              <GhButton variant="ghost" onClick={unsubscribe} disabled={loading}>
                <BellOff className="w-4 h-4 mr-2" /> Désactiver
              </GhButton>
            ) : (
              <GhButton onClick={subscribe} disabled={loading || !supported || !configured}>
                <Bell className="w-4 h-4 mr-2" /> Activer
              </GhButton>
            )}
          </div>

          {!supported && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              Votre navigateur ne supporte pas les notifications push (essayez Chrome, Firefox ou Edge).
            </div>
          )}
          {supported && !configured && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              Les clés VAPID ne sont pas encore configurées côté serveur. L'administrateur doit ajouter <code>VITE_VAPID_PUBLIC_KEY</code>, <code>VAPID_PUBLIC_KEY</code> et <code>VAPID_PRIVATE_KEY</code>.
            </div>
          )}
          {subscribed && (
            <div className="text-xs text-gh-green">✓ Cet appareil recevra les notifications push.</div>
          )}
        </div>
      </GhCard>
    </motion.div>
  );
}
