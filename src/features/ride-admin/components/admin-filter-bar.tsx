import { useState, type ReactNode } from "react";
import { ChevronDown, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminFilterBar({
  children,
  activeCount = 0,
  defaultOpen,
  className,
}: {
  children: ReactNode;
  /** Number of non-default filters currently applied */
  activeCount?: number;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(
    () => defaultOpen ?? activeCount > 0,
  );

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <ListFilter className="size-3.5" />
          Bộ lọc
          {activeCount > 0 ? (
            <span className="rounded-md bg-teal-800/15 px-1.5 py-0.5 text-[11px] font-medium text-teal-900 dark:text-teal-200">
              {activeCount}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
        {!open && activeCount > 0 ? (
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setOpen(true)}
          >
            Đang lọc · mở
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto border-t border-border px-3 py-2.5 [&>*]:shrink-0">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Compact control sizing for single-row filter bars */
export const filterControlClass = "h-9 w-[9.5rem] shrink-0";
export const filterSearchClass = "h-9 w-56 shrink-0 md:w-64";
export const filterSearchFormClass = "flex shrink-0 items-center gap-2";
