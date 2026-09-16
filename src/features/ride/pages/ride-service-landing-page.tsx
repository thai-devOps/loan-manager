import { Link, Navigate, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickBookingForm } from "@/features/ride/components/quick-booking-form";
import { ServiceIcon } from "@/features/ride/components/service-icon";
import { getServiceBySlug } from "@/features/ride/data/mock-services";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";

export function RideServiceLandingPage() {
  const { slug = "" } = useParams();
  const service = getServiceBySlug(slug);

  useRidePageMeta(
    service?.landingHeadline ?? "Dịch vụ",
    service?.landingBody,
  );

  if (!service) {
    return <Navigate to="/ride/services" replace />;
  }

  return (
    <div>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-start">
          <div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-800 text-teal-50">
              <ServiceIcon icon={service.icon} className="size-6" />
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {service.landingHeadline}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {service.landingBody}
            </p>
            <ul className="mt-6 space-y-2">
              {service.benefits.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-teal-700" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-teal-800 hover:bg-teal-700">
                <Link to={`/ride/booking?serviceType=${service.serviceType}`}>
                  {service.ctaLabel}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/ride/cars">Xem xe phục vụ</Link>
              </Button>
            </div>
          </div>
          <QuickBookingForm defaultServiceType={service.serviceType} />
        </div>
      </section>
    </div>
  );
}
