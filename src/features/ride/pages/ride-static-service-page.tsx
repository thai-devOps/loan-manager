import { Navigate } from "react-router-dom";
import { RideSeoLandingPage } from "@/features/ride/pages/ride-seo-landing-page";
import { getServiceLanding } from "@/features/ride/seo/registry";

export function RideStaticServicePage({ slug }: { slug: string }) {
  const page = getServiceLanding(slug);
  if (!page) return <Navigate to="/ride/dich-vu" replace />;
  return <RideSeoLandingPage page={page} />;
}
