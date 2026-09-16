/**
 * Service coverage — An Giang base + inter-province trips.
 */
export type ServiceAreaGroup = {
  id: string;
  title: string;
  description: string;
  places?: string[];
};

export const SERVICE_AREA_INTRO =
  "Phục vụ tận nơi tại An Giang và nhận các tuyến đi liên tỉnh.";

export const SERVICE_AREA_GROUPS: ServiceAreaGroup[] = [
  {
    id: "an-giang",
    title: "An Giang",
    description: "và các khu vực lân cận",
    places: [
      "Long Xuyên",
      "Châu Thành",
      "Bình Hòa",
      "Châu Đốc",
      "Tri Tôn",
    ],
  },
  {
    id: "lien-tinh",
    title: "Liên tỉnh",
    description:
      "Nhận chuyến đi đến các tỉnh, thành theo lịch trình và nhu cầu của khách hàng.",
  },
];
