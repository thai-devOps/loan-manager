import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { TablePageSkeleton } from "@/components/common/loading-skeletons";
import {
  MobileList,
  MobileListCard,
} from "@/components/common/mobile-list-card";
import { EmptyState } from "@/components/common/status-badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/date";
import { accessApi } from "../services/access-api";

export function AuditLogsPage() {
  const logsQ = useQuery({
    queryKey: ["access", "audit-logs"],
    queryFn: () => accessApi.listAuditLogs(200),
  });

  if (logsQ.isLoading) return <TablePageSkeleton />;

  const logs = logsQ.data?.logs ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Nhật ký kiểm toán</h2>
        <p className="text-muted-foreground text-sm">
          Login, thay đổi user/role/permission
        </p>
      </div>

      {logs.length === 0 ? (
        <EmptyState title="Chưa có nhật ký" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell className="text-sm">
                      {log.targetType}
                      {log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ""}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.actorId.slice(0, 8)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <MobileList>
            {logs.map((log) => (
              <MobileListCard
                key={log.id}
                tone="neutral"
                icon={<ScrollText />}
                title={log.action}
                subtitle={
                  log.targetId
                    ? `${log.targetType} · ${log.targetId.slice(0, 8)}`
                    : log.targetType
                }
                primaryValue={formatDateTime(log.createdAt)}
                meta={`Actor · ${log.actorId.slice(0, 8)}`}
              />
            ))}
          </MobileList>
        </>
      )}
    </div>
  );
}
