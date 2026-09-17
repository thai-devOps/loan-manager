/**
 * Service coverage — An Giang base + inter-province trips.
 */
export type ServiceAreaGroup = {
  id: string;
  title: string;
  description: string;
  places?: { name: string; href?: string }[];
  href?: string;
};

export const SERVICE_AREA_INTRO =
  "Phục vụ tận nơi tại An Giang và nhận các tuyến đi liên tỉnh.";

export const SERVICE_AREA_GROUPS: ServiceAreaGroup[] = [
  {
    id: "an-giang",
    title: "An Giang",
    description: "và các khu vực lân cận",
    href: "/ride/locations/an-giang",
    places: [
      { name: "Long Xuyên", href: "/ride/locations/long-xuyen" },
      { name: "Châu Thành", href: "/ride/locations/chau-thanh" },
      { name: "Bình Hòa" },
      { name: "Châu Đốc", href: "/ride/locations/chau-doc" },
      { name: "Tri Tôn", href: "/ride/locations/tri-ton" },
    ],
  },
  {
    id: "lien-tinh",
    title: "Liên tỉnh",
    description:
      "Nhận chuyến đi đến các tỉnh, thành theo lịch trình và nhu cầu của khách hàng.",
    href: "/ride/lien-tinh",
  },
];
