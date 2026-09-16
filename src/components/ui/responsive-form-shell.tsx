import type { ComponentProps, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export function ResponsiveFormShell({
  open,
  onOpenChange,
  title,
  children,
  desktopClassName,
  mobileClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  /** Extra classes for DialogContent (desktop). */
  desktopClassName?: string;
  /** Extra classes for SheetContent (mobile). */
  mobileClassName?: string;
}) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "flex max-h-[min(92vh,880px)] flex-col gap-0 overflow-hidden p-0",
            desktopClassName,
          )}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 sm:px-6">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-t-2xl p-0",
          mobileClassName,
        )}
      >
        <div
          className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30"
          aria-hidden
        />
        <SheetHeader className="shrink-0 border-b px-5 py-3 pr-12 text-left">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

/** Sticky footer bar shared by dialog + bottom sheet form layouts. */
export function ResponsiveFormFooter({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t px-5 py-3 sm:flex-row sm:justify-end sm:px-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
