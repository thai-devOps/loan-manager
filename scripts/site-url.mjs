/**
 * Shared site-origin resolver for Vite build + Node SEO scripts.
 * Prefer VITE_SITE_URL; fall back to Vercel system URLs. Never return localhost.
 */

function firstHeaderValue(raw) {
  if (raw == null) return "";
  return String(raw).trim();
}

function isLocalhostHost(host) {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.endsWith(".localhost")
  );
}

/**
 * Normalize a site origin to `https://host` (no trailing slash).
 * Returns "" if invalid / localhost.
 */
export function normalizeSiteOrigin(raw) {
  const trimmed = firstHeaderValue(raw).replace(/\/+$/, "");
  if (!trimmed) return "";

  let url;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return "";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  if (isLocalhostHost(url.hostname)) return "";

  // Production SEO URLs must be https
  const protocol = "https:";
  const path = url.pathname.replace(/\/+$/, "");
  // Origin only — ignore path/query/hash on the configured site URL
  if (path && path !== "") {
    // If someone set VITE_SITE_URL=https://domain.com/ride, keep origin only
  }
  return `${protocol}//${url.host}`;
}

/**
 * Resolve absolute site origin for builds.
 * @param {Record<string, string | undefined>} env
 */
export function resolveSiteUrl(env = process.env) {
  const fromVite = normalizeSiteOrigin(env.VITE_SITE_URL);
  if (fromVite) return fromVite;

  // Vercel: production domain (no protocol)
  const vercelProd = normalizeSiteOrigin(env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProd) return vercelProd;

  // Vercel: this deployment URL (preview/production)
  const vercelUrl = normalizeSiteOrigin(env.VERCEL_URL);
  if (vercelUrl) return vercelUrl;

  return "";
}

export function joinSiteUrl(siteUrl, path) {
  const base = normalizeSiteOrigin(siteUrl) || String(siteUrl || "").replace(/\/+$/, "");
  const rawPath = String(path || "/");
  const noHash = rawPath.split("#")[0] ?? rawPath;
  const noQuery = noHash.split("?")[0] ?? noHash;
  let p = noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  if (!base) return p;
  return `${base}${p === "/" ? "/" : p}`;
}
