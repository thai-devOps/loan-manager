import type { BookingStatus } from "@/features/ride/types/ride";
import { BOOKING_STATUS_LABELS } from "@/features/ride/lib/labels";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200",
  CONFIRMED: "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950 dark:text-sky-200",
  DRIVER_ASSIGNED:
    "bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-200",
  DRIVER_ARRIVING:
    "bg-violet-100 text-violet-900 border-violet-200 dark:bg-violet-950 dark:text-violet-200",
  IN_PROGRESS:
    "bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-950 dark:text-teal-200",
  COMPLETED:
    "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", TONE[status])}
    >
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}
