import { Badge } from "@/components/ui/badge";
import type { LoanStatus } from "@/types/loan";
import type { InterestScheduleStatus } from "@/types/interest-schedule";
import type { TransactionType } from "@/types/transaction";

const loanStatusMap: Record<
  LoanStatus,
  { label: string; variant: "success" | "secondary" | "destructive" }
> = {
  ACTIVE: { label: "Đang hoạt động", variant: "success" },
  COMPLETED: { label: "Đã hoàn tất", variant: "secondary" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
};

const scheduleStatusMap: Record<
  InterestScheduleStatus,
  { label: string; variant: "secondary" | "success" | "warning" | "destructive" }
> = {
  PENDING: { label: "Chưa thu", variant: "secondary" },
  PAID: { label: "Đã thu", variant: "success" },
  PARTIAL: { label: "Thu một phần", variant: "warning" },
  OVERDUE: { label: "Quá hạn", variant: "destructive" },
};

const transactionTypeMap: Record<
  TransactionType,
  { label: string; variant: "info" | "success" | "warning" }
> = {
  DISBURSEMENT: { label: "Giải ngân", variant: "info" },
  INTEREST_PAYMENT: { label: "Thu lời", variant: "success" },
  PRINCIPAL_PAYMENT: { label: "Thu gốc", variant: "warning" },
};

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  const item = loanStatusMap[status];
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function ScheduleStatusBadge({
  status,
}: {
  status: InterestScheduleStatus;
}) {
  const item = scheduleStatusMap[status];
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const item = transactionTypeMap[type];
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function PageShell({
  header,
  subNav,
  children,
}: {
  header: React.ReactNode;
  subNav?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {header}
      {subNav}
      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 pb-32 md:p-6 md:pb-6">
        <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
      </main>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="truncate text-xl font-semibold tracking-tight md:text-2xl">
            {value}
          </p>
          {hint && (
            <p className="text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
