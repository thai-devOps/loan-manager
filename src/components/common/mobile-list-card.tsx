import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InterestScheduleStatus } from "@/types/interest-schedule";
import type { LoanStatus } from "@/types/loan";
import type { TransactionType } from "@/types/transaction";

export type MobileListCardTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent";

export function toneFromLoanStatus(status: LoanStatus): MobileListCardTone {
  if (status === "ACTIVE") return "success";
  if (status === "CANCELLED") return "danger";
  return "neutral";
}

export function toneFromScheduleStatus(
  status: InterestScheduleStatus,
): MobileListCardTone {
  if (status === "OVERDUE") return "danger";
  if (status === "PARTIAL") return "warning";
  if (status === "PAID") return "success";
  return "info";
}

export function toneFromTransactionType(
  type: TransactionType,
): MobileListCardTone {
  if (type === "INTEREST_PAYMENT") return "success";
  if (type === "PRINCIPAL_PAYMENT") return "warning";
  return "info";
}

const toneStyles: Record<
  MobileListCardTone,
  { shell: string; icon: string; value: string }
> = {
  neutral: {
    shell: "border-border/80 bg-card",
    icon: "bg-muted text-muted-foreground",
    value: "text-foreground",
  },
  info: {
    shell:
      "border-info/25 bg-gradient-to-br from-info/12 via-card to-card shadow-info/5",
    icon: "bg-info/15 text-info",
    value: "text-info",
  },
  success: {
    shell:
      "border-success/25 bg-gradient-to-br from-success/12 via-card to-card shadow-success/5",
    icon: "bg-success/15 text-success",
    value: "text-success",
  },
  warning: {
    shell:
      "border-warning/30 bg-gradient-to-br from-warning/15 via-card to-card shadow-warning/5",
    icon: "bg-warning/20 text-warning-foreground",
    value: "text-warning-foreground",
  },
  danger: {
    shell:
      "border-destructive/25 bg-gradient-to-br from-destructive/12 via-card to-card shadow-destructive/5",
    icon: "bg-destructive/15 text-destructive",
    value: "text-destructive",
  },
  accent: {
    shell:
      "border-chart-5/25 bg-gradient-to-br from-chart-5/12 via-card to-card",
    icon: "bg-chart-5/15 text-chart-5",
    value: "text-chart-5",
  },
};

type MobileListCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  primaryValue?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  icon?: ReactNode;
  tone?: MobileListCardTone;
  className?: string;
  to?: string;
};

export function MobileListCard({
  title,
  subtitle,
  badge,
  primaryValue,
  meta,
  footer,
  icon,
  tone = "neutral",
  className,
  to,
}: MobileListCardProps) {
  const styles = toneStyles[tone];

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          {icon ? (
            <div
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
                styles.icon,
              )}
            >
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium leading-snug">{title}</p>
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      {primaryValue ? (
        <p
          className={cn(
            "mt-2 text-base font-semibold tabular-nums tracking-tight",
            icon ? "pl-[2.875rem]" : undefined,
            styles.value,
          )}
        >
          {primaryValue}
        </p>
      ) : null}

      {meta ? (
        <p
          className={cn(
            "mt-1 truncate text-sm text-muted-foreground",
            icon ? "pl-[2.875rem]" : undefined,
          )}
        >
          {meta}
        </p>
      ) : null}

      {footer ? (
        <div className={cn("mt-3", icon ? "pl-[2.875rem]" : undefined)}>
          {footer}
        </div>
      ) : null}
    </>
  );

  const shellClass = cn(
    "block rounded-xl border p-3.5 shadow-sm transition-colors",
    styles.shell,
    className,
  );

  if (to) {
    return (
      <Link to={to} className={shellClass}>
        {content}
      </Link>
    );
  }

  return <div className={shellClass}>{content}</div>;
}

export function MobileList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5 md:hidden", className)}>{children}</div>
  );
}

const collectToneStyles: Record<MobileListCardTone, string> = {
  neutral:
    "border-border bg-muted/60 text-foreground hover:bg-muted hover:text-foreground",
  info: "border-info/30 bg-info/12 text-info hover:bg-info/20 hover:text-info",
  success:
    "border-success/30 bg-success/12 text-success hover:bg-success/20 hover:text-success",
  warning:
    "border-warning/35 bg-warning/15 text-warning-foreground hover:bg-warning/25 hover:text-warning-foreground",
  danger:
    "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive",
  accent:
    "border-chart-5/30 bg-chart-5/12 text-chart-5 hover:bg-chart-5/20 hover:text-chart-5",
};

export function CollectMoneyButton({
  loanId,
  tone = "info",
  className,
}: {
  loanId: string;
  tone?: MobileListCardTone;
  className?: string;
}) {
  return (
    <Button
      asChild
      size="sm"
      variant="outline"
      className={cn(
        "h-8 w-full gap-1.5 border shadow-none",
        collectToneStyles[tone],
        className,
      )}
    >
      <Link to={`/payments?loanId=${loanId}`}>
        <HandCoins className="size-3.5" />
        Thu tiền
      </Link>
    </Button>
  );
}
