import { cn } from "@/lib/utils";
import type { UserStatus } from "@shared/access/types";

const LABELS: Record<UserStatus, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Vô hiệu",
  SUSPENDED: "Tạm khóa",
};

const STYLES: Record<UserStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  INACTIVE: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  SUSPENDED: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {LABELS[status]}
    </span>
  );
}
