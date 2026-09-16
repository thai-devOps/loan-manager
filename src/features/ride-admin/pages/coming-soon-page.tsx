import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function RideAdminComingSoonPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-xs font-medium tracking-[0.18em] text-teal-800/70 uppercase">
        Phase 2.2+
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Module này sẽ được bổ sung ở giai đoạn tiếp theo. Hiện ưu tiên Dashboard,
        Booking, Xe và Tài xế.
      </p>
      <Button asChild className="mt-6 bg-teal-800 hover:bg-teal-700">
        <Link to="/admin/dashboard">Về Dashboard</Link>
      </Button>
    </div>
  );
}
