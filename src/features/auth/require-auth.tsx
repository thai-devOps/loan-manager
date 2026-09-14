import { useEffect, useRef } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";

const TOUCH_THROTTLE_MS = 60_000;
const EXPIRY_CHECK_MS = 60_000;

export function RequireAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const touch = useAuthStore((s) => s.touch);
  const checkExpiry = useAuthStore((s) => s.checkExpiry);
  const logout = useAuthStore((s) => s.logout);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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

    const intervalId = window.setInterval(() => {
      if (!checkExpiry()) {
        logout();
        void navigate("/login", {
          replace: true,
          state: { from: location.pathname },
        });
      }
    }, EXPIRY_CHECK_MS);

    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.clearInterval(intervalId);
    };
  }, [
    isAuthenticated,
    touch,
    checkExpiry,
    logout,
    navigate,
    location.pathname,
  ]);

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
