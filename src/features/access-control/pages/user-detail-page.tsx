import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { DetailPageSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ApiError } from "@/api/client";
import { formatDateTime } from "@/lib/date";
import { useAuthStore } from "@/stores/auth.store";
import {
  accessApi,
  type AppRole,
  type PublicUser,
} from "../services/access-api";
import { UserStatusBadge } from "../components/user-status-badge";
import type { UserStatus } from "@shared/access/types";

export function UserDetailPage() {
  const { id = "" } = useParams();

  const detailQ = useQuery({
    queryKey: ["access", "user", id],
    queryFn: () => accessApi.getUser(id),
    enabled: Boolean(id),
  });

  const rolesQ = useQuery({
    queryKey: ["access", "roles"],
    queryFn: () => accessApi.listRoles(),
  });

  const auditQ = useQuery({
    queryKey: ["access", "audit", id],
    queryFn: async () => {
      const { logs } = await accessApi.listAuditLogs(200);
      return logs.filter((l) => l.targetId === id || l.actorId === id);
    },
    enabled: Boolean(id),
  });

  if (detailQ.isLoading) return <DetailPageSkeleton />;
  if (detailQ.isError || !detailQ.data) {
    return (
      <p className="text-destructive text-sm">
        {(detailQ.error as Error)?.message ?? "Không tìm thấy người dùng"}
      </p>
    );
  }

  return (
    <UserDetailEditor
      key={`${detailQ.data.user.id}:${detailQ.data.user.updatedAt}`}
      id={id}
      user={detailQ.data.user}
      roles={detailQ.data.roles}
      permissions={detailQ.data.permissions}
      allRoles={rolesQ.data?.roles ?? []}
      activity={auditQ.data ?? []}
      activityLoading={auditQ.isLoading}
    />
  );
}

function UserDetailEditor({
  id,
  user,
  roles,
  permissions,
  allRoles,
  activity,
  activityLoading,
}: {
  id: string;
  user: PublicUser;
  roles: AppRole[];
  permissions: string[];
  allRoles: AppRole[];
  activity: Awaited<ReturnType<typeof accessApi.listAuditLogs>>["logs"];
  activityLoading: boolean;
}) {
  const qc = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const loadMe = useAuthStore((s) => s.loadMe);

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [roleIds, setRoleIds] = useState<string[]>(user.roleIds);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);

  const saveMut = useMutation({
    mutationFn: () =>
      accessApi.updateUser(id, { name, email, username, status, roleIds }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["access", "user", id] });
      await qc.invalidateQueries({ queryKey: ["access", "users"] });
      if (id === currentUserId) await loadMe();
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Lưu thất bại");
    },
  });

  const resetMut = useMutation({
    mutationFn: () => accessApi.resetPassword(id, newPassword),
    onSuccess: () => {
      setNewPassword("");
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Reset thất bại");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/users" aria-label="Quay lại">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{user.name}</h2>
            <UserStatusBadge status={user.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            @{user.username} · {user.email}
          </p>
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Họ tên</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as UserStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <dl className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">CreatedAt</dt>
              <dd>{formatDateTime(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">LastLoginAt</dt>
              <dd>
                {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              Lưu thay đổi
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmLock(true)}
              disabled={user.id === currentUserId}
            >
              {user.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa"}
            </Button>
          </div>

          <div className="space-y-2 rounded-xl border p-4">
            <h3 className="font-medium">Reset password</h3>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="password"
                placeholder="Mật khẩu mới (≥ 6 ký tự)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button
                variant="secondary"
                disabled={resetMut.isPending || newPassword.length < 6}
                onClick={() => resetMut.mutate()}
              >
                Đặt lại
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-3 pt-4">
          <p className="text-muted-foreground text-sm">
            Effective permissions = hợp nhất tất cả role đã chọn.
          </p>
          <div className="space-y-2 rounded-xl border p-4">
            {allRoles.map((r) => {
              const checked = roleIds.includes(r.id);
              return (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setRoleIds((ids) =>
                        checked
                          ? ids.filter((x) => x !== r.id)
                          : [...ids, r.id],
                      )
                    }
                  />
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground text-xs">{r.code}</span>
                </label>
              );
            })}
          </div>
          <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
            Lưu roles
          </Button>
          <div className="text-muted-foreground text-xs">
            Hiện tại: {roles.map((r) => r.name).join(", ") || "—"}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="pt-4">
          <p className="text-muted-foreground mb-3 text-sm">
            Quyền hiệu lực (chỉ đọc) — không grant trực tiếp cho user.
          </p>
          <div className="max-h-96 overflow-y-auto rounded-xl border p-3 font-mono text-xs">
            {permissions.length === 0 ? (
              <p>Không có permission</p>
            ) : (
              <ul className="space-y-1">
                {permissions.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          {activityLoading ? (
            <p className="text-muted-foreground text-sm">Đang tải…</p>
          ) : activity.length === 0 ? (
            <p className="text-muted-foreground text-sm">Chưa có hoạt động</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((log) => (
                <li
                  key={log.id}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="font-medium">{log.action}</div>
                  <div className="text-muted-foreground text-xs">
                    {formatDateTime(log.createdAt)} · {log.targetType}
                    {log.targetId ? ` #${log.targetId.slice(0, 8)}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmLock} onOpenChange={setConfirmLock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.status === "ACTIVE" ? "Khóa tài khoản?" : "Mở khóa?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.status === "ACTIVE"
                ? "User sẽ không thể đăng nhập và gọi API bảo vệ."
                : "Khôi phục trạng thái ACTIVE."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const next =
                  user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                accessApi
                  .updateUser(id, { status: next })
                  .then(async () => {
                    await qc.invalidateQueries({
                      queryKey: ["access", "user", id],
                    });
                    setConfirmLock(false);
                  })
                  .catch((err) => {
                    setError(
                      err instanceof ApiError ? err.message : "Thất bại",
                    );
                  });
              }}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
