/**
 * Public site URL for canonical, sitemap, Open Graph.
 * Set VITE_SITE_URL in env (no trailing slash), e.g. https://example.com
 * Build also falls back to Vercel system URLs via vite.config.
 */

function isLocalhostHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.endsWith(".localhost")
  );
}

/** Normalize to https origin with no trailing slash; reject localhost. */
export function normalizeSiteOrigin(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return "";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  if (isLocalhostHost(url.hostname)) return "";

  return `https://${url.host}`;
}

export function getSiteUrl(): string {
  const fromEnv = normalizeSiteOrigin(
    import.meta.env.VITE_SITE_URL as string | undefined,
  );
  if (fromEnv) return fromEnv;

  // SPA runtime fallback so client-side meta is still absolute
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeSiteOrigin(window.location.origin);
  }

  return "";
}

/** Path only: drop query/hash, normalize trailing slash (except `/`). */
export function normalizePath(path: string): string {
  const noHash = path.split("#")[0] ?? path;
  const noQuery = noHash.split("?")[0] ?? noHash;
  if (!noQuery || noQuery === "/") return "/";
  const withSlash = noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  const normalized = normalizePath(path);
  if (!base) return normalized;
  return normalized === "/" ? `${base}/` : `${base}${normalized}`;
}

/** True when value is an absolute http(s) URL (not relative, not localhost). */
export function isAbsoluteHttpUrl(value: string): boolean {
  return /^https:\/\//i.test(value);
}
