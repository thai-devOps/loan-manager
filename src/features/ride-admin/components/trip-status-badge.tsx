import type { TripStatus } from "@/features/ride/types/ride";
import { TRIP_STATUS_LABELS } from "@/features/ride/lib/labels";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE: Record<TripStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-200",
  CONFIRMED:
    "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950 dark:text-sky-200",
  ASSIGNED:
    "bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-200",
  IN_PROGRESS:
    "bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-950 dark:text-teal-200",
  COMPLETED:
    "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export function TripStatusBadge({ status }: { status: TripStatus | string }) {
  const safe = (status in TONE ? status : "DRAFT") as TripStatus;
  return (
    <Badge variant="outline" className={cn("font-medium", TONE[safe])}>
      {TRIP_STATUS_LABELS[safe] ?? String(status)}
    </Badge>
  );
}
