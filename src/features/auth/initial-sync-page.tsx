import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_BRAND_LOGO_SRC, APP_NAME } from "@/lib/brand";
import { retryInitialSync } from "@/sync/syncManager";
import { useSyncStore } from "@/stores/sync.store";

export function InitialSyncPage() {
  const phase = useSyncStore((s) => s.initialSyncPhase);
  const error = useSyncStore((s) => s.initialSyncError);
  const isOnline = useSyncStore((s) => s.isOnline);
  const isError = phase === "error";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <img
          src={APP_BRAND_LOGO_SRC}
          alt={APP_NAME}
          className="h-auto w-full max-w-[18rem] object-contain sm:max-w-[22rem]"
          decoding="async"
        />

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
              className="mt-8 size-8 animate-spin text-teal-800 dark:text-teal-300"
              aria-hidden
            />
            <h1 className="mt-4 text-lg font-medium text-foreground">
              {phase === "checking"
                ? "Đang tải quyền…"
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
