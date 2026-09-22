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

  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={preset}
          onValueChange={(v) => onPresetChange(v as DateRangePreset)}
        >
          <SelectTrigger
            id={id}
            aria-label="Khoảng thời gian"
            className="w-full min-w-[10.5rem] sm:w-[12.5rem]"
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
              className="w-full min-w-[8.5rem] sm:w-[9.5rem]"
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
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker
            id={`${id}-from`}
            value={from}
            onChange={(v) => {
              const nextTo = v > to ? v : to;
              onCustomRangeChange(v, nextTo);
            }}
            className="w-[9.5rem]"
          />
          <span className="text-sm text-muted-foreground">đến</span>
          <DatePicker
            id={`${id}-to`}
            value={to}
            onChange={(v) => {
              const nextFrom = v < from ? v : from;
              onCustomRangeChange(nextFrom, v);
            }}
            className="w-[9.5rem]"
          />
        </div>
      )}

      {showPayday && (
        <p className="text-xs text-muted-foreground sm:basis-full sm:text-right">
          Từ ngày lương đến trước kỳ lương tiếp theo:{" "}
          {formatDateDisplay(from)} – {formatDateDisplay(to)}
        </p>
      )}
    </div>
  );
}
