/**
 * Public site URL for canonical, sitemap, Open Graph.
 * Set VITE_SITE_URL in env (no trailing slash), e.g. https://example.com
 */
export function getSiteUrl(): string {
  const raw = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() ?? "";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalized;
  return `${base}${normalized}`;
}

export function normalizePath(path: string): string {
  if (!path || path === "/") return path || "/";
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.replace(/\/+$/, "") || "/";
}
