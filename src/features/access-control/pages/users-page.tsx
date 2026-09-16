import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { EditIcon } from "@/components/icons";
import { EmptyState } from "@/components/common/status-badges";
import { TablePageSkeleton } from "@/components/common/loading-skeletons";
import {
  MobileList,
  MobileListCard,
} from "@/components/common/mobile-list-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveFormFooter,
  ResponsiveFormShell,
} from "@/components/ui/responsive-form-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/api/client";
import { formatDateTime } from "@/lib/date";
import { accessApi, type PublicUser } from "../services/access-api";
import { UserStatusBadge } from "../components/user-status-badge";

function formatMaybeDate(value?: string) {
  if (!value) return "—";
  try {
    return formatDateTime(value);
  } catch {
    return value;
  }
}

export function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    roleIds: [] as string[],
  });

  const usersQ = useQuery({
    queryKey: ["access", "users", search, statusFilter, roleFilter],
    queryFn: () =>
      accessApi.listUsers({
        q: search.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        roleId: roleFilter === "all" ? undefined : roleFilter,
      }),
  });

  const rolesQ = useQuery({
    queryKey: ["access", "roles"],
    queryFn: () => accessApi.listRoles(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      accessApi.createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        roleIds: form.roleIds,
      }),
    onSuccess: async () => {
      setDialogOpen(false);
      setForm({
        name: "",
        email: "",
        username: "",
        password: "",
        roleIds: [],
      });
      await qc.invalidateQueries({ queryKey: ["access", "users"] });
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : "Không tạo được");
    },
  });

  const roles = rolesQ.data?.roles ?? [];
  const roleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) map.set(r.id, r.name);
    return map;
  }, [roles]);

  const users = usersQ.data?.users ?? [];

  function roleLabels(user: PublicUser) {
    if (user.roleIds.length === 0) return "—";
    return user.roleIds
      .map((id) => roleNameById.get(id) ?? id.slice(0, 6))
      .join(", ");
  }

  if (usersQ.isLoading) return <TablePageSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Người dùng</h2>
          <p className="text-muted-foreground text-sm">
            Quản lý tài khoản và vai trò truy cập
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Thêm người dùng
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Tìm theo tên, email, username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="ACTIVE">Hoạt động</SelectItem>
            <SelectItem value="INACTIVE">Vô hiệu</SelectItem>
            <SelectItem value="SUSPENDED">Tạm khóa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả role</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {usersQ.isError ? (
        <p className="text-destructive text-sm">
          {(usersQ.error as Error).message}
        </p>
      ) : users.length === 0 ? (
        <EmptyState
          title="Chưa có người dùng"
          description="Thêm người dùng đầu tiên."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email / Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{u.email}</div>
                      <div className="text-muted-foreground text-xs">
                        @{u.username}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {roleLabels(u)}
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatMaybeDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatMaybeDate(u.lastLoginAt)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/users/${u.id}`} aria-label="Xem">
                          <EditIcon />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <MobileList className="md:hidden">
            {users.map((u) => (
              <MobileListCard
                key={u.id}
                title={u.name}
                subtitle={`@${u.username} · ${roleLabels(u)}`}
                badge={<UserStatusBadge status={u.status} />}
                to={`/admin/users/${u.id}`}
              />
            ))}
          </MobileList>
        </>
      )}

      <ResponsiveFormShell
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Thêm người dùng"
      >
        <div className="grid gap-3 px-5 py-4 sm:px-6">
          <div className="grid gap-1.5">
            <Label htmlFor="u-name">Họ tên</Label>
            <Input
              id="u-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="u-email">Email</Label>
            <Input
              id="u-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="u-username">Username</Label>
            <Input
              id="u-username"
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="u-password">Mật khẩu</Label>
            <Input
              id="u-password"
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Roles</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
              {roles.map((r) => {
                const checked = form.roleIds.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          roleIds: checked
                            ? f.roleIds.filter((id) => id !== r.id)
                            : [...f.roleIds, r.id],
                        }))
                      }
                    />
                    {r.name}
                    <span className="text-muted-foreground text-xs">
                      ({r.code})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          {formError ? (
            <p className="text-destructive text-sm">{formError}</p>
          ) : null}
        </div>
        <ResponsiveFormFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Hủy
          </Button>
          <Button
            disabled={createMut.isPending}
            onClick={() => {
              setFormError(null);
              createMut.mutate();
            }}
          >
            {createMut.isPending ? "Đang tạo…" : "Tạo"}
          </Button>
        </ResponsiveFormFooter>
      </ResponsiveFormShell>
    </div>
  );
}
