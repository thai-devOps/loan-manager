import { Badge } from "@/components/ui/badge";
import type { PricingRuleStatus } from "@/features/ride/types/ride";
import { cn } from "@/lib/utils";

const TONE: Record<PricingRuleStatus, string> = {
  DRAFT: "border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  ACTIVE: "border-teal-800/30 bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-100",
  ARCHIVED: "border-border bg-muted text-muted-foreground",
};

const LABEL: Record<PricingRuleStatus, string> = {
  DRAFT: "Bản nháp",
  ACTIVE: "Đang áp dụng",
  ARCHIVED: "Lưu trữ",
};

export function PricingStatusBadge({ status }: { status: PricingRuleStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full font-medium", TONE[status] ?? TONE.DRAFT)}
    >
      {LABEL[status] ?? status}
    </Badge>
  );
}
