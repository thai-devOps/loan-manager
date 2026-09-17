import { Link, useParams, Navigate } from "react-router-dom";
import { RideSeoLandingPage } from "@/features/ride/pages/ride-seo-landing-page";
import {
  getLocationLanding,
  getRouteLanding,
  getServiceLanding,
} from "@/features/ride/seo/registry";

export function RideServiceSeoPage() {
  const { slug = "" } = useParams();
  const page = getServiceLanding(slug);
  if (!page) return <Navigate to="/ride/dich-vu" replace />;
  return <RideSeoLandingPage page={page} />;
}

export function RideLocationSeoPage() {
  const { slug = "" } = useParams();
  const page = getLocationLanding(slug);
  if (!page) return <Navigate to="/ride/locations/an-giang" replace />;
  return <RideSeoLandingPage page={page} />;
}

export function RideRouteSeoPage() {
  const { slug = "" } = useParams();
  const page = getRouteLanding(slug);
  if (!page) return <Navigate to="/ride" replace />;
  return <RideSeoLandingPage page={page} />;
}

export function RidePillarXeCoTaiXePage() {
  const page = getServiceLanding("xe-co-tai-xe");
  if (!page) return <Navigate to="/ride" replace />;
  return <RideSeoLandingPage page={page} />;
}

/** Services index — list with internal links */
export { RideServicesIndexPage } from "@/features/ride/pages/ride-services-index-page";

export function RideNotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <p className="text-sm font-medium text-teal-800">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Không tìm thấy trang
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Đường dẫn không tồn tại hoặc đã được đổi. Bạn có thể về trang chủ, xem
        dịch vụ hoặc đặt chuyến.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link
          to="/ride"
          className="inline-flex h-10 items-center rounded-lg bg-teal-800 px-4 text-sm font-medium text-teal-50 hover:bg-teal-700"
        >
          Về trang chủ
        </Link>
        <Link
          to="/ride/dich-vu"
          className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
        >
          Xem dịch vụ
        </Link>
        <Link
          to="/ride/booking"
          className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
        >
          Đặt chuyến
        </Link>
      </div>
    </div>
  );
}
