import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid, LogOut, RefreshCw, Settings, UserRound } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { ProfileModuleChrome } from "@/features/profile/profile-layout";
import { PageShell } from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth.store";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { SyncStatusIndicator } from "@/components/common/sync-status-indicator";

export function ProfilePage() {
  const navigate = useNavigate();
  const username = useAuthStore((s) => s.session?.username);
  const logout = useAuthStore((s) => s.logout);
  const { isOnline, pendingCount, lastSyncAt, hasSyncError } = useSyncStatus();

  function handleLogout() {
    logout();
    void navigate("/login", { replace: true });
  }

  let syncHint = "Đã đồng bộ";
  if (!isOnline) syncHint = "Đang offline";
  else if (hasSyncError) syncHint = "Có lỗi đồng bộ";
  else if (pendingCount > 0) syncHint = `${pendingCount} thay đổi chờ`;
  else if (lastSyncAt) {
    try {
      syncHint = `Lần sync: ${new Date(lastSyncAt).toLocaleString()}`;
    } catch {
      syncHint = "Đã đồng bộ";
    }
  }

  return (
    <PageShell
      header={
        <AppHeader
          title="Tài khoản"
          description="Quản lý hồ sơ, cài đặt và đồng bộ dữ liệu"
        />
      }
      subNav={<ProfileModuleChrome />}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted">
              <UserRound className="size-5 text-muted-foreground" />
            </span>
            <span className="min-w-0">
              <span className="block truncate">{username ?? "Người dùng"}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                Đã đăng nhập
              </span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild>
            <Link to="/apps">
              <LayoutGrid className="size-4" />
              Về menu chính
            </Link>
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="size-4" />
            Đăng xuất
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cài đặt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Backup, restore và quản lý database MongoDB.
            </p>
            <Button asChild variant="secondary">
              <Link to="/profile/settings">
                <Settings className="size-4" />
                Mở cài đặt
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span>Đồng bộ</span>
              <SyncStatusIndicator className="sm:flex" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{syncHint}</p>
            <Button asChild variant="secondary">
              <Link to="/profile/sync">
                <RefreshCw className="size-4" />
                Theo dõi đồng bộ
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
