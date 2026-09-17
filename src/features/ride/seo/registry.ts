import { SEO_LOCATION_PAGES } from "@/features/ride/seo/pages/locations";
import { SEO_ROUTE_PAGES } from "@/features/ride/seo/pages/routes";
import { SEO_SERVICE_PAGES } from "@/features/ride/seo/pages/services";
import type { SEOLandingPage } from "@/features/ride/seo/types";

/** Static indexable marketing paths (non-dynamic landings). */
export const SEO_STATIC_INDEXABLE_PATHS = [
  "/ride",
  "/ride/dich-vu",
  "/ride/cars",
  "/ride/pricing",
  "/ride/contact",
] as const;

export const ALL_SEO_LANDINGS: SEOLandingPage[] = [
  ...SEO_SERVICE_PAGES,
  ...SEO_LOCATION_PAGES,
  ...SEO_ROUTE_PAGES,
];

export function getLandingByPath(path: string): SEOLandingPage | undefined {
  const normalized = path.replace(/\/+$/, "") || path;
  return ALL_SEO_LANDINGS.find((p) => p.path === normalized);
}

export function getLandingBySlug(
  type: SEOLandingPage["type"] | "service" | "location" | "route" | "pillar",
  slug: string,
): SEOLandingPage | undefined {
  return ALL_SEO_LANDINGS.find((p) => p.slug === slug && (type === "pillar" ? p.type === "pillar" || p.type === "service" : p.type === type || (type === "service" && p.type === "pillar")));
}

export function getServiceLanding(slug: string): SEOLandingPage | undefined {
  return ALL_SEO_LANDINGS.find(
    (p) =>
      p.slug === slug && (p.type === "service" || p.type === "pillar"),
  );
}

export function getLocationLanding(slug: string): SEOLandingPage | undefined {
  return SEO_LOCATION_PAGES.find((p) => p.slug === slug);
}

export function getRouteLanding(slug: string): SEOLandingPage | undefined {
  return SEO_ROUTE_PAGES.find((p) => p.slug === slug);
}

/** All paths that should appear in sitemap + prerender */
export function getIndexablePaths(): string[] {
  const fromLandings = ALL_SEO_LANDINGS.filter((p) => p.indexable).map(
    (p) => p.path,
  );
  return [...SEO_STATIC_INDEXABLE_PATHS, ...fromLandings];
}

export type SeoValidationIssue = {
  level: "error" | "warning";
  message: string;
};

export function validateSeoRegistry(): SeoValidationIssue[] {
  const issues: SeoValidationIssue[] = [];
  const paths = new Set<string>();
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const page of ALL_SEO_LANDINGS) {
    if (paths.has(page.path)) {
      issues.push({
        level: "error",
        message: `Duplicate path: ${page.path}`,
      });
    }
    paths.add(page.path);

    if (titles.has(page.title)) {
      issues.push({
        level: "error",
        message: `Duplicate title: ${page.title}`,
      });
    }
    titles.add(page.title);

    if (descriptions.has(page.description)) {
      issues.push({
        level: "warning",
        message: `Duplicate description: ${page.path}`,
      });
    }
    descriptions.add(page.description);

    if (!page.h1.trim() || !page.intro.trim()) {
      issues.push({
        level: "error",
        message: `Missing h1/intro: ${page.path}`,
      });
    }
  }

  return issues;
}

/** Map old English service URLs → new Vietnamese paths */
export const LEGACY_SERVICE_REDIRECTS: Record<string, string> = {
  "/ride/services": "/ride/dich-vu",
  "/ride/services/du-lich": "/ride/du-lich",
  "/ride/services/kham-benh": "/ride/kham-benh",
  "/ride/services/hanh-huong": "/ride/hanh-huong",
  "/ride/services/san-bay": "/ride/dua-don-san-bay",
  "/ride/services/cong-tac": "/ride/cong-tac",
  "/ride/services/theo-yeu-cau": "/ride/theo-yeu-cau",
};
