import { useState } from "react";
import { Plus } from "lucide-react";
import { DeleteIcon, EditIcon } from "@/components/icons";
import { EmptyState } from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { AssetFormDialog } from "@/features/assets/components/asset-form-dialog";
import { ASSET_TYPE_LABELS, GOLD_TYPE_LABELS, formatGoldQuantity } from "@/features/assets/lib/gold-units";
import { useManualAssetsQuery } from "@/api/queries";
import { useDeleteManualAssetMutation } from "@/api/mutations";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { ManualAsset } from "@/types/assets";
import { EMPTY_ARRAY } from "@/lib/empty";

export function AssetsHoldingsPage() {
  const assetsQ = useManualAssetsQuery();
  const deleteM = useDeleteManualAssetMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManualAsset | null>(null);
  const [deleting, setDeleting] = useState<ManualAsset | null>(null);

  const assets = assetsQ.data ?? EMPTY_ARRAY;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Danh mục tài sản</h2>
          <p className="text-sm text-muted-foreground">
            Quản lý tiền mặt, ngân hàng, ví và tài sản khác. Vốn đang cho vay
            lấy từ module Khoản vay.
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Thêm tài sản
        </Button>
      </div>

      {assetsQ.isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      ) : assetsQ.isError ? (
        <EmptyState
          title="Không thể tải dữ liệu tài sản"
          description="Thử lại sau vài giây."
          action={
            <Button variant="outline" onClick={() => void assetsQ.refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : assets.length === 0 ? (
        <EmptyState
          title="Chưa có tài sản được quản lý"
          description="Thêm tiền mặt hoặc tài khoản ngân hàng để theo dõi tiền khả dụng."
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              Thêm tài sản
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Thao tác</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead>Ngày cập nhật</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(asset);
                            setDialogOpen(true);
                          }}
                        >
                          <EditIcon />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleting(asset)}
                        >
                          <DeleteIcon />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <p>{asset.name}</p>
                        {asset.type === "gold" && asset.goldDetails && (
                          <p className="text-xs font-normal text-muted-foreground">
                            {GOLD_TYPE_LABELS[asset.goldDetails.goldType]} ·{" "}
                            {formatGoldQuantity(asset.goldDetails.quantityInPhan)}
                            {asset.goldDetails.seller
                              ? ` · ${asset.goldDetails.seller}`
                              : ""}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{ASSET_TYPE_LABELS[asset.type]}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(asset.value)}
                    </TableCell>
                    <TableCell>
                      {formatDate(asset.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ASSET_TYPE_LABELS[asset.type]}
                    </p>
                    {asset.type === "gold" && asset.goldDetails && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {GOLD_TYPE_LABELS[asset.goldDetails.goldType]} ·{" "}
                        {formatGoldQuantity(asset.goldDetails.quantityInPhan)}
                        {asset.goldDetails.seller
                          ? ` · ${asset.goldDetails.seller}`
                          : ""}
                      </p>
                    )}
                  </div>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(asset.value)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Cập nhật{" "}
                    {formatDate(asset.updatedAt)}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(asset);
                        setDialogOpen(true);
                      }}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleting(asset)}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <AssetFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tài sản?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa “{deleting?.name}”. Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                void deleteM.mutateAsync(deleting.id).then(() => setDeleting(null));
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
