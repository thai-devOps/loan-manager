/** Persist finance UI prefs (local only — not synced). */

const STORAGE_KEY = "finance.prefs.v2";

/** Day of month to receive salary. Cap at 28 to avoid month-length edge cases. */
export const MIN_SALARY_PAYDAY = 1;
export const MAX_SALARY_PAYDAY = 28;
export const DEFAULT_SALARY_PAYDAY = 10;

export type FinancePrefs = {
  /** Day of month salary is received (1–28). */
  salaryPayday: number;
};

function clampPayday(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SALARY_PAYDAY;
  return Math.min(
    MAX_SALARY_PAYDAY,
    Math.max(MIN_SALARY_PAYDAY, Math.round(n)),
  );
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getFinancePrefs(): FinancePrefs {
  if (!canUseStorage()) {
    return { salaryPayday: DEFAULT_SALARY_PAYDAY };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { salaryPayday: DEFAULT_SALARY_PAYDAY };
    const parsed = JSON.parse(raw) as Partial<FinancePrefs>;
    return { salaryPayday: clampPayday(parsed.salaryPayday) };
  } catch {
    return { salaryPayday: DEFAULT_SALARY_PAYDAY };
  }
}

export function setFinancePrefs(patch: Partial<FinancePrefs>): FinancePrefs {
  const current = getFinancePrefs();
  const next: FinancePrefs = {
    salaryPayday: clampPayday(patch.salaryPayday ?? current.salaryPayday),
  };
  if (canUseStorage()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function getSalaryPayday(): number {
  return getFinancePrefs().salaryPayday;
}

export function setSalaryPayday(day: number): number {
  return setFinancePrefs({ salaryPayday: day }).salaryPayday;
}

export const SALARY_PAYDAY_OPTIONS = Array.from(
  { length: MAX_SALARY_PAYDAY - MIN_SALARY_PAYDAY + 1 },
  (_, i) => {
    const day = MIN_SALARY_PAYDAY + i;
    return { value: String(day), label: `Ngày ${day}` };
  },
);
