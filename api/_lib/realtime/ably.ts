import Ably from "ably";
import {
  RIDE_ADMIN_CHANNEL,
  type RideRealtimeEventType,
} from "../../../shared/ride/realtime.js";

function getAblyApiKey(): string {
  const key = process.env.ABLY_API_KEY?.trim();
  if (!key) {
    throw new Error("ABLY_API_KEY is not configured");
  }
  return key;
}

let restClient: Ably.Rest | null = null;

function getRest(): Ably.Rest {
  if (!restClient) {
    restClient = new Ably.Rest({ key: getAblyApiKey() });
  }
  return restClient;
}

/** Create a TokenRequest for browser clients (subscribe-only on ride-admin). */
export async function createAblyTokenRequest(clientId: string): Promise<unknown> {
  const rest = getRest();
  return rest.auth.createTokenRequest({
    clientId,
    capability: {
      [RIDE_ADMIN_CHANNEL]: ["subscribe"],
    },
  });
}

export async function publishRealtimeEvent(input: {
  channel: string;
  event: RideRealtimeEventType;
  data: Record<string, unknown>;
}): Promise<void> {
  console.info(`[Realtime] Publishing ${input.event}`);
  const rest = getRest();
  const channel = rest.channels.get(input.channel);
  await channel.publish(input.event, {
    type: input.event,
    data: input.data,
    createdAt: new Date().toISOString(),
  });
  console.info(`[Realtime] Published ${input.event}`);
}
