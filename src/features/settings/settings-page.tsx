import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Upload, Database, Trash2, Sprout } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
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
import { db } from "@/db/database";
import { clearAllData, seedDemoData, seedIfEmpty } from "@/db/seed";
import {
  downloadBackupJson,
  exportBackup,
  parseAndValidateBackup,
  resetDatabase,
  restoreBackup,
} from "@/lib/backup";

export function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);

  const borrowers = useLiveQuery(() => db.borrowers.count(), []) ?? 0;
  const loans = useLiveQuery(() => db.loans.count(), []) ?? 0;
  const transactions =
    useLiveQuery(() => db.transactions.count(), []) ?? 0;
  const schedules =
    useLiveQuery(() => db.interestSchedules.count(), []) ?? 0;

  async function handleExport() {
    setError(null);
    const payload = await exportBackup();
    downloadBackupJson(payload);
    setMessage("Đã xuất file backup JSON");
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
      await restoreBackup(payload);
      setPendingRestore(null);
      setMessage("Đã khôi phục dữ liệu từ backup");
      setError(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Khôi phục thất bại");
    }
  }

  async function handleReset() {
    await resetDatabase();
    setMessage("Đã xóa toàn bộ dữ liệu");
    setError(null);
  }

  async function handleSeed() {
    const seeded = await seedIfEmpty();
    if (seeded) {
      setMessage("Đã tạo dữ liệu mẫu");
    } else {
      setError(
        "Database đã có dữ liệu. Hãy Reset trước nếu muốn seed lại, hoặc dùng 'Ghi đè seed'.",
      );
    }
  }

  async function handleForceSeed() {
    await clearAllData();
    await seedDemoData();
    setMessage("Đã ghi đè và tạo lại dữ liệu mẫu");
    setError(null);
  }

  return (
    <PageShell
      header={
        <AppHeader
          title="Cài đặt"
          description="Backup, restore và quản lý database local"
        />
      }
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Số người vay" value={String(borrowers)} />
        <StatCard title="Số khoản vay" value={String(loans)} />
        <StatCard title="Số giao dịch" value={String(transactions)} />
        <StatCard title="Số kỳ lịch thu" value={String(schedules)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backup dữ liệu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Xuất toàn bộ IndexedDB thành file JSON để lưu trữ offline.
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
                  <AlertDialogAction onClick={() => void confirmRestore()}>
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
              <Button variant="secondary" onClick={() => void handleSeed()}>
                <Sprout className="size-4" />
                Seed nếu trống
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">Ghi đè seed</Button>
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
              Xóa toàn bộ người vay, khoản vay, lịch thu và giao dịch.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="size-4" />
                  Reset database
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa toàn bộ dữ liệu?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cảnh báo: dữ liệu sẽ bị xóa vĩnh viễn khỏi trình duyệt này.
                    Hãy Export backup trước nếu cần giữ lại.
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
              LoanManagerDB · IndexedDB · local-first
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
