/** Generate a short booking code like TRIP1025. */
export function generateBookingCode(existingCodes: string[] = []): string {
  const used = new Set(existingCodes.map((c) => c.toUpperCase()));
  for (let i = 0; i < 40; i++) {
    const n = 1000 + Math.floor(Math.random() * 9000);
    const code = `TRIP${n}`;
    if (!used.has(code)) return code;
  }
  return `TRIP${Date.now().toString().slice(-6)}`;
}

export function normalizeBookingCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/^#/, "");
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}
