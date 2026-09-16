import type { RideCustomerStatus } from "@/features/ride/types/ride";
import { CUSTOMER_STATUS_LABELS } from "@/features/ride/lib/labels";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE: Record<RideCustomerStatus, string> = {
  ACTIVE:
    "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
  INACTIVE: "bg-muted text-muted-foreground border-border",
};

export function CustomerStatusBadge({
  status,
}: {
  status: RideCustomerStatus | string;
}) {
  const safe = (status === "INACTIVE" ? "INACTIVE" : "ACTIVE") as RideCustomerStatus;
  return (
    <Badge variant="outline" className={cn("font-medium", TONE[safe])}>
      {CUSTOMER_STATUS_LABELS[safe]}
    </Badge>
  );
}
