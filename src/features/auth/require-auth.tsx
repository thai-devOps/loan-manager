import { useEffect, useRef } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { InitialSyncPage } from "@/features/auth/initial-sync-page";
import { useAuthStore } from "@/stores/auth.store";
import { useSyncStore } from "@/stores/sync.store";

const TOUCH_THROTTLE_MS = 60_000;

export function RequireAuth() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const touch = useAuthStore((s) => s.touch);
  const prepareLocalDb = useAuthStore((s) => s.prepareLocalDb);
  const initialSyncReady = useSyncStore((s) => s.initialSyncReady);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void prepareLocalDb();
  }, [isAuthenticated, prepareLocalDb]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouchRef.current < TOUCH_THROTTLE_MS) return;
      lastTouchRef.current = now;
      touch();
    };

    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [isAuthenticated, touch]);

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (!initialSyncReady) {
    return <InitialSyncPage />;
  }

  return <Outlet />;
}
