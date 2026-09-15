import { Outlet } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppLayout() {
  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
        <DesktopSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
      </div>
    </TooltipProvider>
  );
}
