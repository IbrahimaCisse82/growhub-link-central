import { motion } from "framer-motion";
import { Bell, BellOff, Info } from "lucide-react";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export default function PushNotificationsCard() {
  const { supported, configured, subscribed, loading, subscribe, unsubscribe } = usePushSubscription();

  const action = subscribed ? (
    <GhButton variant="ghost" onClick={unsubscribe} disabled={loading}>
      <BellOff className="w-4 h-4 mr-2" /> Désactiver
    </GhButton>
  ) : (
    <GhButton onClick={subscribe} disabled={loading || !supported || !configured}>
      <Bell className="w-4 h-4 mr-2" /> Activer
    </GhButton>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <GhCard title="Notifications push" action={action}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Recevez les alertes importantes dans votre navigateur, même quand l'onglet est fermé.
          </p>
          {!supported && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              Votre navigateur ne supporte pas les notifications push (essayez Chrome, Firefox ou Edge).
            </div>
          )}
          {supported && !configured && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              Clés VAPID non configurées : ajoutez <code>VITE_VAPID_PUBLIC_KEY</code> côté client et <code>VAPID_PUBLIC_KEY</code>/<code>VAPID_PRIVATE_KEY</code> côté serveur.
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
