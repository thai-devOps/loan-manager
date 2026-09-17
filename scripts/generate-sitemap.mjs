import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { INDEXABLE_PATHS } from "./seo-paths.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const siteUrl = (process.env.VITE_SITE_URL || "").replace(/\/+$/, "");

function loc(path) {
  const p = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
  return siteUrl ? `${siteUrl}${p}` : p;
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

writeFileSync(join(root, "public", "sitemap.xml"), xml, "utf8");
try {
  mkdirSync(join(root, "dist"), { recursive: true });
  writeFileSync(join(root, "dist", "sitemap.xml"), xml, "utf8");
} catch {
  /* ignore */
}

if (siteUrl) {
  const robotsPath = join(root, "public", "robots.txt");
  let robots = readFileSync(robotsPath, "utf8");
  robots = robots.replace(
    /Sitemap:\s*.*/i,
    `Sitemap: ${siteUrl}/sitemap.xml`,
  );
  writeFileSync(robotsPath, robots, "utf8");
  try {
    writeFileSync(join(root, "dist", "robots.txt"), robots, "utf8");
  } catch {
    /* ignore */
  }
}

console.log(
  `sitemap.xml written (${INDEXABLE_PATHS.length} urls)${siteUrl ? ` base=${siteUrl}` : " (set VITE_SITE_URL for absolute locs)"}`,
);
