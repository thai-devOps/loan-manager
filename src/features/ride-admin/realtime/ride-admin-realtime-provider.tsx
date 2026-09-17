import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { Message } from "ably";
import { toast } from "sonner";
import { PERMISSIONS } from "@/config/permissions";
import { rideAdminQueryKeys } from "@/features/ride-admin/query-keys";
import {
  closeRideAdminAblyClient,
  getRideAdminAblyClient,
  type AblyConnectionState,
} from "@/features/ride-admin/realtime/ably-client";
import {
  RIDE_ADMIN_CHANNEL,
  type BookingCreatedEvent,
  type RealtimeEvent,
} from "@/features/ride-admin/realtime/types";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

const RealtimeConnectionContext = createContext<AblyConnectionState>("initialized");

export function useRideAdminRealtimeConnection(): AblyConnectionState {
  return useContext(RealtimeConnectionContext);
}

function parseBookingCreated(
  message: Message,
): BookingCreatedEvent | null {
  const raw = message.data;
  if (!raw || typeof raw !== "object") return null;

  const envelope = raw as Partial<RealtimeEvent<BookingCreatedEvent>> &
    Partial<BookingCreatedEvent>;

  const data =
    envelope.data && typeof envelope.data === "object"
      ? envelope.data
      : (envelope as BookingCreatedEvent);

  if (
    typeof data.bookingId !== "string" ||
    typeof data.bookingCode !== "string"
  ) {
    return null;
  }

  return {
    bookingId: data.bookingId,
    bookingCode: data.bookingCode,
    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : new Date().toISOString(),
  };
}

function invalidateRideAdminQueries(
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  if (import.meta.env.DEV) {
    console.info("[Realtime] Invalidating admin booking queries");
  }
  void queryClient.invalidateQueries({
    queryKey: rideAdminQueryKeys.bookingsRoot(),
  });
  void queryClient.invalidateQueries({
    queryKey: rideAdminQueryKeys.dashboardRoot(),
  });
}

export function RideAdminRealtimeProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canSubscribe = hasPermission(PERMISSIONS.FLEET_BOOKING_VIEW);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [connectionState, setConnectionState] =
    useState<AblyConnectionState>("initialized");
  const seenBookingIds = useRef(new Set<string>());
  const wasConnected = useRef(false);

  useEffect(() => {
    if (!canSubscribe) return;

    const ably = getRideAdminAblyClient();
    if (import.meta.env.DEV) {
      console.info("[Realtime] Connecting");
    }

    const onConnection = () => {
      const state = ably.connection.state as AblyConnectionState;
      setConnectionState(state);

      if (state === "connected") {
        if (import.meta.env.DEV) {
          console.info(
            wasConnected.current
              ? "[Realtime] Reconnected"
              : "[Realtime] Connected",
          );
        }
        if (wasConnected.current) {
          invalidateRideAdminQueries(queryClient);
        }
        wasConnected.current = true;
      }
    };

    ably.connection.on(onConnection);
    onConnection();

    const channel = ably.channels.get(RIDE_ADMIN_CHANNEL);

    const onBookingCreated = (message: Message) => {
      if (import.meta.env.DEV) {
        console.info("[Realtime] Event received: booking.created");
      }
      const event = parseBookingCreated(message);
      if (!event) return;

      const dedupeKey = `booking.created:${event.bookingId}`;
      if (seenBookingIds.current.has(dedupeKey)) return;
      seenBookingIds.current.add(dedupeKey);

      invalidateRideAdminQueries(queryClient);

      toast("Có chuyến mới", {
        description: `Mã chuyến: ${event.bookingCode}. Khách vừa gửi yêu cầu đặt chuyến.`,
        duration: 12_000,
        action: {
          label: "Xem chuyến",
          onClick: () => {
            void navigate(`/admin/bookings/${event.bookingId}`);
          },
        },
      });
    };

    void channel.subscribe("booking.created", onBookingCreated);

    return () => {
      void channel.unsubscribe("booking.created", onBookingCreated);
      ably.connection.off(onConnection);
      closeRideAdminAblyClient();
      setConnectionState("closed");
      wasConnected.current = false;
    };
  }, [canSubscribe, navigate, queryClient]);

  const value = useMemo(() => connectionState, [connectionState]);

  return (
    <RealtimeConnectionContext.Provider value={value}>
      {children}
    </RealtimeConnectionContext.Provider>
  );
}

export function RideAdminRealtimeStatus({
  className,
}: Readonly<{
  className?: string;
}>) {
  const state = useRideAdminRealtimeConnection();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  if (!hasPermission(PERMISSIONS.FLEET_BOOKING_VIEW)) return null;

  const connected = state === "connected";
  const reconnecting =
    state === "connecting" ||
    state === "disconnected" ||
    state === "suspended";

  let title = "Realtime tạm thời không khả dụng";
  if (connected) title = "Realtime đang kết nối";
  else if (reconnecting) title = "Realtime đang kết nối lại";

  let dotClass = "bg-muted-foreground/50";
  if (connected) dotClass = "bg-teal-600";
  else if (reconnecting) dotClass = "bg-amber-500";

  return (
    <span
      className={cn(
        "relative hidden size-2.5 shrink-0 items-center justify-center sm:inline-flex",
        className,
      )}
      title={title}
      aria-label={title}
      role="status"
    >
      {connected ? (
        <>
          <span
            className="absolute inset-0 animate-ping rounded-full bg-teal-500/50"
            aria-hidden
          />
          <span
            className="absolute inset-[-2px] animate-ping rounded-full bg-teal-400/25 [animation-delay:300ms]"
            aria-hidden
          />
        </>
      ) : null}
      <span
        className={cn(
          "relative size-1.5 rounded-full",
          dotClass,
          connected && "bg-teal-600 shadow-[0_0_6px_rgb(13_148_136_/_0.7)]",
          reconnecting && "animate-pulse",
        )}
        aria-hidden
      />
    </span>
  );
}
