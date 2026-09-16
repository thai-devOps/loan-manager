import { useEffect, useRef } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { useSyncStore } from "@/stores/sync.store";

const TOUCH_THROTTLE_MS = 60_000;

export function RequireAuth() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const touch = useAuthStore((s) => s.touch);
  const prepareLocalDb = useAuthStore((s) => s.prepareLocalDb);
  const dbReady = useSyncStore((s) => s.dbReady);
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

  // Open Dexie quickly; do not wait for API sync before rendering shell.
  if (!dbReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Đang mở dữ liệu cục bộ…
      </div>
    );
  }

  return <Outlet />;
}
