import { Link } from "react-router-dom";
import { Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { cn } from "@/lib/utils";

function formatTime(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function SyncStatusIndicator({ className }: { className?: string }) {
  const { isOnline, isSyncing, pendingCount, lastSyncAt, hasSyncError } =
    useSyncStatus();

  let label = "Đã đồng bộ";
  let Icon = Cloud;

  if (!isOnline) {
    label =
      pendingCount > 0
        ? `Offline · ${pendingCount} chờ`
        : "Offline";
    Icon = CloudOff;
  } else if (isSyncing) {
    label = "Đang đồng bộ…";
    Icon = Loader2;
  } else if (hasSyncError) {
    label =
      pendingCount > 0
        ? `Lỗi sync · ${pendingCount} chờ`
        : "Lỗi đồng bộ";
    Icon = AlertCircle;
  } else if (pendingCount > 0) {
    label = `${pendingCount} thay đổi chờ`;
    Icon = Cloud;
  } else if (lastSyncAt) {
    label = `Đã sync ${formatTime(lastSyncAt)}`;
  }

  return (
    <Link
      to="/profile/sync"
      className={cn(
        "hidden items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex",
        className,
      )}
      title={`${label} — mở theo dõi đồng bộ`}
      aria-live="polite"
    >
      <Icon
        className={cn(
          "size-3.5 shrink-0",
          isSyncing && "animate-spin",
          hasSyncError && "text-destructive",
          !isOnline && "opacity-70",
        )}
      />
      <span className="max-w-[9rem] truncate">{label}</span>
    </Link>
  );
}
