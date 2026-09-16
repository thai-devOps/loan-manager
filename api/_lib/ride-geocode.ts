import { RouteServiceError } from "./ride-route.js";
import {
  applyOrsVietnamGeocodeParams,
  isInsideVietnam,
} from "./ors-vietnam.js";

export type GeocodeResult = {
  label: string;
  latitude: number;
  longitude: number;
};

function getOrsKey(): string {
  return (process.env.ORS_API_KEY ?? "").trim();
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/gi, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !["viet", "nam", "vietnam"].includes(t));
}

function scoreLabel(label: string, tokens: string[]): number {
  const norm = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!tokens.length) return 0;
  let hit = 0;
  for (const t of tokens) {
    if (norm.includes(t)) hit += 1;
  }
  // Prefer shorter, more specific labels over national entities
  const lengthPenalty = Math.min(label.length, 120) / 200;
  return hit / tokens.length - lengthPenalty;
}

function isNoiseLabel(label: string): boolean {
  const t = label.trim().toLowerCase();
  if (!t || t === "việt nam" || t === "vietnam") return true;
  // National orgs that often match because we appended "Việt Nam"
  if (
    /ngân hàng|buu dien|bưu điện|hội thánh|tin lành|tmcp|thương tín|phát triển việt nam/i.test(
      label,
    )
  ) {
    return true;
  }
  return false;
}

function rankAndFilter(
  rows: GeocodeResult[],
  query: string,
  limit: number,
): GeocodeResult[] {
  const tokens = tokenize(expandVietnamPlaceQuery(query));
  return rows
    .filter((r) => isInsideVietnam(r.latitude, r.longitude))
    .filter((r) => !isNoiseLabel(r.label))
    .map((r) => ({ r, score: scoreLabel(r.label, tokens) }))
    .filter((x) => x.score > 0.15 || tokens.length === 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.r);
}

function mapOrsFeatures(
  features: Array<{
    properties?: {
      label?: string;
      name?: string;
      street?: string;
      locality?: string;
      county?: string;
      region?: string;
      country?: string;
      country_a?: string;
      country_code?: string;
      layer?: string;
    };
    geometry?: { coordinates?: [number, number] };
  }>,
): GeocodeResult[] {
  return features
    .map((f) => {
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) return null;
      const [longitude, latitude] = coords;
      if (!isInsideVietnam(latitude, longitude)) return null;

      const p = f.properties ?? {};
      const countryHint = `${p.country_a ?? ""} ${p.country_code ?? ""} ${p.country ?? ""}`;
      if (
        countryHint.trim() &&
        !/\b(vn|vnm|vietnam|việt nam|viet nam)\b/i.test(countryHint)
      ) {
        return null;
      }

      const label =
        p.label?.trim() ||
        [p.name, p.locality, p.county, p.region]
          .filter(Boolean)
          .join(", ")
          .trim();
      if (!label || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }
      if (isNoiseLabel(label)) return null;
      return { label, latitude, longitude };
    })
    .filter((x): x is GeocodeResult => Boolean(x));
}

