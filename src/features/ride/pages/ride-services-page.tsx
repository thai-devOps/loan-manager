import { Link } from "react-router-dom";
import { ServiceCard } from "@/features/ride/components/service-card";
import { MOCK_SERVICES } from "@/features/ride/data/mock-services";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";

export function RideServicesPage() {
  useRidePageMeta(
    "Dịch vụ",
    "Xe riêng có tài xế cho du lịch, khám bệnh, hành hương, sân bay, công tác và chuyến theo yêu cầu.",
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs font-medium tracking-[0.18em] text-teal-800/70 uppercase dark:text-teal-300/70">
        Dịch vụ
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Dịch vụ đưa đón
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Tất cả chuyến đều có tài xế. Chọn nhu cầu phù hợp để đặt chuyến.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_SERVICES.map((service, i) => (
          <ServiceCard
            key={service.slug}
            service={service}
            animationDelayMs={i * 70}
          />
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Muốn xem chi tiết từng dịch vụ?{" "}
        <Link
          to="/ride/services/du-lich"
          className="font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
        >
          Xe đi du lịch
        </Link>
        {" · "}
        <Link
          to="/ride/services/san-bay"
          className="font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
        >
          Đưa đón sân bay
        </Link>
      </p>
    </div>
  );
}
