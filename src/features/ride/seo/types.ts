export type SEORobots = "index,follow" | "noindex,nofollow";

export type SEOConfig = {
  title: string;
  description: string;
  /** Path only, e.g. /ride/locations/long-xuyen — canonical built with VITE_SITE_URL */
  path: string;
  image?: string;
  robots?: SEORobots;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export type SEOLandingType = "service" | "location" | "route" | "pillar";

export type SEOFaqItem = {
  question: string;
  answer: string;
};

export type SEORelatedLink = {
  href: string;
  label: string;
};

export type SEOLandingPage = {
  slug: string;
  type: SEOLandingType;
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: { heading: string; body: string }[];
  benefits: string[];
  faqs: SEOFaqItem[];
  related: SEORelatedLink[];
  /** Prefill booking when CTA clicked */
  bookingQuery?: string;
  indexable: boolean;
  breadcrumbs: { name: string; path: string }[];
};
