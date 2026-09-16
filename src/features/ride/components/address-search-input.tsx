import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/api/client";
import { geocodingService } from "@/features/ride/services/geocodingService";
import type { GeoSearchResult, Place } from "@/features/ride/types/ride";
import { cn } from "@/lib/utils";

type AddressSearchInputProps = {
  id?: string;
  value: Place;
  onChange: (place: Place) => void;
  placeholder?: string;
  error?: string;
};

export function AddressSearchInput({
  id,
  value,
  onChange,
  placeholder = "Nhập địa chỉ, chọn gợi ý…",
  error,
}: AddressSearchInputProps) {
  const listId = useId();
  const [query, setQuery] = useState(value.address ?? "");
  const [results, setResults] = useState<GeoSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const lastExternalRef = useRef(value.address ?? "");

  // Parent → input only when parent changed externally (not from our own typing)
  useEffect(() => {
    const next = value.address ?? "";
    if (next !== lastExternalRef.current) {
      lastExternalRef.current = next;
      setQuery(next);
    }
  }, [value.address]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function scheduleSearch(text: string) {
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
    }
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchError(null);
      setOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchError(null);
    const reqId = ++requestIdRef.current;
    debounceRef.current = window.setTimeout(() => {
      void geocodingService
        .searchAddress(q)
        .then((list) => {
          if (reqId !== requestIdRef.current) return;
          setResults(list);
          setOpen(list.length > 0);
          if (list.length === 0) {
            setSearchError(
              "Không tìm thấy gợi ý. Thử nhập rõ hơn hoặc gửi yêu cầu thủ công.",
            );
          }
        })
        .catch((e) => {
          if (reqId !== requestIdRef.current) return;
          setResults([]);
          setOpen(false);
          setSearchError(
            e instanceof ApiError
              ? e.message
              : "Không thể tìm địa chỉ lúc này.",
          );
        })
        .finally(() => {
          if (reqId === requestIdRef.current) setSearching(false);
        });
    }, 280);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function pick(item: GeoSearchResult) {
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
    }
    requestIdRef.current += 1;
    lastExternalRef.current = item.label;
    setQuery(item.label);
    setResults([]);
    setOpen(false);
    setSearching(false);
    setSearchError(null);
    onChange({
      address: item.label,
      latitude: item.latitude,
      longitude: item.longitude,
    });
  }

  return (
    <div ref={wrapRef} className="relative space-y-2">
      <Input
        id={id}
        value={query}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          lastExternalRef.current = next;
          setQuery(next);
          onChange({
            address: next,
            latitude: null,
            longitude: null,
          });
          scheduleSearch(next);
        }}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
      />
      {searching ? (
        <p className="text-xs text-muted-foreground">Đang tìm địa chỉ…</p>
      ) : null}
      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-md",
          )}
        >
          {results.map((item) => (
            <li key={`${item.latitude},${item.longitude},${item.label}`}>
              <button
                type="button"
                role="option"
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(item);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!error && searchError ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          {searchError}
        </p>
      ) : null}
      {value.latitude != null && value.longitude != null ? (
        <p className="text-xs text-muted-foreground">Đã chọn từ gợi ý địa chỉ</p>
      ) : null}
    </div>
  );
}
