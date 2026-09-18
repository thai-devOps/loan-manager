import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/features/auth/can";
import {
  AdminFilterBar,
  filterControlClass,
  filterSearchClass,
  filterSearchFormClass,
} from "@/features/ride-admin/components/admin-filter-bar";
import { CustomerStatusBadge } from "@/features/ride-admin/components/customer-status-badge";
import { CustomerFormDialog } from "@/features/ride-admin/pages/customer-form-dialog";
import { customerAdminService } from "@/features/ride-admin/services/admin-api";
import { CUSTOMER_STATUS_LABELS } from "@/features/ride/lib/labels";
import type { RideCustomer, RideCustomerStatus } from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { PERMISSIONS } from "@/config/permissions";
import { formatRideTimestamp } from "@/features/ride-admin/lib/format";

const STATUSES = Object.keys(CUSTOMER_STATUS_LABELS) as RideCustomerStatus[];

export function RideAdminCustomersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<RideCustomer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [formOpen, setFormOpen] = useState(false);

  const status = searchParams.get("status") ?? "";

  function patchParams(patch: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "all") next.delete(k);
      else next.set(k, v);
    }
    setSearchParams(next);
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        setError(null);
        try {
          const list = await customerAdminService.list({
            q: searchParams.get("q") || undefined,
            status: status || undefined,
          });
          if (!cancelled) setRows(list);
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof ApiError ? e.message : "Không tải khách hàng");
            setRows([]);
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [status, searchParams]);

  const qParam = searchParams.get("q") ?? "";
  const activeFilterCount = [qParam, status].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Khách hàng</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            CRM đơn giản — lịch sử chuyến và doanh thu
          </p>
        </div>
        <Can permission={PERMISSIONS.FLEET_CUSTOMER_CREATE}>
          <Button
            className="gap-1.5 bg-teal-800 hover:bg-teal-700"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="size-4" />
            Thêm khách
          </Button>
        </Can>
      </div>

      <AdminFilterBar activeCount={activeFilterCount}>
        <form
          className={filterSearchFormClass}
          onSubmit={(e) => {
            e.preventDefault();
            patchParams({ q });
          }}
        >
          <Input
            className={filterSearchClass}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mã / tên / SĐT / email"
          />
          <Button type="submit" size="sm" className="h-9 shrink-0 bg-teal-800 hover:bg-teal-700">
            Tìm
          </Button>
        </form>
        <Select
          value={status || "all"}
          onValueChange={(v) => patchParams({ status: v })}
        >
          <SelectTrigger className={filterControlClass}>
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {CUSTOMER_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterBar>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-3 lg:hidden">
        {rows === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          : rows.length === 0
            ? (
              <p className="text-sm text-muted-foreground">Chưa có khách hàng.</p>
            )
            : rows.map((c) => (
                <Link
                  key={c.id}
                  to={`/admin/customers/${c.id}`}
                  className="block rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {c.customerCode}
                      </p>
                    </div>
                    <CustomerStatusBadge status={c.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{c.phone}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.tripCount} chuyến · {formatCurrency(c.totalSpend || 0)}
                  </p>
                </Link>
              ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-border lg:block">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Mã</th>
              <th className="px-3 py-3 font-medium">Họ tên</th>
              <th className="px-3 py-3 font-medium">SĐT</th>
              <th className="px-3 py-3 font-medium">Chuyến</th>
              <th className="px-3 py-3 font-medium">Doanh thu</th>
              <th className="px-3 py-3 font-medium">Gần nhất</th>
              <th className="px-3 py-3 font-medium">TT</th>
              <th className="px-3 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={8} className="px-3 py-6">
                  <Skeleton className="h-8 w-full" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Chưa có khách hàng.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-b border-border/60">
                  <td className="px-3 py-3 font-mono text-xs">
                    {c.customerCode}
                  </td>
                  <td className="px-3 py-3 font-medium">{c.name}</td>
                  <td className="px-3 py-3">{c.phone}</td>
                  <td className="px-3 py-3">{c.tripCount}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatCurrency(c.totalSpend || 0)}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                    {formatRideTimestamp(c.lastBookingAt)}
                  </td>
                  <td className="px-3 py-3">
                    <CustomerStatusBadge status={c.status} />
                  </td>
                  <td className="px-3 py-3">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/customers/${c.id}`}>Chi tiết</Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(c) => {
          setFormOpen(false);
          void navigate(`/admin/customers/${c.id}`);
        }}
      />
    </div>
  );
}
