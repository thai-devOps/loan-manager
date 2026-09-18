import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronRight,
  Clock3,
  HeartHandshake,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  CalendarCheck2,
  CarFront,
  ClipboardList,
  HandHelping,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickBookingForm } from "@/features/ride/components/quick-booking-form";
import { ServiceCard } from "@/features/ride/components/service-card";
import { VehicleCard } from "@/features/ride/components/vehicle-card";
import { rideBrand } from "@/features/ride/config/ride-brand";
import { MOCK_SERVICES } from "@/features/ride/data/mock-services";
import {
  SERVICE_AREA_GROUPS,
  SERVICE_AREA_INTRO,
} from "@/features/ride/data/service-areas";
import { MOCK_VEHICLES } from "@/features/ride/data/mock-vehicles";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";
import { vehicleService } from "@/features/ride/services/vehicleService";
import type { Vehicle } from "@/features/ride/types/ride";
import { cn } from "@/lib/utils";

const FEATURED_VEHICLES_FALLBACK = MOCK_VEHICLES.filter((v) => v.active).slice(
  0,
  4,
);

const WHY_US = [
  {
    title: "Xe sạch sẽ",
    desc: "Xe riêng được vệ sinh trước mỗi chuyến.",
    icon: CarFront,
  },
  {
    title: "Tài xế lịch sự",
    desc: "Phục vụ tận tâm, giao tiếp rõ ràng.",
    icon: UserRoundCheck,
  },
  {
    title: "Đón đúng giờ",
    desc: "Chủ động liên hệ trước giờ đón.",
    icon: Clock3,
  },
  {
    title: "Giá minh bạch",
    desc: "Báo giá sau khi kiểm tra lộ trình.",
    icon: Sparkles,
  },
  {
    title: "Phục vụ tận nơi",
    desc: "Đón trả theo địa chỉ bạn yêu cầu.",
    icon: MapPin,
  },
  {
    title: "Lịch trình linh hoạt",
    desc: "Điều chỉnh theo nhu cầu chuyến đi.",
    icon: CalendarCheck2,
  },
];

const STEPS = [
  { n: "01", title: "Chọn dịch vụ", desc: "Du lịch, khám bệnh, sân bay…", icon: HandHelping },
  { n: "02", title: "Nhập hành trình", desc: "Điểm đón, điểm đến, ngày giờ", icon: Route },
  { n: "03", title: "Chọn xe", desc: "Theo số chỗ và nhu cầu", icon: CarFront },
  { n: "04", title: "Gửi yêu cầu", desc: "Không cần tạo tài khoản", icon: ClipboardList },
  { n: "05", title: "Xác nhận chuyến", desc: "Nhân viên liên hệ báo giá", icon: CalendarCheck2 },
  { n: "06", title: "Tài xế đón bạn", desc: "Xe riêng + tài xế đến đúng giờ", icon: UserRoundCheck },
];

const REVIEWS = [
  {
    t: "Đón đúng giờ, tài xế lịch sự. Gia đình đi du lịch rất yên tâm.",
    a: "Khách đặt chuyến du lịch",
  },
  {
    t: "Đưa đón khám bệnh thuận tiện, không phải lo chỗ đậu xe.",
    a: "Khách đặt chuyến khám bệnh",
  },
  {
    t: "Đặt chuyến sân bay rõ ràng, nhân viên gọi xác nhận nhanh.",
    a: "Khách đặt chuyến sân bay",
  },
];

const FAQ = [
  {
    q: "Đây có phải thuê xe tự lái không?",
    a: "Không. Tất cả chuyến đều là xe riêng có tài xế. Chúng tôi không cung cấp dịch vụ tự lái.",
  },
  {
    q: "Giá chuyến tính như thế nào?",
    a: "Giá phụ thuộc lộ trình, loại xe và lịch trình. Sau khi bạn gửi yêu cầu, nhân viên sẽ liên hệ báo giá cụ thể.",
  },
  {
    q: "Tôi có cần tạo tài khoản không?",
    a: "Không. Bạn chỉ cần gửi yêu cầu đặt chuyến với họ tên và số điện thoại.",
  },
  {
    q: "Khi nào tôi nhận thông tin tài xế?",
    a: "Thông tin tài xế chỉ hiển thị sau khi yêu cầu được xác nhận và đã phân tài xế.",
  },
];

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-[0.18em] text-teal-800/70 uppercase dark:text-teal-300/70">
      {children}
    </p>
  );
}

const HERO_IMAGE_SRC = "/hero_image.webp";

function useHeroImageReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.src = HERO_IMAGE_SRC;

    void img
      .decode()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

/** Background only — content stays hidden until the image is ready. */
function HeroBackgroundImage({ ready }: Readonly<{ ready: boolean }>) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 bg-muted/20">
      {ready ? (
        <>
          <img
            src={HERO_IMAGE_SRC}
            alt=""
            width={1720}
            height={914}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-[center_40%]"
          />
          <div className="absolute inset-0 bg-linear-to-r from-background from-0% via-background/92 via-42% to-transparent to-72% dark:from-background dark:via-background/95" />
        </>
      ) : null}
    </div>
  );
}

