import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listQueue, removeQueueItem, markAttempt, queueSize, type QueuedItem } from "@/lib/offline/db";

export function useOfflineSync() {
  const qc = useQueryClient();
  const [online, setOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setPending(await queueSize());
  }, []);

  const flush = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setSyncing(true);
    try {
      const items = await listQueue();
      let success = 0;
      let failed = 0;
      for (const item of items) {
        const ok = await tryReplay(item);
        if (ok) {
          if (item.id != null) await removeQueueItem(item.id);
          success += 1;
        } else {
          if (item.id != null) await markAttempt(item.id, "Replay failed");
          failed += 1;
        }
      }
      if (success > 0) {
        toast.success(`${success} action(s) hors-ligne synchronisée(s)`);
        qc.invalidateQueries({ queryKey: ["me_measurements"] });
        qc.invalidateQueries({ queryKey: ["me_indicator_progress"] });
        qc.invalidateQueries({ queryKey: ["tasks"] });
      }
      if (failed > 0) toast.error(`${failed} action(s) en erreur — conservées dans la file`);
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [qc, refresh]);

  useEffect(() => {
    refresh();
    const onOnline = () => {
      setOnline(true);
      void flush();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const interval = window.setInterval(refresh, 5000);
    if (navigator.onLine) void flush();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(interval);
    };
  }, [flush, refresh]);

  return { online, pending, syncing, flush };
}

async function tryReplay(item: QueuedItem): Promise<boolean> {
  try {
    const op = item.op;
    if (op.kind === "me_measurement") {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...op.payload, created_by: (op.payload as { created_by?: string }).created_by ?? user?.id ?? null };
      const { error } = await supabase.from("me_measurements" as never).insert(payload as never);
      if (error) throw error;
      return true;
    }
    if (op.kind === "task_status") {
      const { error } = await supabase.from("tasks").update({ status: op.payload.status } as never).eq("id", op.payload.id);
      if (error) throw error;
      return true;
    }
    if (op.kind === "task_create") {
      const { error } = await supabase.from("tasks").insert(op.payload as never);
      if (error) throw error;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
