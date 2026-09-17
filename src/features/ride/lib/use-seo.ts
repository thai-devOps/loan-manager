import { useEffect, useMemo } from "react";
import { rideBrand } from "@/features/ride/config/ride-brand";
import {
  absoluteUrl,
  getSiteUrl,
  normalizePath,
} from "@/features/ride/config/site";
import type { SEOConfig, SEORobots } from "@/features/ride/seo/types";

const OG_DEFAULT = "/og/ride-an-giang.svg";

function upsertMeta(
  attr: "name" | "property",
  key: string,
  content: string,
) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(
  id: string,
  data: Record<string, unknown> | Record<string, unknown>[],
) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

export type UseSEOOptions = SEOConfig;

export function useSEO({
  title,
  description,
  path,
  image,
  robots = "index,follow",
  jsonLd,
}: UseSEOOptions) {
  const jsonLdKey = useMemo(
    () => (jsonLd ? JSON.stringify(jsonLd) : ""),
    [jsonLd],
  );

  useEffect(() => {
    const fullTitle = title.includes(rideBrand.name)
      ? title
      : `${title} | ${rideBrand.shortName}`;
    document.title = fullTitle;

    const pathNorm = normalizePath(path);
    const canonical = absoluteUrl(pathNorm);
    const ogImage = absoluteUrl(image || OG_DEFAULT);
    const siteUrl = getSiteUrl();

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);
    upsertLink("canonical", canonical || pathNorm);

    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", canonical || pathNorm);
    upsertMeta("property", "og:image", ogImage);
    if (siteUrl) upsertMeta("property", "og:site_name", rideBrand.name);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImage);

    if (jsonLdKey) {
      upsertJsonLd(
        "ride-seo-jsonld",
        JSON.parse(jsonLdKey) as Record<string, unknown>[],
      );
    } else {
      removeJsonLd("ride-seo-jsonld");
    }

    return () => {
      document.title = rideBrand.name;
      removeJsonLd("ride-seo-jsonld");
    };
  }, [title, description, path, image, robots, jsonLdKey]);
}

export function useNoIndexSEO(
  title: string,
  description: string,
  path: string,
) {
  useSEO({
    title,
    description,
    path,
    robots: "noindex,nofollow" satisfies SEORobots,
  });
}
