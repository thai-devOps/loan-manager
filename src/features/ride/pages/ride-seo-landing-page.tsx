import { Link } from "react-router-dom";
import { useMemo } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickBookingForm } from "@/features/ride/components/quick-booking-form";
import { RideBreadcrumbs } from "@/features/ride/components/ride-breadcrumbs";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildLocalBusinessJsonLd,
  buildServiceJsonLd,
  combineJsonLd,
} from "@/features/ride/seo/json-ld";
import type { SEOLandingPage } from "@/features/ride/seo/types";
import { useSEO } from "@/features/ride/lib/use-seo";

export function RideSeoLandingPage({ page }: { page: SEOLandingPage }) {
  const bookingTo = page.bookingQuery
    ? `/ride/booking?${page.bookingQuery}`
    : "/ride/booking";

  const jsonLd = useMemo(
    () =>
      combineJsonLd(
        buildLocalBusinessJsonLd(),
        buildServiceJsonLd(page),
        buildBreadcrumbJsonLd(page.breadcrumbs),
        buildFaqJsonLd(page.faqs),
      ),
    [page],
  );

  useSEO({
    title: page.title,
    description: page.description,
    path: page.path,
    robots: page.indexable ? "index,follow" : "noindex,nofollow",
    jsonLd,
  });

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-br from-teal-50/80 via-background to-sky-50/50 dark:from-teal-950/30 dark:via-background dark:to-sky-950/20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-start lg:py-12">
          <div>
            <RideBreadcrumbs
              className="mb-4"
              items={page.breadcrumbs.map((b, i) => ({
                name: b.name,
                path:
                  i === page.breadcrumbs.length - 1 ? undefined : b.path,
              }))}
            />
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {page.h1}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {page.intro}
            </p>
            <ul className="mt-6 space-y-2">
              {page.benefits.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 shrink-0 text-teal-700" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-teal-800 hover:bg-teal-700">
                <Link to={bookingTo}>Đặt chuyến</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/ride/cars">Xem xe phục vụ</Link>
              </Button>
            </div>
          </div>
          <QuickBookingForm />
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6">
        {page.sections.map((section) => (
          <div key={section.heading}>
            <h2 className="text-xl font-semibold tracking-tight">
              {section.heading}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {section.body}
            </p>
          </div>
        ))}

        {page.faqs.length ? (
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Câu hỏi thường gặp
            </h2>
            <dl className="mt-4 space-y-4">
              {page.faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <dt className="font-medium">{faq.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {page.related.length ? (
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Trang liên quan
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {page.related.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="inline-flex rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
