/**
 * Build-time prerender for SEO landing pages.
 * Injects title/description/canonical/OG + visible HTML into copies of dist/index.html
 * so crawlers see content without waiting for JS. React replaces #root on hydrate.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { INDEXABLE_PATHS, PRERENDER_PAGES } from "./seo-paths.mjs";
import { ALL_SEO_LANDINGS_META } from "./seo-landings-meta.mjs";
import { joinSiteUrl, resolveSiteUrl } from "./site-url.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const siteUrl = resolveSiteUrl(process.env);

function abs(path) {
  return joinSiteUrl(siteUrl, path);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function metaFor(path) {
  const fromStatic = PRERENDER_PAGES.find((p) => p.path === path);
  if (fromStatic) return fromStatic;
  const fromLanding = ALL_SEO_LANDINGS_META.find((p) => p.path === path);
  if (fromLanding) return fromLanding;
  return {
    path,
    title: "Xe có tài xế An Giang",
    description: "Đặt xe riêng có tài xế tại An Giang.",
    h1: "Xe có tài xế An Giang",
    body: "Đặt chuyến xe riêng có tài xế — đón tận nơi.",
  };
}

function inject(html, page) {
  const canonical = abs(page.path);
  const ogImage = abs("/og/ride-an-giang.svg");
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const h1 = escapeHtml(page.h1);
  const body = escapeHtml(page.body);
  const canonicalIsAbsolute = /^https:\/\//i.test(canonical);

  let out = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${title}</title>`,
  );

  const headExtras = `
    <meta name="description" content="${description}" />
    <meta name="robots" content="index,follow" />
    ${canonicalIsAbsolute ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : ""}
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    ${canonicalIsAbsolute ? `<meta property="og:url" content="${escapeHtml(canonical)}" />` : ""}
    ${/^https:\/\//i.test(ogImage) ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : ""}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
  `;

  out = out.replace("</head>", `${headExtras}</head>`);

  const prerenderBody = `<div id="root"><article class="seo-prerender" aria-hidden="true"><h1>${h1}</h1><p>${body}</p><p><a href="/ride/booking">Đặt chuyến</a> · <a href="/ride/dich-vu">Dịch vụ</a></p></article></div>`;

  out = out.replace(/<div id="root"><\/div>/, prerenderBody);

  return out;
}

function pathToFile(path) {
  if (path === "/ride") return join(dist, "ride", "index.html");
  const rel = path.replace(/^\//, "");
  return join(dist, rel, "index.html");
}

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/index.html missing — run vite build first");
  process.exit(1);
}

const shell = readFileSync(join(dist, "index.html"), "utf8");
let count = 0;

for (const path of INDEXABLE_PATHS) {
  const page = metaFor(path);
  const html = inject(shell, page);
  const file = pathToFile(path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html, "utf8");
  count += 1;
}

console.log(`Prerendered ${count} SEO pages into dist/${siteUrl ? ` base=${siteUrl}` : " (relative canonical skipped — set VITE_SITE_URL)"}`);
