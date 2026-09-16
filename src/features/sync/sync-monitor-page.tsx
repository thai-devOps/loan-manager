import { useState } from "react";
import {
  AlertCircle,
  Cloud,
  CloudOff,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { DeleteIcon } from "@/components/icons";
import { AppHeader } from "@/components/layout/app-header";
import { ProfileModuleChrome } from "@/features/profile/profile-layout";
import {
  EmptyState,
  PageShell,
  StatCard,
} from "@/components/common/status-badges";
import { MobileList, MobileListCard } from "@/components/common/mobile-list-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import {
  shortId,
  SYNC_ACTION_LABELS,
  SYNC_ENTITY_LABELS,
  syncQueueRepository,
} from "@/features/sync/sync-queue.repository";
import type { SyncQueueItem, SyncQueueStatus } from "@/db/schema";
import { MAX_SYNC_RETRIES } from "@/sync/syncQueue";
import { cn } from "@/lib/utils";

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Chưa từng đồng bộ";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatCreatedAt(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

function statusBadgeVariant(
  status: SyncQueueStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "failed" || status === "conflict") return "destructive";
  if (status === "syncing") return "default";
  if (status === "pending") return "secondary";
  return "outline";
}

function statusLabel(status: SyncQueueStatus): string {
  switch (status) {
    case "pending":
      return "Chờ";
    case "syncing":
      return "Đang sync";
    case "failed":
      return "Lỗi";
    case "conflict":
      return "Conflict";
    case "done":
      return "Xong";
  }
}