async function searchOrs(
  query: string,
  limit: number,
): Promise<GeocodeResult[]> {
  const key = getOrsKey();
  if (!key) {
    throw new RouteServiceError(
      "MISSING_KEY",
      "Chưa cấu hình ORS_API_KEY trên server.",
    );
  }

  // Prefer search over autocomplete for typed place names like "Cô Tô, An Giang"
  const endpoints = [
    "https://api.openrouteservice.org/geocode/search",
    "https://api.openrouteservice.org/geocode/autocomplete",
  ];

  let lastError: RouteServiceError | null = null;
  const collected: GeocodeResult[] = [];

  for (const endpoint of endpoints) {
    const url = new URL(endpoint);
    url.searchParams.set("text", query);
    url.searchParams.set("size", String(Math.max(limit * 2, 10)));
    // Localities / venues / addresses — skip coarse country layer noise
    url.searchParams.set(
      "layers",
      "address,street,locality,neighbourhood,borough,county,venue",
    );
    applyOrsVietnamGeocodeParams(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: key,
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        lastError = new RouteServiceError(
          "UPSTREAM",
          "Không thể tìm địa chỉ lúc này.",
        );
        continue;
      }

      const data = (await res.json()) as {
        features?: Array<{
          properties?: Record<string, string>;
          geometry?: { coordinates?: [number, number] };
        }>;
      };
      collected.push(...mapOrsFeatures(data.features ?? []));
      const ranked = rankAndFilter(collected, query, limit);
      if (ranked.length > 0) return ranked;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        lastError = new RouteServiceError(
          "TIMEOUT",
          "Không thể tìm địa chỉ lúc này.",
        );
      } else if (e instanceof RouteServiceError) {
        lastError = e;
      } else {
        lastError = new RouteServiceError(
          "UPSTREAM",
          "Không thể tìm địa chỉ lúc này.",
        );
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (collected.length > 0) {
    return rankAndFilter(collected, query, limit);
  }
  if (lastError) throw lastError;
  return [];
}

/** OSM Nominatim — Việt Nam only, locality-biased. */
async function searchNominatim(
  query: string,
  limit: number,
): Promise<GeocodeResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("limit", String(Math.max(limit * 2, 8)));
  url.searchParams.set("countrycodes", "vn");
  url.searchParams.set("accept-language", "vi");
  // Prefer places/villages/towns over amenities
  url.searchParams.set(
    "featuretype",
    "settlement",
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "MonelyRideGeocoder/1.0",
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      display_name?: string;
      lat?: string;
      lon?: string;
      type?: string;
      class?: string;
      importance?: number;
    }>;
    const mapped = data
      .map((row) => {
        const latitude = Number(row.lat);
        const longitude = Number(row.lon);
        const label = (row.display_name ?? "").trim();
        if (
          !label ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          !isInsideVietnam(latitude, longitude) ||
          isNoiseLabel(label)
        ) {
          return null;
        }
        return { label, latitude, longitude };
      })
      .filter((x): x is GeocodeResult => Boolean(x));

    const ranked = rankAndFilter(mapped, query, limit);
    if (ranked.length > 0) return ranked;

    // Retry without featuretype if settlement filter too strict
    url.searchParams.delete("featuretype");
    const res2 = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "MonelyRideGeocoder/1.0",
      },
      signal: controller.signal,
    });
    if (!res2.ok) return ranked;
    const data2 = (await res2.json()) as Array<{
      display_name?: string;
      lat?: string;
      lon?: string;
    }>;
    const mapped2 = data2
      .map((row) => {
        const latitude = Number(row.lat);
        const longitude = Number(row.lon);
        const label = (row.display_name ?? "").trim();
        if (
          !label ||
          !isInsideVietnam(latitude, longitude) ||
          isNoiseLabel(label)
        ) {
          return null;
        }
        return { label, latitude, longitude };
      })
      .filter((x): x is GeocodeResult => Boolean(x));
    return rankAndFilter(mapped2, query, limit);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function searchAddress(
  q: string,
  opts?: { limit?: number },
): Promise<GeocodeResult[]> {
  const raw = q.trim();
  if (raw.length < 2) return [];

  const query = expandVietnamPlaceQuery(raw);
  const limit = Math.min(Math.max(opts?.limit ?? 5, 1), 10);

  // Prefer Nominatim for VN place-name quality; ORS as secondary
  const nominatim = await searchNominatim(query, limit);
  if (nominatim.length > 0) return nominatim;

  try {
    const ors = await searchOrs(query, limit);
    if (ors.length > 0) return ors;
  } catch (e) {
    if (
      e instanceof RouteServiceError &&
      e.code !== "MISSING_KEY" &&
      e.code !== "UPSTREAM" &&
      e.code !== "TIMEOUT"
    ) {
      throw e;
    }
  }

  return [];
}

/**
 * Expand short VN place labels for geocoding.
 * Keep the user's place name first — do NOT prepend noise that steals matching.
 */
export function expandVietnamPlaceQuery(raw: string): string {
  let q = raw.trim();
  if (!q) return q;

  // Normalize separators
  q = q.replace(/\s+/g, " ").replace(/,+/g, ",").trim();

  const replacements: Array<[RegExp, string]> = [
    [/,?\s*\bAG\b\.?/gi, ", An Giang"],
    [/,?\s*\bTG\b\.?/gi, ", Tiền Giang"],
    [/,?\s*\bKG\b\.?/gi, ", Kiên Giang"],
    [/,?\s*\bDT\b\.?/gi, ", Đồng Tháp"],
    [/,?\s*\bVL\b\.?/gi, ", Vĩnh Long"],
    [/,?\s*\bCT\b\.?/gi, ", Cần Thơ"],
    [/,?\s*\bST\b\.?/gi, ", Sóc Trăng"],
    [/,?\s*\bBL\b\.?/gi, ", Bạc Liêu"],
    [/,?\s*\bCM\b\.?/gi, ", Cà Mau"],
    [/,?\s*\bLA\b\.?/gi, ", Long An"],
    [/\bHCMC\b/gi, "Hồ Chí Minh"],
    [/\bTP\.?\s*HCM\b/gi, "Hồ Chí Minh"],
  ];
  for (const [re, to] of replacements) {
    q = q.replace(re, to);
  }

  // Avoid "Cô Tô, , An Giang"
  q = q.replace(/,\s*,/g, ", ").replace(/^,\s*|\s*,$/g, "").trim();

  // Only append country if missing — put it last
  if (!/việt nam|vietnam/i.test(q)) {
    q = `${q}, Việt Nam`;
  }
  return q;
}
