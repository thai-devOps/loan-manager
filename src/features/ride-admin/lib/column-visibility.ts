import { useCallback, useState } from "react";

export type ColumnDef<T extends string> = {
  id: T;
  label: string;
  locked?: boolean;
  defaultVisible: boolean;
};

function loadVisible<T extends string>(
  storageKey: string,
  columns: ColumnDef<T>[],
): Set<T> {
  const defaults = new Set(
    columns.filter((c) => c.defaultVisible).map((c) => c.id),
  );
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaults;
    const allowed = new Set(columns.map((c) => c.id));
    const next = new Set<T>();
    for (const id of parsed) {
      if (typeof id === "string" && allowed.has(id as T)) {
        next.add(id as T);
      }
    }
    for (const col of columns) {
      if (col.locked) next.add(col.id);
    }
    return next.size === 0 ? defaults : next;
  } catch {
    return defaults;
  }
}

export function useColumnVisibility<T extends string>(
  storageKey: string,
  columns: ColumnDef<T>[],
) {
  const [visible, setVisible] = useState(() =>
    loadVisible(storageKey, columns),
  );

  const isVisible = useCallback(
    (id: T) => visible.has(id),
    [visible],
  );

  const toggle = useCallback(
    (id: T, on: boolean) => {
      const col = columns.find((c) => c.id === id);
      if (!col || col.locked) return;
      setVisible((prev) => {
        const next = new Set(prev);
        if (on) next.add(id);
        else next.delete(id);
        for (const locked of columns) {
          if (locked.locked) next.add(locked.id);
        }
        localStorage.setItem(storageKey, JSON.stringify([...next]));
        return next;
      });
    },
    [columns, storageKey],
  );

  const reset = useCallback(() => {
    const next = new Set(
      columns.filter((c) => c.defaultVisible).map((c) => c.id),
    );
    localStorage.setItem(storageKey, JSON.stringify([...next]));
    setVisible(next);
  }, [columns, storageKey]);

  const visibleCount = columns.filter((c) => visible.has(c.id)).length;

  return { isVisible, toggle, reset, visibleCount, columns };
}
