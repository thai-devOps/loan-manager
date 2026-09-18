import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Xóa",
  pending = false,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const isDesktop = useIsDesktop();

  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => onOpenChange(false)}
      >
        Hủy
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        className="bg-destructive text-white hover:bg-destructive/90"
        onClick={() => onConfirm()}
      >
        {pending ? "Đang xóa…" : confirmLabel}
      </Button>
    </>
  );

  if (isDesktop) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "bg-destructive text-white hover:bg-destructive/90",
              )}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
            >
              {pending ? "Đang xóa…" : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex flex-col gap-0 rounded-t-2xl p-0"
      >
        <div
          className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30"
          aria-hidden
        />
        <SheetHeader className="gap-1 px-5 py-3 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <SheetFooter className="flex-col-reverse gap-2 border-t px-5 py-3 sm:flex-row">
          {actions}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
