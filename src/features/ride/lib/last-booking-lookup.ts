const LAST_CODE_KEY = "ride.lastBookingCode.v1";

export type LastBookingLookup = {
  bookingCode: string;
  phone?: string;
  savedAt: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/** Persist the latest booking code (and optional phone) for tra cứu autofill. */
export function saveLastBookingLookup(input: {
  bookingCode: string;
  phone?: string;
}): void {
  if (!canUseStorage()) return;
  const bookingCode = input.bookingCode.trim().toUpperCase();
  if (!bookingCode) return;
  const payload: LastBookingLookup = {
    bookingCode,
    phone: input.phone?.trim() || undefined,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(LAST_CODE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readLastBookingLookup(): LastBookingLookup | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(LAST_CODE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastBookingLookup;
    if (!parsed?.bookingCode || typeof parsed.bookingCode !== "string") {
      return null;
    }
    return {
      bookingCode: parsed.bookingCode.trim().toUpperCase(),
      phone:
        typeof parsed.phone === "string" && parsed.phone.trim()
          ? parsed.phone.trim()
          : undefined,
      savedAt: parsed.savedAt ?? "",
    };
  } catch {
    return null;
  }
}