export function SyncMonitorPage() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    hasSyncError,
    ops,
    conflicts,
    failedCount,
  } = useSyncQueue();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionsDisabled = !isOnline || isSyncing || busy;

  async function handleSyncNow() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await syncQueueRepository.syncNow();
      setMessage("Đã chạy đồng bộ");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đồng bộ thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function handleRetryFailed() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const n = await syncQueueRepository.retryFailedAndSync();
      setMessage(
        n > 0
          ? `Đã đưa ${n} mục lỗi vào hàng chờ và chạy đồng bộ`
          : "Không có mục lỗi để thử lại",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thử lại thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkConflictSeen(id: string) {
    setError(null);
    try {
      await syncQueueRepository.markConflictSeen(id);
      setMessage("Đã đánh dấu conflict đã xem");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được conflict");
    }
  }

  async function handleRemoveError(localId: number) {
    setError(null);
    try {
      await syncQueueRepository.removeError(localId);
      setMessage("Đã xóa mục lỗi khỏi hàng đợi");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được lỗi");
    }
  }

  async function handleClearErrors() {
    setError(null);
    try {
      const n = await syncQueueRepository.clearErrors();
      setMessage(
        n > 0 ? `Đã xóa ${n} mục lỗi khỏi hàng đợi` : "Không có lỗi để xóa",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được lỗi");
    }
  }

  return (
    <PageShell
      header={
        <AppHeader
          title="Đồng bộ"
          description={`Hàng đợi offline · tối đa ${MAX_SYNC_RETRIES} lần thử`}
        />
      }
      subNav={<ProfileModuleChrome />}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy || failedCount === 0}
          onClick={() => void handleClearErrors()}
        >
          <DeleteIcon />
          Xóa lỗi
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={actionsDisabled || failedCount === 0}
          onClick={() => void handleRetryFailed()}
        >
          <RotateCcw className="size-4" />
          Thử lại lỗi
        </Button>
        <Button
          size="sm"
          disabled={actionsDisabled}
          onClick={() => void handleSyncNow()}
        >
          {isSyncing || busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Đồng bộ ngay
        </Button>
      </div>

      {(message || error) && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            error
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-success/30 bg-success/10 text-success",
          )}
        >
          {error ?? message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Kết nối"
          value={isOnline ? "Online" : "Offline"}
          icon={
            isOnline ? (
              <Cloud className="size-4 text-muted-foreground" />
            ) : (
              <CloudOff className="size-4 text-muted-foreground" />
            )
          }
        />
        <StatCard
          title="Trạng thái"
          value={isSyncing || busy ? "Đang sync" : hasSyncError ? "Có lỗi" : "Sẵn sàng"}
          icon={
            isSyncing || busy ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : hasSyncError ? (
              <AlertCircle className="size-4 text-destructive" />
            ) : (
              <Cloud className="size-4 text-muted-foreground" />
            )
          }
        />
        <StatCard title="Chờ đồng bộ" value={String(pendingCount)} />
        <StatCard title="Lỗi trong queue" value={String(failedCount)} />
        <StatCard title="Lần sync cuối" value={formatSyncTime(lastSyncAt)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hàng đợi đồng bộ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ops.length === 0 ? (
            <EmptyState title="Hàng đợi trống" description="Không có thay đổi đang chờ đồng bộ." />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thực thể</TableHead>
                      <TableHead>Thao tác</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Retry</TableHead>
                      <TableHead>Lỗi</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ops.map((op) => (
                      <QueueRow
                        key={op.localId ?? op.opId}
                        op={op}
                        onRemoveError={
                          op.localId != null &&
                          (op.status === "failed" || op.status === "conflict")
                            ? () => void handleRemoveError(op.localId!)
                            : undefined
                        }
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <MobileList>
                {ops.map((op) => (
                  <MobileListCard
                    key={op.localId ?? op.opId}
                    title={`${SYNC_ACTION_LABELS[op.action]} · ${SYNC_ENTITY_LABELS[op.entity]}`}
                    subtitle={shortId(op.entityId, 12)}
                    primaryValue={statusLabel(op.status)}
                    tone={
                      op.status === "failed" || op.status === "conflict"
                        ? "danger"
                        : op.status === "syncing"
                          ? "info"
                          : "neutral"
                    }
                    meta={
                      op.lastError
                        ? `${op.lastError} · retry ${op.retryCount}/${MAX_SYNC_RETRIES}`
                        : formatCreatedAt(op.createdAt)
                    }
                    footer={
                      op.localId != null &&
                      (op.status === "failed" || op.status === "conflict") ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleRemoveError(op.localId!)}
                        >
                          <DeleteIcon />
                          Xóa lỗi
                        </Button>
                      ) : undefined
                    }
                  />
                ))}
              </MobileList>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conflict phát hiện</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Conflict được ghi khi dữ liệu local đang chờ sync nhưng máy chủ
            đã cập nhật mới hơn. Chưa hỗ trợ merge tự động — chỉ đánh dấu đã
            xem.
          </p>
          {conflicts.length === 0 ? (
            <EmptyState
              title="Không có conflict"
              description="Chưa phát hiện xung đột phiên bản."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thực thể</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Server</TableHead>
                      <TableHead>Phát hiện</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conflicts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          {SYNC_ENTITY_LABELS[c.entity] ?? c.entity}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {shortId(c.entityId, 12)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.localUpdatedAt
                            ? formatSyncTime(c.localUpdatedAt)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.serverUpdatedAt
                            ? formatSyncTime(c.serverUpdatedAt)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatCreatedAt(c.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleMarkConflictSeen(c.id)}
                          >
                            Đã xem
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <MobileList>
                {conflicts.map((c) => (
                  <MobileListCard
                    key={c.id}
                    title={SYNC_ENTITY_LABELS[c.entity] ?? c.entity}
                    subtitle={shortId(c.entityId, 12)}
                    primaryValue="Conflict"
                    tone="warning"
                    meta={formatCreatedAt(c.createdAt)}
                    footer={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleMarkConflictSeen(c.id)}
                      >
                        Đã xem
                      </Button>
                    }
                  />
                ))}
              </MobileList>
            </>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function QueueRow({
  op,
  onRemoveError,
}: {
  op: SyncQueueItem;
  onRemoveError?: () => void;
}) {
  return (
    <TableRow>
      <TableCell>{SYNC_ENTITY_LABELS[op.entity] ?? op.entity}</TableCell>
      <TableCell>{SYNC_ACTION_LABELS[op.action] ?? op.action}</TableCell>
      <TableCell className="font-mono text-xs">
        {shortId(op.entityId, 12)}
      </TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariant(op.status)}>
          {statusLabel(op.status)}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {op.retryCount}/{MAX_SYNC_RETRIES}
      </TableCell>
      <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground">
        {op.lastError ?? "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatCreatedAt(op.createdAt)}
      </TableCell>
      <TableCell className="text-right">
        {onRemoveError ? (
          <Button
            size="sm"
            variant="ghost"
            aria-label="Xóa lỗi"
            onClick={onRemoveError}
          >
            <DeleteIcon />
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
