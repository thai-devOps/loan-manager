import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DATE_RANGE_PRESET_OPTIONS,
  type DateRangePreset,
} from "@/features/finance/lib/date-range";
import { cn } from "@/lib/utils";

export function PeriodFilter({
  preset,
  from,
  to,
  onPresetChange,
  onCustomRangeChange,
  className,
  id = "period-filter",
}: {
  preset: DateRangePreset;
  from: string;
  to: string;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange: (from: string, to: string) => void;
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Select
          value={preset}
          onValueChange={(v) => onPresetChange(v as DateRangePreset)}
        >
          <SelectTrigger
            id={id}
            aria-label="Khoảng thời gian"
            className="w-full min-w-[10.5rem] sm:w-[11.5rem]"
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
    </div>
  );
}
