/**
 * Build-time sitemap + prerender helpers.
 * Paths mirror src/features/ride/seo/registry.ts — keep in sync (validated by test).
 */
export const INDEXABLE_PATHS = [
  "/ride",
  "/ride/dich-vu",
  "/ride/cars",
  "/ride/pricing",
  "/ride/contact",
  "/ride/xe-co-tai-xe",
  "/ride/du-lich",
  "/ride/kham-benh",
  "/ride/hanh-huong",
  "/ride/dua-don-san-bay",
  "/ride/cong-tac",
  "/ride/lien-tinh",
  "/ride/theo-yeu-cau",
  "/ride/locations/an-giang",
  "/ride/locations/long-xuyen",
  "/ride/locations/chau-doc",
  "/ride/locations/tri-ton",
  "/ride/locations/chau-thanh",
  "/ride/routes/an-giang-can-tho",
  "/ride/routes/an-giang-tphcm",
  "/ride/routes/long-xuyen-can-tho",
  "/ride/routes/long-xuyen-san-bay-can-tho",
  "/ride/routes/chau-doc-can-tho",
];

/** Minimal content for static HTML prerender shells */
export const PRERENDER_PAGES = [
  {
    path: "/ride",
    title: "Đặt Xe Có Tài Xế An Giang | Xe Riêng Đón Tận Nơi",
    description:
      "Đặt xe riêng có tài xế tại An Giang. Đón trả tận nơi tại Long Xuyên, Châu Đốc, Tri Tôn — du lịch, khám bệnh, sân bay và chuyến liên tỉnh.",
    h1: "Đưa bạn đến nơi, an tâm suốt hành trình.",
    body: "Xe riêng có tài xế cho du lịch, khám bệnh, hành hương, sân bay và các chuyến đi theo yêu cầu tại An Giang.",
  },
  {
    path: "/ride/dich-vu",
    title: "Dịch Vụ Xe Có Tài Xế An Giang | Du Lịch, Khám Bệnh, Sân Bay",
    description:
      "Danh sách dịch vụ xe riêng có tài xế tại An Giang: du lịch, khám bệnh, hành hương, đưa đón sân bay, công tác và liên tỉnh.",
    h1: "Dịch vụ xe có tài xế",
    body: "Tất cả dịch vụ đều là xe riêng có tài xế — không thuê xe tự lái.",
  },
  {
    path: "/ride/cars",
    title: "Xe Phục Vụ | Đội Xe Có Tài Xế An Giang",
    description: "Xem các loại xe riêng có tài xế phục vụ tại An Giang.",
    h1: "Xe phục vụ",
    body: "Chọn xe phù hợp số chỗ và nhu cầu chuyến đi.",
  },
  {
    path: "/ride/pricing",
    title: "Bảng Giá Tham Khảo | Xe Có Tài Xế An Giang",
    description: "Tham khảo cách báo giá xe riêng có tài xế tại An Giang.",
    h1: "Bảng giá",
    body: "Giá cụ thể được xác nhận sau khi có lộ trình — liên hệ để được báo giá.",
  },
  {
    path: "/ride/contact",
    title: "Liên Hệ Đặt Xe Có Tài Xế An Giang",
    description: "Liên hệ đặt xe riêng có tài xế tại An Giang.",
    h1: "Liên hệ",
    body: "Gọi hotline hoặc gửi form để được tư vấn chuyến đi.",
  },
];
