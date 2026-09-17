import * as Ably from "ably";
import { getSession } from "@/lib/auth";

let client: Ably.Realtime | null = null;

/**
 * Shared Ably Realtime client for ride admin (token auth — never uses API key).
 */
export function getRideAdminAblyClient(): Ably.Realtime {
  if (client) return client;

  client = new Ably.Realtime({
    authCallback: (_tokenParams, callback) => {
      void (async () => {
        try {
          const session = getSession();
          if (!session?.token) {
            callback("Not authenticated", null);
            return;
          }
          const res = await fetch("/api/realtime/ably-token", {
            headers: { Authorization: `Bearer ${session.token}` },
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as {
              error?: string;
            } | null;
            callback(
              body?.error ?? `Token request failed (${res.status})`,
              null,
            );
            return;
          }
          const tokenRequest = (await res.json()) as Ably.TokenRequest;
          callback(null, tokenRequest);
        } catch (error) {
          callback(
            error instanceof Error ? error.message : "Token request failed",
            null,
          );
        }
      })();
    },
    autoConnect: true,
  });

  return client;
}

export function closeRideAdminAblyClient(): void {
  if (!client) return;
  client.close();
  client = null;
}

export type AblyConnectionState =
  | "initialized"
  | "connecting"
  | "connected"
  | "disconnected"
  | "suspended"
  | "closing"
  | "closed"
  | "failed";
