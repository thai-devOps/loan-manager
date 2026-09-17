import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TablePageSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/api/client";
import { MODULES, SYSTEM_ROLE_CODES } from "@/config/permissions";
import { useAuthStore } from "@/stores/auth.store";
import { accessApi, type AppRole } from "../services/access-api";

const ACTIONS = ["view", "create", "update", "delete", "report"] as const;

const MATRIX_MODULES = [
  "finance",
  "asset",
  "loan",
  "gold",
  "fleet",
  "report",
] as const;

/** Map matrix cell → concrete permission codes. */
function permissionsForModuleAction(
  module: string,
  action: string,
  all: string[],
): string[] {
  if (action === "report") {
    // Cross-module report flag: report.<module>.view (e.g. report.loan.view)
    const cross = `report.${module}.view`;
    if (all.includes(cross)) return [cross];
    // Fallback: <module>.report.view
    return all.filter(
      (p) => p.startsWith(`${module}.`) && p.includes(".report."),
    );
  }

  if (module === "report" && action === "view") {
    return all.filter((p) => p.startsWith("report.") && p.endsWith(".view"));
  }

  return all.filter(
    (p) => p.startsWith(`${module}.`) && p.endsWith(`.${action}`),
  );
}

function moduleHasAction(module: string, action: string, all: string[]) {
  return permissionsForModuleAction(module, action, all).length > 0;
}

export function AccessMatrixPage() {
  const rolesQ = useQuery({
    queryKey: ["access", "roles"],
    queryFn: () => accessApi.listRoles(),
  });
  const catalogQ = useQuery({
    queryKey: ["access", "permissions-catalog"],
    queryFn: () => accessApi.getPermissionsCatalog(),
  });

  const roles = rolesQ.data?.roles ?? [];
  const [roleId, setRoleId] = useState(() => roles[0]?.id ?? "");

  const effectiveRoleId = roleId || roles[0]?.id || "";
  const currentRole = useMemo(
    () => roles.find((r) => r.id === effectiveRoleId),
    [roles, effectiveRoleId],
  );

  if (rolesQ.isLoading || catalogQ.isLoading) return <TablePageSkeleton />;

  if (!currentRole || !catalogQ.data) {
    return <p className="text-muted-foreground text-sm">Chưa có role</p>;
  }

  return (
    <AccessMatrixEditor
      key={`${currentRole.id}:${currentRole.updatedAt}`}
      roles={roles}
      roleId={effectiveRoleId}
      onRoleIdChange={setRoleId}
      currentRole={currentRole}
      allPerms={catalogQ.data.permissions}
    />
  );
}

function AccessMatrixEditor({
  roles,
  roleId,
  onRoleIdChange,
  currentRole,
  allPerms,
}: {
  roles: AppRole[];
  roleId: string;
  onRoleIdChange: (id: string) => void;
  currentRole: AppRole;
  allPerms: string[];
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(
    () => new Set(currentRole.permissions),
  );
  const [error, setError] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: () => accessApi.setRolePermissions(roleId, [...selected]),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["access", "roles"] });
      const auth = useAuthStore.getState();
      if (auth.user?.roleIds.includes(roleId)) {
        await auth.loadMe({ force: true });
      }
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Lưu thất bại");
    },
  });

  const isSuper = currentRole.code === SYSTEM_ROLE_CODES.SUPER_ADMIN;

  function cellChecked(module: string, action: string): boolean {
    if (isSuper) return true;
    const needed = permissionsForModuleAction(module, action, allPerms);
    if (needed.length === 0) return false;
    return needed.every((p) => selected.has(p));
  }

  function toggleCell(module: string, action: string) {
    if (isSuper) return;
    const needed = permissionsForModuleAction(module, action, allPerms);
    if (needed.length === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = needed.every((p) => next.has(p));
      if (allOn) needed.forEach((p) => next.delete(p));
      else needed.forEach((p) => next.add(p));
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ma trận quyền</h2>
          <p className="text-muted-foreground text-sm">
            Bật/tắt quyền theo module và action cho một role
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={roleId} onValueChange={onRoleIdChange}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Chọn role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!roleId || isSuper || saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            Lưu
          </Button>
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {isSuper ? (
        <p className="text-muted-foreground text-sm">
          SUPER_ADMIN luôn có toàn quyền.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              {ACTIONS.map((a) => (
                <TableHead key={a} className="text-center capitalize">
                  {a}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MODULES.filter((m) =>
              (MATRIX_MODULES as readonly string[]).includes(m.code),
            ).map((m) => (
              <TableRow key={m.code}>
                <TableCell className="font-medium">{m.name}</TableCell>
                {ACTIONS.map((action) => {
                  const available = moduleHasAction(m.code, action, allPerms);
                  if (!available) {
                    return (
                      <TableCell
                        key={action}
                        className="text-muted-foreground text-center"
                      >
                        —
                      </TableCell>
                    );
                  }
                  const checked = cellChecked(m.code, action);
                  return (
                    <TableCell key={action} className="text-center">
                      <input
                        type="checkbox"
                        disabled={isSuper}
                        checked={checked}
                        onChange={() => toggleCell(m.code, action)}
                        aria-label={`${m.name} ${action}`}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
