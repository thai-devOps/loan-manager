/** Shared Ably realtime types for ride admin (Mongo remains source of truth). */

export const RIDE_ADMIN_CHANNEL = "ride-admin" as const;

export type RideRealtimeEventType =
  | "booking.created"
  | "booking.updated"
  | "booking.cancelled"
  | "trip.created"
  | "trip.updated"
  | "trip.status_changed"
  | "vehicle.updated"
  | "driver.updated";

export interface BookingCreatedEvent {
  bookingId: string;
  bookingCode: string;
  createdAt: string;
}

export interface RealtimeEvent<T = unknown> {
  type: RideRealtimeEventType;
  data: T;
  createdAt: string;
}
