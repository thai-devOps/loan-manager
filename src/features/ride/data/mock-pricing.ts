export type PricingRow = {
  id: string;
  title: string;
  description: string;
};

/** Reference pricing copy only — no fabricated amounts. */
export const MOCK_PRICING: PricingRow[] = [
  {
    id: "in-province",
    title: "Chuyến nội tỉnh",
    description: "Liên hệ báo giá",
  },
  {
    id: "inter-province",
    title: "Chuyến liên tỉnh",
    description: "Tính theo lộ trình",
  },
  {
    id: "airport",
    title: "Đi sân bay",
    description: "Tính theo điểm đón",
  },
  {
    id: "medical",
    title: "Đi khám bệnh",
    description: "Tính theo lịch trình",
  },
  {
    id: "pilgrimage",
    title: "Đi hành hương",
    description: "Tính theo chuyến / ngày",
  },
  {
    id: "daily",
    title: "Thuê xe theo ngày",
    description: "Liên hệ báo giá",
  },
];
