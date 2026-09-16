type SyncHandler = (payload?: { message: string }) => void;

const listeners = new Map<string, Set<SyncHandler>>();

export function onSyncEvent(
  event: "status" | "synced" | "error",
  handler: SyncHandler,
): () => void {
  const set = listeners.get(event) ?? new Set<SyncHandler>();
  set.add(handler);
  listeners.set(event, set);
  return () => set.delete(handler);
}

export function emitSyncEvent(
  event: "status" | "synced" | "error",
  payload?: { message: string },
): void {
  const set = listeners.get(event);
  if (!set) return;
  for (const handler of set) {
    handler(payload);
  }
}
