import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "@/features/ride-admin/lib/column-visibility";

type Props<T extends string> = {
  columns: ColumnDef<T>[];
  isVisible: (id: T) => boolean;
  toggle: (id: T, on: boolean) => void;
  reset: () => void;
};

export function ColumnVisibilityMenu<T extends string>({
  columns,
  isVisible,
  toggle,
  reset,
}: Props<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hidden gap-1.5 lg:inline-flex"
        >
          <Columns3 className="size-4" />
          Cột hiển thị
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Cột hiển thị</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            checked={isVisible(col.id)}
            disabled={col.locked}
            onCheckedChange={(checked) => toggle(col.id, checked === true)}
            onSelect={(e) => e.preventDefault()}
          >
            {col.locked ? `${col.label} (cố định)` : col.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => reset()}>
          Về mặc định
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
