import { DatePicker, formatDateDisplay } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DATE_RANGE_PRESET_OPTIONS,
  isSalaryCyclePreset,
  type DateRangePreset,
} from "@/features/finance/lib/date-range";
import { SALARY_PAYDAY_OPTIONS } from "@/features/finance/lib/finance-prefs";
import { cn } from "@/lib/utils";

export function PeriodFilter({
  preset,
  from,
  to,
  salaryPayday,
  onPresetChange,
  onCustomRangeChange,
  onSalaryPaydayChange,
  className,
  id = "period-filter",
}: {
  preset: DateRangePreset;
  from: string;
  to: string;
  salaryPayday: number;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange: (from: string, to: string) => void;
  onSalaryPaydayChange: (day: number) => void;
  className?: string;
  id?: string;
}) {
  const showPayday = isSalaryCyclePreset(preset);
  const rangeLabel = `${formatDateDisplay(from)} – ${formatDateDisplay(to)}`;

  return (
    <div
      className={cn("flex flex-nowrap items-center gap-1.5", className)}
      title={
        showPayday
          ? `Từ ngày lương đến trước kỳ lương tiếp theo: ${rangeLabel}`
          : rangeLabel
      }
    >
      <Select
        value={preset}
        onValueChange={(v) => onPresetChange(v as DateRangePreset)}
      >
        <SelectTrigger
          id={id}
          aria-label="Khoảng thời gian"
          className="h-8 w-[9.75rem] shrink-0 px-2 text-xs md:text-sm"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_PRESET_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showPayday && (
        <Select
          value={String(salaryPayday)}
          onValueChange={(v) => onSalaryPaydayChange(Number(v))}
        >
          <SelectTrigger
            id={`${id}-payday`}
            aria-label="Ngày nhận lương"
            className="h-8 w-[6.75rem] shrink-0 px-2 text-xs md:text-sm"
          >
            <SelectValue placeholder="Ngày lương" />
          </SelectTrigger>
          <SelectContent>
            {SALARY_PAYDAY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {preset === "custom" && (
        <>
          <DatePicker
            id={`${id}-from`}
            value={from}
            onChange={(v) => {
              const nextTo = v > to ? v : to;
              onCustomRangeChange(v, nextTo);
            }}
            className="h-8 w-[8.25rem] shrink-0 px-2 text-xs"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <DatePicker
            id={`${id}-to`}
            value={to}
            onChange={(v) => {
              const nextFrom = v < from ? v : from;
              onCustomRangeChange(nextFrom, v);
            }}
            className="h-8 w-[8.25rem] shrink-0 px-2 text-xs"
          />
        </>
      )}

      <span className="hidden whitespace-nowrap text-xs text-muted-foreground xl:inline">
        {rangeLabel}
      </span>
    </div>
  );
}
