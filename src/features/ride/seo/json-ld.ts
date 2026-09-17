import { rideBrand } from "../config/ride-brand";
import { absoluteUrl, getSiteUrl } from "../config/site";
import type { SEOFaqItem, SEOLandingPage } from "./types";

export function buildBreadcrumbJsonLd(
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path) || item.path,
    })),
  };
}

export function buildFaqJsonLd(faqs: SEOFaqItem[]): Record<string, unknown> | null {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function buildLocalBusinessJsonLd(): Record<string, unknown> {
  const url = getSiteUrl() || absoluteUrl("/ride");
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: rideBrand.name,
    description: rideBrand.tagline,
    url,
    areaServed: [
      "An Giang",
      "Long Xuyên",
      "Châu Đốc",
      "Tri Tôn",
      "Châu Thành",
    ],
  };
  const phones = rideBrand.hotlines.filter((n) => n.trim());
  if (phones.length) {
    data.telephone = phones.map((n) => n.replace(/\s/g, ""));
  }
  return data;
}

export function buildServiceJsonLd(page: SEOLandingPage): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.h1,
    description: page.description,
    provider: {
      "@type": "LocalBusiness",
      name: rideBrand.name,
    },
    areaServed: "An Giang",
    url: absoluteUrl(page.path) || page.path,
  };
}

export function combineJsonLd(
  ...parts: Array<Record<string, unknown> | null | undefined>
): Record<string, unknown>[] {
  return parts.filter((p): p is Record<string, unknown> => Boolean(p));
}
