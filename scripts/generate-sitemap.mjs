import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { INDEXABLE_PATHS } from "./seo-paths.mjs";
import { joinSiteUrl, resolveSiteUrl } from "./site-url.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const siteUrl = resolveSiteUrl(process.env);

function loc(path) {
  return joinSiteUrl(siteUrl, path);
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const urls = INDEXABLE_PATHS.map(
  (path) => `  <url>
    <loc>${escapeXml(loc(path))}</loc>
    <changefreq>weekly</changefreq>
    <priority>${path === "/ride" ? "1.0" : "0.8"}</priority>
  </url>`,
).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

// Vercel serves dist/ — always write absolute (or path) locs there after vite build.
mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "sitemap.xml"), xml, "utf8");

const robotsTemplate = readFileSync(join(root, "public", "robots.txt"), "utf8");
let robots = robotsTemplate;
if (siteUrl) {
  const sitemapLine = `Sitemap: ${siteUrl}/sitemap.xml`;
  if (/^Sitemap:\s*/im.test(robots)) {
    robots = robots.replace(/^Sitemap:\s*.*$/im, sitemapLine);
  } else {
    robots = `${robots.trimEnd()}\n\n${sitemapLine}\n`;
  }
} else {
  console.warn(
    "[seo] VITE_SITE_URL (or Vercel URL) is unset — sitemap <loc> and robots Sitemap stay relative. Set VITE_SITE_URL=https://your-domain.com for production.",
  );
}
writeFileSync(join(root, "dist", "robots.txt"), robots, "utf8");

console.log(
  `sitemap.xml written (${INDEXABLE_PATHS.length} urls)${siteUrl ? ` base=${siteUrl}` : " (set VITE_SITE_URL for absolute locs)"}`,
);
