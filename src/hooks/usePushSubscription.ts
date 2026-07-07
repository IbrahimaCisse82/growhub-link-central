import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  isPushSupported,
  isPushConfigured,
  isCurrentlySubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/registerPush";
import { toast } from "@/hooks/use-toast";

export function usePushSubscription() {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const supported = isPushSupported();
  const configured = isPushConfigured();

  useEffect(() => {
    if (!supported) return;
    isCurrentlySubscribed().then(setSubscribed).catch(() => setSubscribed(false));
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const r = await subscribeToPush(user.id);
    setLoading(false);
    if (r.ok) {
      setSubscribed(true);
      toast({ title: "✓ Notifications push activées" });
    } else {
      toast({ title: "Impossible d'activer", description: r.error, variant: "destructive" });
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    await unsubscribeFromPush(user.id);
    setLoading(false);
    setSubscribed(false);
    toast({ title: "Notifications push désactivées" });
  }, [user]);

  return { supported, configured, subscribed, loading, subscribe, unsubscribe };
}
