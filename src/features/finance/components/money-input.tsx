import { Input } from "@/components/ui/input";
import { formatCurrency, parseCurrencyInput } from "@/lib/currency";
import { cn } from "@/lib/utils";

type MoneyInputProps = {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function MoneyInput({
  id,
  value,
  onChange,
  placeholder = "0",
  className,
  disabled,
}: MoneyInputProps) {
  const display = value > 0 ? formatCurrency(value).replace(" ₫", "") : "";

  return (
    <div className="space-y-1">
      <Input
        id={id}
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder}
        className={cn(className)}
        value={display}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && value > 0) {
            const el = e.currentTarget;
            const allSelected =
              el.selectionStart === 0 &&
              el.selectionEnd === el.value.length;
            if (allSelected) {
              e.preventDefault();
              onChange(0);
            }
          }
        }}
        onChange={(e) => onChange(parseCurrencyInput(e.target.value))}
      />
      {value > 0 && (
        <p className="text-xs text-muted-foreground">{formatCurrency(value)}</p>
      )}
    </div>
  );
}
