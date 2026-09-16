import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Upload, Database, Sprout, RefreshCw } from "lucide-react";
import { DeleteIcon } from "@/components/icons";
import { AppHeader } from "@/components/layout/app-header";
import { ProfileModuleChrome } from "@/features/profile/profile-layout";
import { StatsBlockSkeleton } from "@/components/common/loading-skeletons";
import { PageShell, StatCard } from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useImportBackupMutation,
  useResetDatabaseMutation,
  useSeedDemoMutation,
} from "@/api/mutations";
import { useStatsQuery } from "@/api/queries";
import {
  downloadBackupJson,
  exportBackup,
  parseAndValidateBackup,
} from "@/lib/backup";

export function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);

  const statsQ = useStatsQuery();
  const seedMutation = useSeedDemoMutation();
  const resetMutation = useResetDatabaseMutation();
  const importMutation = useImportBackupMutation();

  const borrowers = statsQ.data?.borrowers ?? 0;
  const loans = statsQ.data?.loans ?? 0;
  const transactions = statsQ.data?.transactions ?? 0;
  const schedules = statsQ.data?.schedules ?? 0;

  async function handleExport() {
    setError(null);
    try {
      const payload = await exportBackup();
      downloadBackupJson(payload);
      setMessage("Đã xuất file backup JSON");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xuất backup thất bại");
    }
  }

  function handleFileChange(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        parseAndValidateBackup(text);
        setPendingRestore(text);
        setError(null);
      } catch (e) {
        setPendingRestore(null);
        setError(e instanceof Error ? e.message : "File không hợp lệ");
      }
    };
    reader.readAsText(file);
  }

  async function confirmRestore() {
    if (!pendingRestore) return;
    try {
      const payload = parseAndValidateBackup(pendingRestore);
      await importMutation.mutateAsync(payload);
      setPendingRestore(null);
      setMessage("Đã khôi phục dữ liệu từ backup");
      setError(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khôi phục thất bại");
    }
  }

  async function handleReset() {
    await resetMutation.mutateAsync();
    setMessage("Đã xóa toàn bộ dữ liệu");
    setError(null);
  }

  async function handleSeed() {
    try {
      await seedMutation.mutateAsync(false);
      setMessage("Đã tạo dữ liệu mẫu");
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Database đã có dữ liệu. Hãy Reset trước nếu muốn seed lại, hoặc dùng 'Ghi đè seed'.",
      );
    }
  }

  async function handleForceSeed() {
    await seedMutation.mutateAsync(true);
    setMessage("Đã ghi đè và tạo lại dữ liệu mẫu");
    setError(null);
  }

  return (
    <PageShell
      header={
        <AppHeader
          title="Cài đặt"
          description="Backup, restore và quản lý database MongoDB"
        />
      }
      subNav={<ProfileModuleChrome />}
    >
      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          {error ?? message}
        </div>
      )}

      {statsQ.isLoading ? (
        <StatsBlockSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Số người vay" value={String(borrowers)} />
          <StatCard title="Số khoản vay" value={String(loans)} />
          <StatCard title="Số giao dịch" value={String(transactions)} />
          <StatCard title="Số kỳ lịch thu" value={String(schedules)} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Theo dõi đồng bộ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Xem hàng đợi offline, lỗi sync và conflict giữa dữ liệu cục bộ
              với máy chủ.
            </p>
            <Button asChild variant="secondary">
              <Link to="/profile/sync">
                <RefreshCw className="size-4" />
                Mở trang đồng bộ
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backup dữ liệu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Xuất toàn bộ dữ liệu MongoDB thành file JSON để lưu trữ.
            </p>
            <Button onClick={() => void handleExport()}>
              <Download className="size-4" />
              Export JSON
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Restore dữ liệu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Import JSON. Dữ liệu hiện tại sẽ bị ghi đè sau khi xác nhận.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="block w-full text-sm"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            <AlertDialog
              open={pendingRestore !== null}
              onOpenChange={(open) => {
                if (!open) setPendingRestore(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận khôi phục?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Toàn bộ dữ liệu hiện tại sẽ bị xóa và thay bằng dữ liệu
                    trong file backup. Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={importMutation.isPending}
                    onClick={() => void confirmRestore()}
                  >
                    <Upload className="size-4" />
                    Ghi đè & khôi phục
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dữ liệu mẫu (dev)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tạo sẵn người vay, khoản vay và giao dịch để kiểm thử UI.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={seedMutation.isPending}
                onClick={() => void handleSeed()}
              >
                <Sprout className="size-4" />
                Seed nếu trống
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={seedMutation.isPending}>
                    Ghi đè seed
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Ghi đè bằng dữ liệu mẫu?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Xóa toàn bộ dữ liệu hiện tại rồi tạo lại seed demo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleForceSeed()}>
                      Đồng ý
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reset database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Xóa toàn bộ người vay, khoản vay, lịch thu và giao dịch trên
              MongoDB.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={resetMutation.isPending}
                >
                  <DeleteIcon />
                  Reset database
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa toàn bộ dữ liệu?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cảnh báo: dữ liệu sẽ bị xóa vĩnh viễn trên MongoDB. Hãy
                    Export backup trước nếu cần giữ lại.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => void handleReset()}
                  >
                    Xóa tất cả
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Database className="size-3.5" />
              MongoDB Atlas · Vercel API
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
