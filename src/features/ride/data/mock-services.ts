import type { ServiceType } from "@/features/ride/types/ride";

export type RideServiceDef = {
  slug: string;
  serviceType: ServiceType;
  title: string;
  shortTitle: string;
  description: string;
  landingHeadline: string;
  landingBody: string;
  benefits: string[];
  ctaLabel: string;
  icon: "travel" | "medical" | "pilgrimage" | "airport" | "business" | "custom";
};

export const MOCK_SERVICES: RideServiceDef[] = [
  {
    slug: "du-lich",
    serviceType: "TRAVEL",
    title: "Du lịch",
    shortTitle: "Du lịch",
    description: "Đi chơi cùng gia đình, bạn bè thật thoải mái.",
    landingHeadline: "Xe đi du lịch có tài xế",
    landingBody:
      "Phục vụ gia đình, nhóm bạn, đoàn nhỏ đi du lịch trong và ngoài tỉnh.",
    benefits: [
      "Xe riêng",
      "Tài xế phục vụ",
      "Đón tận nơi",
      "Lịch trình linh hoạt",
    ],
    ctaLabel: "Đặt chuyến du lịch",
    icon: "travel",
  },
  {
    slug: "kham-benh",
    serviceType: "MEDICAL",
    title: "Khám bệnh",
    shortTitle: "Khám bệnh",
    description: "Đưa đón tận nơi, phù hợp người bệnh và gia đình.",
    landingHeadline: "Xe đi khám bệnh có tài xế",
    landingBody:
      "Đưa đón đến bệnh viện, phòng khám — lịch trình linh hoạt theo lịch hẹn.",
    benefits: [
      "Đón tận nhà / bệnh viện",
      "Tài xế hỗ trợ hành khách",
      "Chờ theo lịch khám",
      "Xe riêng, sạch sẽ",
    ],
    ctaLabel: "Đặt chuyến khám bệnh",
    icon: "medical",
  },
  {
    slug: "hanh-huong",
    serviceType: "PILGRIMAGE",
    title: "Hành hương",
    shortTitle: "Hành hương",
    description: "Chuyến đi tâm linh cùng gia đình và đoàn thể.",
    landingHeadline: "Xe đi hành hương có tài xế",
    landingBody:
      "Phục vụ gia đình và đoàn thể đi hành hương, lễ hội, hành trình tâm linh.",
    benefits: [
      "Xe riêng + tài xế",
      "Phù hợp đoàn nhỏ / lớn",
      "Lịch trình theo yêu cầu",
      "Đón trả linh hoạt",
    ],
    ctaLabel: "Đặt chuyến hành hương",
    icon: "pilgrimage",
  },
  {
    slug: "san-bay",
    serviceType: "AIRPORT",
    title: "Sân bay",
    shortTitle: "Sân bay",
    description: "Đưa đón sân bay đúng giờ, tiện lợi.",
    landingHeadline: "Xe đưa đón sân bay có tài xế",
    landingBody:
      "Đưa đón sân bay đúng giờ — đón tận nơi, theo dõi lịch bay linh hoạt.",
    benefits: [
      "Đúng giờ",
      "Theo dõi giờ bay",
      "Xe riêng + tài xế",
      "Hỗ trợ hành lý",
    ],
    ctaLabel: "Đặt chuyến sân bay",
    icon: "airport",
  },
  {
    slug: "cong-tac",
    serviceType: "BUSINESS",
    title: "Công tác",
    shortTitle: "Công tác",
    description: "Xe riêng phục vụ chuyến công tác.",
    landingHeadline: "Xe công tác có tài xế",
    landingBody:
      "Xe riêng phục vụ chuyến công tác, họp, sự kiện — lịch trình chuyên nghiệp.",
    benefits: [
      "Xe riêng",
      "Tài xế lịch sự",
      "Đúng giờ",
      "Lịch trình linh hoạt",
    ],
    ctaLabel: "Đặt chuyến công tác",
    icon: "business",
  },
  {
    slug: "theo-yeu-cau",
    serviceType: "CUSTOM",
    title: "Theo yêu cầu",
    shortTitle: "Theo yêu cầu",
    description: "Lộ trình riêng, lịch trình riêng.",
    landingHeadline: "Chuyến đi theo yêu cầu có tài xế",
    landingBody:
      "Lộ trình riêng, nhiều điểm dừng, lịch trình theo nhu cầu của bạn.",
    benefits: [
      "Lộ trình tùy chỉnh",
      "Nhiều điểm dừng",
      "Xe riêng + tài xế",
      "Báo giá sau khi xác nhận lộ trình",
    ],
    ctaLabel: "Đặt chuyến theo yêu cầu",
    icon: "custom",
  },
];

export function getServiceBySlug(slug: string): RideServiceDef | undefined {
  return MOCK_SERVICES.find((s) => s.slug === slug);
}

export function getServiceByType(
  serviceType: ServiceType,
): RideServiceDef | undefined {
  return MOCK_SERVICES.find((s) => s.serviceType === serviceType);
}
