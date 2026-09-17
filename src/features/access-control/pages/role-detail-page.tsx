import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { DetailPageSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/api/client";
import { MODULES, SYSTEM_ROLE_CODES } from "@/config/permissions";
import { useAuthStore } from "@/stores/auth.store";
import { accessApi, type AppRole } from "../services/access-api";

export function RoleDetailPage() {
  const { id = "" } = useParams();

  const roleQ = useQuery({
    queryKey: ["access", "role", id],
    queryFn: () => accessApi.getRole(id),
    enabled: Boolean(id),
  });

  const catalogQ = useQuery({
    queryKey: ["access", "permissions-catalog"],
    queryFn: () => accessApi.getPermissionsCatalog(),
  });

  if (roleQ.isLoading || catalogQ.isLoading) return <DetailPageSkeleton />;
  if (!roleQ.data || !catalogQ.data) {
    return <p className="text-destructive text-sm">Không tìm thấy role</p>;
  }

  return (
    <RoleDetailEditor
      key={`${roleQ.data.role.id}:${roleQ.data.role.updatedAt}`}
      id={id}
      role={roleQ.data.role}
      meta={catalogQ.data.meta}
    />
  );
}

function RoleDetailEditor({
  id,
  role,
  meta,
}: {
  id: string;
  role: AppRole;
  meta: Awaited<
    ReturnType<typeof accessApi.getPermissionsCatalog>
  >["meta"];
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [selected, setSelected] = useState(() => new Set(role.permissions));
  const [permSearch, setPermSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredMeta = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return meta;
    return meta.filter(
      (m) =>
        m.code.toLowerCase().includes(q) ||
        (m.resourceLabel?.toLowerCase().includes(q) ?? false) ||
        (m.label?.toLowerCase().includes(q) ?? false),
    );
  }, [meta, permSearch]);

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, typeof filteredMeta>>();
    for (const m of filteredMeta) {
      const mod = m.module ?? "other";
      const res = m.resource ?? "other";
      if (!map.has(mod)) map.set(mod, new Map());
      const resMap = map.get(mod)!;
      if (!resMap.has(res)) resMap.set(res, []);
      resMap.get(res)!.push(m);
    }
    return map;
  }, [filteredMeta]);

  const saveMut = useMutation({
    mutationFn: async () => {
      await accessApi.updateRole(id, {
        name: name.trim(),
        description: description.trim(),
      });
      if (role.code !== SYSTEM_ROLE_CODES.SUPER_ADMIN) {
        await accessApi.setRolePermissions(id, [...selected]);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["access", "role", id] });
      await qc.invalidateQueries({ queryKey: ["access", "roles"] });
      const auth = useAuthStore.getState();
      if (auth.user?.roleIds.includes(id)) {
        await auth.loadMe({ force: true });
      }
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Lưu thất bại");
    },
  });

  const isSuper = role.code === SYSTEM_ROLE_CODES.SUPER_ADMIN;
  const moduleName = (code: string) =>
    MODULES.find((m) => m.code === code)?.name ?? code;

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of filteredMeta) next.add(m.code);
      return next;
    });
  }

  function clearAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of filteredMeta) next.delete(m.code);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/roles" aria-label="Quay lại">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{role.name}</h2>
          <p className="text-muted-foreground font-mono text-xs">{role.code}</p>
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Tên</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Mô tả</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-medium">Permissions</h3>
          {!isSuper ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllVisible}
              >
                Chọn tất cả
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllVisible}
              >
                Bỏ chọn tất cả
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              SUPER_ADMIN có toàn quyền — không chỉnh sửa danh sách
            </p>
          )}
        </div>
        <Input
          placeholder="Tìm permission…"
          value={permSearch}
          onChange={(e) => setPermSearch(e.target.value)}
          disabled={isSuper}
        />

        <div className="space-y-6">
          {[...grouped.entries()].map(([mod, resources]) => (
            <section key={mod} className="space-y-3">
              <h4 className="border-b pb-1 text-sm font-semibold tracking-wide uppercase">
                {moduleName(mod)}
              </h4>
              {[...resources.entries()].map(([res, items]) => (
                <div key={res} className="space-y-2 pl-1">
                  <p className="text-sm font-medium">
                    {items[0]?.resourceLabel ?? res}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {items.map((item) => (
                      <label
                        key={item.code}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          disabled={isSuper}
                          checked={isSuper || selected.has(item.code)}
                          onChange={() => toggle(item.code)}
                        />
                        {item.label ?? item.action}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>

      <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
        {saveMut.isPending ? "Đang lưu…" : "Lưu"}
      </Button>
    </div>
  );
}
