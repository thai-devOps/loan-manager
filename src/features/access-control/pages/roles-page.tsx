import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
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
import { accessApi } from "../services/access-api";

export function RolesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [preset, setPreset] = useState<string>("none");
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
  });

  const rolesQ = useQuery({
    queryKey: ["access", "roles"],
    queryFn: () => accessApi.listRoles(),
  });

  const catalogQ = useQuery({
    queryKey: ["access", "permissions-catalog"],
    queryFn: () => accessApi.getPermissionsCatalog(),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const presets = catalogQ.data?.presets ?? {};
      const permissions =
        preset !== "none" && presets[preset] ? presets[preset] : [];
      return accessApi.createRole({
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim() || undefined,
        permissions,
      });
    },
    onSuccess: async (data) => {
      setDialogOpen(false);
      await qc.invalidateQueries({ queryKey: ["access", "roles"] });
      window.location.href = `/admin/roles/${data.role.id}`;
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : "Không tạo được");
    },
  });

  const roles = useMemo(() => {
    const list = rolesQ.data?.roles ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    );
  }, [rolesQ.data, search]);

  if (rolesQ.isLoading) return <TablePageSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Vai trò</h2>
          <p className="text-muted-foreground text-sm">
            Role gom permission — không hard-code trong UI
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Thêm role
        </Button>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          placeholder="Tìm role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {roles.length === 0 ? (
        <EmptyState title="Chưa có role" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        to={`/admin/roles/${r.id}`}
                        className="font-medium hover:underline"
                      >
                        {r.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell>{r.permissions.length}</TableCell>
                    <TableCell>{r.isSystemRole ? "Yes" : "No"}</TableCell>
                    <TableCell>{r.active ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <MobileList className="md:hidden">
            {roles.map((r) => (
              <MobileListCard
                key={r.id}
                title={r.name}
                subtitle={`${r.code} · ${r.permissions.length} permissions`}
                to={`/admin/roles/${r.id}`}
              />
            ))}
          </MobileList>
        </>
      )}

      <ResponsiveFormShell
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Tạo role"
      >
        <div className="grid gap-3 px-5 py-4 sm:px-6">
          <div className="grid gap-1.5">
            <Label>Tên</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Code</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="CUSTOM_MANAGER"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Mô tả</Label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Preset (tuỳ chọn)</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không dùng preset</SelectItem>
                <SelectItem value="Viewer">Viewer</SelectItem>
                <SelectItem value="Operator">Operator</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Administrator">Administrator</SelectItem>
              </SelectContent>
            </Select>
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
            onClick={() => createMut.mutate()}
          >
            Tạo
          </Button>
        </ResponsiveFormFooter>
      </ResponsiveFormShell>
    </div>
  );
}
