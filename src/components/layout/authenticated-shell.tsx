import { Outlet } from "react-router-dom";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

/** Wraps authenticated routes so mobile bottom nav appears on hub + modules. */
export function AuthenticatedShell() {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
      <MobileBottomNav />
    </div>
  );
}
