import type { FuelProductCode } from "../../types.js";

export type PetrolimexMappedProduct = {
  code: FuelProductCode | string;
  name: string;
  grade: string;
  unknown: boolean;
};

/**
 * Map Petrolimex product labels → vehicle/Pricing Engine codes.
 * Mức 3 → E10_RON95_III; Mức 5 stored as E10_RON95_V (admin only).
 */
export function mapPetrolimexProductName(rawName: string): PetrolimexMappedProduct {
  const name = rawName.replace(/\s+/g, " ").trim();
  const compact = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");

  // E10 RON 95 Mức 5 (extra grade — not vehicle form default)
  if (
    /e10.*ron.?95/.test(compact) &&
    (/muc5|muc05|level5/.test(compact) || /mức\s*5/i.test(name))
  ) {
    return { code: "E10_RON95_V", name, grade: "MUC_5", unknown: false };
  }

  // E10 RON 95 Mức 3 → PE code E10_RON95_III
  if (
    /e10.*ron.?95/.test(compact) ||
    (/ron95/.test(compact) && /e10/.test(compact))
  ) {
    const grade = /muc3|muc03/.test(compact) || /mức\s*3/i.test(name)
      ? "MUC_3"
      : "MUC_3";
    return { code: "E10_RON95_III", name, grade, unknown: false };
  }

  // E5 RON 92
  if (/e5.*ron.?92|ron.?92.*e5/.test(compact)) {
    return { code: "E5_RON92_II", name, grade: "MUC_2", unknown: false };
  }

  // DO 0,001S
  if (/do0?0*001s|do0001s/.test(compact)) {
    return {
      code: "DO_0001S_V",
      name,
      grade: "DO_0001S_MUC_5",
      unknown: false,
    };
  }

  // DO 0,05S
  if (/do0?0*05s|do005s/.test(compact)) {
    return {
      code: "DO_005S_II",
      name,
      grade: "DO_005S_MUC_2",
      unknown: false,
    };
  }

  // Kerosene
  if (/dauhhoa|2k|kerosene/.test(compact) || /dầu\s*hỏa/i.test(name)) {
    return { code: "KEROSENE", name, grade: "2K", unknown: false };
  }

  return { code: "UNKNOWN", name, grade: "", unknown: true };
}