export function RideHomePage() {
  useRidePageMeta(
    "Đặt Xe Có Tài Xế An Giang | Xe Riêng Đón Tận Nơi",
    "Đặt xe riêng có tài xế tại An Giang. Đón trả tận nơi tại Long Xuyên, Châu Đốc, Tri Tôn — du lịch, khám bệnh, sân bay và chuyến liên tỉnh.",
  );

  const heroReady = useHeroImageReady();
  const [vehicles, setVehicles] = useState<Vehicle[]>(FEATURED_VEHICLES_FALLBACK);

  useEffect(() => {
    let cancelled = false;
    void vehicleService.getVehicles().then((list) => {
      if (!cancelled && list.length > 0) setVehicles(list.slice(0, 4));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {/* Hero + Quick booking — hold content until hero image is ready */}
      <section className="relative min-h-[min(70vh,36rem)] overflow-hidden border-b border-border lg:min-h-[min(75vh,40rem)]">
        <HeroBackgroundImage ready={heroReady} />
        {heroReady ? (
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-16 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-teal-800 uppercase dark:text-teal-300">
                {rideBrand.shortName}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
                Đưa bạn đến nơi,
                <br />
                an tâm suốt hành trình.
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-foreground/90 sm:text-lg">
                Xe riêng có tài xế cho du lịch, khám bệnh, hành hương, sân bay và
                các chuyến đi theo yêu cầu.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" className="min-h-11 bg-teal-800 hover:bg-teal-700">
                  <Link to="/ride/booking">Đặt chuyến ngay</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-11 border-border bg-background hover:bg-background"
                >
                  <Link to="/ride/dich-vu">Xem dịch vụ</Link>
                </Button>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-foreground/85">
                {["Uy tín", "An toàn", "Đúng giờ", "Tận tâm", "Giá rõ ràng"].map(
                  (item) => (
                    <li key={item} className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-teal-700" aria-hidden />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <QuickBookingForm />
          </div>
        ) : (
          <div className="relative min-h-[inherit]" aria-hidden />
        )}
      </section>

      {/* Services */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.02_180),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.3_0.03_180),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <SectionEyebrow>Nhu cầu chuyến đi</SectionEyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Bạn đang cần xe cho chuyến đi nào?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Chọn nhu cầu — chúng tôi sắp xếp xe riêng có tài xế phù hợp.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_SERVICES.map((service, i) => (
              <ServiceCard
                key={service.slug}
                service={service}
                animationDelayMs={i * 70}
              />
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Button
              asChild
              variant="outline"
              className="rounded-full transition-colors hover:border-teal-800/40 hover:bg-teal-50 hover:text-teal-900 dark:hover:bg-teal-950"
            >
              <Link to="/ride/dich-vu">
                Xem tất cả dịch vụ
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured vehicles */}
      <section className="border-y border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionEyebrow>Đội xe</SectionEyebrow>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Các dòng xe phục vụ
              </h2>
              <p className="mt-2 max-w-lg text-muted-foreground">
                Xe riêng + tài xế — chọn theo số chỗ và nhu cầu chuyến đi.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="rounded-full transition-colors hover:border-teal-800/40 hover:bg-teal-50 hover:text-teal-900 dark:hover:bg-teal-950"
            >
              <Link to="/ride/cars">Xem tất cả xe</Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {vehicles.map((v, i) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                animationDelayMs={i * 80}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <SectionEyebrow>Cam kết phục vụ</SectionEyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Tại sao chọn chúng tôi
            </h2>
            <p className="mt-2 text-muted-foreground">
              Tập trung vào trải nghiệm chuyến đi — xe riêng có tài xế, rõ ràng
              và tận tâm.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_US.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className={cn(
                    "group rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
                    "transition-[transform,box-shadow,border-color] duration-300",
                    "hover:-translate-y-1 hover:border-teal-800/20 hover:shadow-[0_14px_28px_-14px_rgb(15_118_110/0.3)]",
                    "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500",
                  )}
                >
                  <div className="flex size-11 items-center justify-center rounded-xl bg-teal-800/10 text-teal-800 transition-colors duration-300 group-hover:bg-teal-800 group-hover:text-teal-50 dark:text-teal-300">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="border-y border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <SectionEyebrow>Quy trình</SectionEyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Quy trình đặt chuyến
            </h2>
            <p className="mt-2 text-muted-foreground">
              Sáu bước rõ ràng — từ chọn nhu cầu đến lúc tài xế đón bạn.
            </p>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.n}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5",
                    "shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[transform,box-shadow] duration-300",
                    "hover:-translate-y-1 hover:shadow-[0_14px_28px_-14px_rgb(15_118_110/0.28)]",
                    "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-semibold tracking-[0.2em] text-teal-800 dark:text-teal-300">
                      {step.n}
                    </span>
                    <span className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground">
                      <Icon className="size-4" aria-hidden />
                    </span>
                  </div>
                  <p className="mt-4 text-base font-semibold tracking-tight">
                    {step.title}
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.desc}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Service areas */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,oklch(0.94_0.025_180),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom_left,oklch(0.28_0.03_180),transparent_50%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <SectionEyebrow>📍 Khu vực phục vụ</SectionEyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Khu vực phục vụ
            </h2>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              {SERVICE_AREA_INTRO}
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {SERVICE_AREA_GROUPS.map((group, i) => (
              <div
                key={group.id}
                style={{ animationDelay: `${i * 90}ms` }}
                className={cn(
                  "rounded-2xl border border-border/70 bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
                  "transition-[transform,box-shadow,border-color] duration-300",
                  "hover:-translate-y-1 hover:border-teal-800/20 hover:shadow-[0_16px_32px_-14px_rgb(15_118_110/0.3)]",
                  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-teal-800 text-teal-50">
                    {group.id === "an-giang" ? (
                      <MapPin className="size-5" aria-hidden />
                    ) : (
                      <Route className="size-5" aria-hidden />
                    )}
                  </span>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                      {group.id === "an-giang" ? "Nội tỉnh" : "Liên tỉnh"}
                    </p>
                    <h3 className="text-xl font-semibold tracking-tight">
                      {group.title}
                    </h3>
                  </div>
                </div>

                {group.places && group.places.length > 0 ? (
                  <>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {group.places.map((place) =>
                        place.href ? (
                          <Link
                            key={place.name}
                            to={place.href}
                            className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm font-medium hover:border-teal-700/40 hover:bg-teal-50 hover:text-teal-900 dark:hover:bg-teal-950"
                          >
                            {place.name}
                          </Link>
                        ) : (
                          <span
                            key={place.name}
                            className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm font-medium"
                          >
                            {place.name}
                          </span>
                        ),
                      )}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {group.description}
                    </p>
                    {group.href ? (
                      <Link
                        to={group.href}
                        className="mt-3 inline-block text-sm font-medium text-teal-800 hover:underline"
                      >
                        Xem khu vực {group.title} →
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                    {group.description}
                    {group.href ? (
                      <>
                        {" "}
                        <Link
                          to={group.href}
                          className="font-medium text-teal-800 hover:underline"
                        >
                          Xem chi tiết →
                        </Link>
                      </>
                    ) : null}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-teal-800 hover:bg-teal-700">
              <Link to="/ride/booking">Đặt chuyến trong khu vực</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/ride/routes/an-giang-can-tho">
                Tuyến An Giang — Cần Thơ
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/ride/contact">Hỏi lộ trình liên tỉnh</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="border-y border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <SectionEyebrow>Phản hồi</SectionEyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Khách hàng nói gì
            </h2>
            <p className="mt-2 text-muted-foreground">
              Phản hồi mang tính minh họa — chưa gắn số liệu thống kê.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {REVIEWS.map((r, i) => (
              <blockquote
                key={r.a}
                style={{ animationDelay: `${i * 80}ms` }}
                className={cn(
                  "flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6",
                  "shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[transform,box-shadow] duration-300",
                  "hover:-translate-y-1 hover:shadow-[0_14px_28px_-14px_rgb(15_118_110/0.28)]",
                  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500",
                )}
              >
                <span className="text-3xl leading-none text-teal-800/40 dark:text-teal-300/40" aria-hidden>
                  “
                </span>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground">
                  {r.t}
                </p>
                <footer className="mt-5 border-t border-border/60 pt-4 text-xs font-medium text-muted-foreground">
                  {r.a}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <SectionEyebrow>FAQ</SectionEyebrow>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Câu hỏi thường gặp
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] open:border-teal-800/25 open:shadow-[0_10px_24px_-14px_rgb(15_118_110/0.25)]"
            >
              <summary className="cursor-pointer list-none px-5 py-4 font-medium marker:content-none">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-left">{item.q}</span>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted transition-colors group-open:bg-teal-800 group-open:text-teal-50">
                    <ChevronRight className="size-4 transition-transform duration-300 group-open:rotate-90" />
                  </span>
                </span>
              </summary>
              <p className="border-t border-border/60 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-border bg-teal-950 text-teal-50">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.45_0.06_180/0.35),transparent_55%)]"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <SectionEyebrow>
              <span className="text-teal-200/80">Bắt đầu</span>
            </SectionEyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Sẵn sàng đặt chuyến?
            </h2>
            <p className="mt-3 max-w-lg text-teal-100/80">
              Gửi yêu cầu — chúng tôi liên hệ xác nhận lộ trình và báo giá. Xe
              riêng có tài xế phục vụ An Giang và tuyến liên tỉnh.
            </p>
            <ul className="mt-5 flex flex-wrap gap-4 text-sm text-teal-100/75">
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5" /> Đúng giờ
              </li>
              <li className="inline-flex items-center gap-1.5">
                <HeartHandshake className="size-3.5" /> Tận tâm
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Giá minh bạch
              </li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="min-h-11 rounded-xl bg-teal-50 text-teal-950 hover:bg-white"
            >
              <Link to="/ride/booking">Đặt chuyến ngay</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-11 rounded-xl border-teal-100/40 bg-transparent text-teal-50 hover:bg-teal-900 hover:text-teal-50"
            >
              <Link to="/ride/contact">Liên hệ</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
