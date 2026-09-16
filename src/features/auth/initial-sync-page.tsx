import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { AppLogo } from "@/components/common/app-logo";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { retryInitialSync } from "@/sync/syncManager";
import { useSyncStore } from "@/stores/sync.store";

export function InitialSyncPage() {
  const phase = useSyncStore((s) => s.initialSyncPhase);
  const error = useSyncStore((s) => s.initialSyncError);
  const isOnline = useSyncStore((s) => s.isOnline);
  const isError = phase === "error";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <AppLogo size="xl" className="rounded-2xl" />
        <p className="mt-5 font-semibold tracking-tight text-foreground">
          {APP_NAME}
        </p>

        {isError ? (
          <>
            <div className="mt-8 flex size-12 items-center justify-center rounded-full bg-muted">
              <WifiOff className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <h1 className="mt-4 text-lg font-medium text-foreground">
              Chưa đồng bộ được
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error ??
                (isOnline
                  ? "Không đồng bộ được dữ liệu. Vui lòng thử lại."
                  : "Không có kết nối mạng")}
            </p>
            <Button
              className="mt-6"
              onClick={() => void retryInitialSync()}
            >
              <RefreshCw className="size-4" />
              Thử lại
            </Button>
          </>
        ) : (
          <>
            <Loader2
              className="mt-10 size-8 animate-spin text-muted-foreground"
              aria-hidden
            />
            <h1 className="mt-4 text-lg font-medium text-foreground">
              {phase === "checking"
                ? "Đang chuẩn bị…"
                : "Đang đồng bộ dữ liệu…"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vui lòng chờ trong giây lát trước khi sử dụng ứng dụng.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
