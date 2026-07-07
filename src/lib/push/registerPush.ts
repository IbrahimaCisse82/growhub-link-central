/**
 * Web Push subscription helpers.
 * VAPID public key is exposed to the client via VITE_VAPID_PUBLIC_KEY.
 */
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function bufferToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export function isPushConfigured(): boolean {
  return VAPID_PUBLIC_KEY.length > 0;
}

export async function getPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function subscribeToPush(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "Push non supporté par ce navigateur" };
  if (!isPushConfigured()) return { ok: false, error: "VAPID_PUBLIC_KEY manquant. Contactez l'administrateur." };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "Permission refusée" };

  const reg = await getPushRegistration();
  if (!reg) return { ok: false, error: "Service worker indisponible" };

  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? (await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  }));

  const p256dh = bufferToBase64Url(sub.getKey("p256dh"));
  const auth = bufferToBase64Url(sub.getKey("auth"));

  const { error } = await supabase.from("push_subscriptions" as never).upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh,
      auth_key: auth,
      user_agent: navigator.userAgent,
    } as never,
    { onConflict: "endpoint" } as never,
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unsubscribeFromPush(userId: string): Promise<{ ok: boolean; error?: string }> {
  const reg = await getPushRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  const endpoint = sub?.endpoint;
  if (sub) await sub.unsubscribe();

  if (endpoint) {
    await supabase.from("push_subscriptions" as never).delete().eq("endpoint", endpoint).eq("user_id", userId);
  }
  return { ok: true };
}

export async function isCurrentlySubscribed(): Promise<boolean> {
  const reg = await getPushRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}
