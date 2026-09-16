import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl">
        <ShieldOff className="size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">403 — Forbidden</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Bạn không có quyền truy cập trang này.
        </p>
      </div>
      <Button asChild>
        <Link to="/apps">Về Apps</Link>
      </Button>
    </div>
  );
}
