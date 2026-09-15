import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Parse yyyy-MM-dd as local calendar date (no UTC shift). */
export function parseDateInputValue(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return undefined;
  }
  return date;
}

/** Format Date → yyyy-MM-dd for storage / forms. */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Display dd/MM/yyyy — chuẩn Việt Nam. */
export function formatDateDisplay(value: string): string {
  const date = parseDateInputValue(value);
  if (!date) return "";
  return format(date, "dd/MM/yyyy");
}

export function formatMonthDisplay(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return "";
  const [y, m] = value.split("-");
  return `${m}/${y}`;
}

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** yyyy-MM-dd */
  min?: string;
  /** yyyy-MM-dd */
  max?: string;
};

/**
 * Date picker chuẩn người Việt: hiển thị dd/MM/yyyy, lịch tiếng Việt,
 * tuần bắt đầu thứ Hai. Giá trị lưu vẫn là yyyy-MM-dd.
 */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Chọn ngày",
  disabled,
  className,
  min,
  max,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseDateInputValue(value), [value]);
  const minDate = useMemo(
    () => (min ? parseDateInputValue(min) : undefined),
    [min],
  );
  const maxDate = useMemo(
    () => (max ? parseDateInputValue(max) : undefined),
    [max],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start px-3 text-left font-normal tabular-nums",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          {value ? formatDateDisplay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(2000, 0)}
          endMonth={new Date(new Date().getFullYear() + 15, 11)}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          onSelect={(date) => {
            if (!date) return;
            onChange(toDateInputValue(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

type MonthPickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const MONTH_LABELS = [
  "Thg 1",
  "Thg 2",
  "Thg 3",
  "Thg 4",
  "Thg 5",
  "Thg 6",
  "Thg 7",
  "Thg 8",
  "Thg 9",
  "Thg 10",
  "Thg 11",
  "Thg 12",
];

/**
 * Month picker chuẩn VN: hiển thị MM/yyyy (vd. 09/2026).
 * Giá trị lưu yyyy-MM.
 */
export function MonthPicker({
  id,
  value,
  onChange,
  placeholder = "Chọn tháng",
  disabled,
  className,
}: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(value)) return null;
    const [y, m] = value.split("-").map(Number);
    return { year: y!, month: m! };
  }, [value]);

  const [viewYear, setViewYear] = useState(
    () => parsed?.year ?? new Date().getFullYear(),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setViewYear(parsed?.year ?? new Date().getFullYear());
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start px-3 text-left font-normal tabular-nums",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          {value ? formatMonthDisplay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[17.5rem] p-3" align="start">
        <div className="mb-3 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setViewYear((y) => y - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="text-sm font-medium">Năm {viewYear}</p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setViewYear((y) => y + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_LABELS.map((label, index) => {
            const month = index + 1;
            const selected =
              parsed?.year === viewYear && parsed.month === month;
            return (
              <Button
                key={label}
                type="button"
                size="sm"
                variant={selected ? "default" : "ghost"}
                className="h-9"
                onClick={() => {
                  onChange(
                    `${viewYear}-${String(month).padStart(2, "0")}`,
                  );
                  setOpen(false);
                }}
              >
                {label}
              </Button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {format(new Date(viewYear, (parsed?.month ?? 1) - 1, 1), "LLLL yyyy", {
            locale: vi,
          })}
        </p>
      </PopoverContent>
    </Popover>
  );
}
