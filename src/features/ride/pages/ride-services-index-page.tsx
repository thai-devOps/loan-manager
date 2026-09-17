import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RideBreadcrumbs } from "@/features/ride/components/ride-breadcrumbs";
import { rideBrand } from "@/features/ride/config/ride-brand";
import { SEO_SERVICE_PAGES } from "@/features/ride/seo/pages/services";
import { useSEO } from "@/features/ride/lib/use-seo";
import {
  buildBreadcrumbJsonLd,
  buildLocalBusinessJsonLd,
  combineJsonLd,
} from "@/features/ride/seo/json-ld";

const INDEX_SERVICES = SEO_SERVICE_PAGES.filter((p) => p.slug !== "xe-co-tai-xe");

export function RideServicesIndexPage() {
  useSEO({
    title: "Dịch Vụ Xe Có Tài Xế An Giang | Du Lịch, Khám Bệnh, Sân Bay",
    description:
      "Danh sách dịch vụ xe riêng có tài xế tại An Giang: du lịch, khám bệnh, hành hương, đưa đón sân bay, công tác và liên tỉnh.",
    path: "/ride/dich-vu",
    jsonLd: combineJsonLd(
      buildLocalBusinessJsonLd(),
      buildBreadcrumbJsonLd([
        { name: "Trang chủ", path: "/ride" },
        { name: "Dịch vụ", path: "/ride/dich-vu" },
      ]),
    ),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <RideBreadcrumbs
        className="mb-4"
        items={[
          { name: "Trang chủ", path: "/ride" },
          { name: "Dịch vụ" },
        ]}
      />
      <h1 className="text-3xl font-semibold tracking-tight">
        Dịch vụ của {rideBrand.name}
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Tất cả dịch vụ đều là xe riêng có tài xế — không thuê xe tự lái. Chọn nhu
        cầu phù hợp hoặc đặt chuyến trực tiếp.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INDEX_SERVICES.map((s) => (
          <li key={s.path}>
            <Link
              to={s.path}
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold">{s.h1}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">
                {s.description}
              </p>
              <span className="mt-4 text-sm font-medium text-teal-800">
                Xem chi tiết →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild className="bg-teal-800 hover:bg-teal-700">
          <Link to="/ride/booking">Đặt chuyến</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/ride/xe-co-tai-xe">Tìm hiểu {rideBrand.name}</Link>
        </Button>
      </div>
    </div>
  );
}
