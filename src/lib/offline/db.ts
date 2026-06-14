/**
 * IndexedDB queue for offline mutations (field data collection).
 * Used by useOfflineSync to replay mutations once back online.
 */
import { openDB, type IDBPDatabase } from "idb";

export type OfflineOperation =
  | { kind: "me_measurement"; payload: Record<string, unknown> }
  | { kind: "task_status"; payload: { id: string; status: string } }
  | { kind: "task_create"; payload: Record<string, unknown> };

export interface QueuedItem {
  id?: number;
  createdAt: number;
  attempts: number;
  lastError?: string;
  op: OfflineOperation;
}

const DB_NAME = "growhub-offline";
const STORE = "queue";
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueOffline(op: OfflineOperation): Promise<number> {
  const db = await getDb();
  return (await db.add(STORE, { createdAt: Date.now(), attempts: 0, op } as QueuedItem)) as number;
}

export async function listQueue(): Promise<QueuedItem[]> {
  const db = await getDb();
  return (await db.getAll(STORE)) as QueuedItem[];
}

export async function removeQueueItem(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function markAttempt(id: number, error?: string): Promise<void> {
  const db = await getDb();
  const item = (await db.get(STORE, id)) as QueuedItem | undefined;
  if (!item) return;
  item.attempts += 1;
  item.lastError = error;
  await db.put(STORE, item);
}

export async function queueSize(): Promise<number> {
  const db = await getDb();
  return await db.count(STORE);
}
