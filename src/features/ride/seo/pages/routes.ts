import type { SEOLandingPage } from "@/features/ride/seo/types";

export const SEO_ROUTE_PAGES: SEOLandingPage[] = [
  {
    slug: "an-giang-can-tho",
    type: "route",
    path: "/ride/routes/an-giang-can-tho",
    title: "Xe An Giang Đi Cần Thơ | Xe Riêng Có Tài Xế",
    description:
      "Đặt xe riêng An Giang đi Cần Thơ có tài xế — đón tận nơi, lịch trình linh hoạt, báo giá theo lộ trình.",
    h1: "Xe An Giang đi Cần Thơ có tài xế",
    intro:
      "Tuyến liên tỉnh phổ biến từ An Giang đến Cần Thơ. Xe riêng có tài xế, đón theo địa chỉ xuất phát trong tỉnh.",
    sections: [
      {
        heading: "Điểm đón tại An Giang",
        body: "Long Xuyên, Châu Đốc, Tri Tôn, Châu Thành… — ghi rõ địa chỉ để tài xế đến đúng giờ.",
      },
      {
        heading: "Điểm đến tại Cần Thơ",
        body: "Nội ô Cần Thơ, bệnh viện, khách sạn hoặc điểm bạn chỉ định.",
      },
    ],
    benefits: [
      "Xe riêng + tài xế",
      "Đón tận nơi An Giang",
      "Lịch trình một chiều / khứ hồi",
      "Báo giá sau khi xác nhận",
    ],
    faqs: [
      {
        question: "Có nhận xe An Giang đi Cần Thơ không?",
        answer: "Có. Gửi yêu cầu với điểm đón, điểm đến và thời gian.",
      },
      {
        question: "Có phải thuê xe tự lái không?",
        answer: "Không. Chỉ xe riêng có tài xế.",
      },
      {
        question: "Giá bao nhiêu?",
        answer: "Nhân viên báo giá cụ thể theo lộ trình và loại xe — không niêm yết giá ảo.",
      },
    ],
    related: [
      { href: "/ride/routes/long-xuyen-can-tho", label: "Long Xuyên — Cần Thơ" },
      { href: "/ride/routes/chau-doc-can-tho", label: "Châu Đốc — Cần Thơ" },
      { href: "/ride/locations/an-giang", label: "Xe An Giang" },
      { href: "/ride/lien-tinh", label: "Xe liên tỉnh" },
      { href: "/ride/booking", label: "Đặt chuyến" },
    ],
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Tuyến đường", path: "/ride/routes/an-giang-can-tho" },
      { name: "An Giang — Cần Thơ", path: "/ride/routes/an-giang-can-tho" },
    ],
  },
  {
    slug: "an-giang-tphcm",
    type: "route",
    path: "/ride/routes/an-giang-tphcm",
    title: "Xe An Giang Đi TP HCM | Xe Riêng Có Tài Xế",
    description:
      "Đặt xe An Giang đi TP.HCM có tài xế — xe riêng, đón tận nơi, phù hợp công tác và gia đình.",
    h1: "Xe An Giang đi TP.HCM có tài xế",
    intro:
      "Hành trình dài ngày hoặc trong ngày từ An Giang đến TP. Hồ Chí Minh bằng xe riêng có tài xế.",
    sections: [
      {
        heading: "Phù hợp công tác & gia đình",
        body: "Mang hành lý, trẻ em hoặc lịch họp cố định — xe riêng giúp chủ động giờ giấc hơn xe khách.",
      },
      {
        heading: "Xuất phát",
        body: "Long Xuyên và các điểm trong An Giang; điểm đến theo địa chỉ tại TP.HCM.",
      },
    ],
    benefits: [
      "Xe riêng có tài xế",
      "Đón tận nơi",
      "Lịch trình theo yêu cầu",
      "Báo giá theo lộ trình thực tế",
    ],
    faqs: [
      {
        question: "Có xe An Giang đi TP.HCM không?",
        answer: "Có. Liên hệ/đặt chuyến với ngày giờ và địa chỉ hai đầu.",
      },
      {
        question: "Có nhận khứ hồi không?",
        answer: "Có, ghi rõ trong yêu cầu để được tư vấn.",
      },
    ],
    related: [
      { href: "/ride/routes/long-xuyen-can-tho", label: "Long Xuyên — Cần Thơ" },
      { href: "/ride/cong-tac", label: "Xe công tác" },
      { href: "/ride/locations/long-xuyen", label: "Long Xuyên" },
      { href: "/ride/booking", label: "Đặt chuyến" },
    ],
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Tuyến đường", path: "/ride/routes/an-giang-tphcm" },
      { name: "An Giang — TP.HCM", path: "/ride/routes/an-giang-tphcm" },
    ],
  },
  {
    slug: "long-xuyen-can-tho",
    type: "route",
    path: "/ride/routes/long-xuyen-can-tho",
    title: "Xe Long Xuyên Đi Cần Thơ | Xe Riêng Có Tài Xế",
    description:
      "Đặt xe Long Xuyên đi Cần Thơ có tài xế — đón tận nơi, xe riêng, báo giá theo lộ trình.",
    h1: "Xe Long Xuyên đi Cần Thơ có tài xế",
    intro:
      "Tuyến ngắn liên tỉnh giữa Long Xuyên và Cần Thơ — phù hợp công tác, khám bệnh, đưa đón trong ngày.",
    sections: [
      {
        heading: "Đón tại Long Xuyên",
        body: "Nhà riêng, văn phòng, khách sạn trong nội ô hoặc ngoại ô Long Xuyên.",
      },
      {
        heading: "Đến Cần Thơ",
        body: "Theo địa chỉ bạn chỉ định; có thể kết hợp chờ rồi đưa về.",
      },
    ],
    benefits: ["Xe riêng", "Đúng giờ", "Đón tận nơi", "Linh hoạt một chiều / khứ hồi"],
    faqs: [
      {
        question: "Có xe Long Xuyên đi Cần Thơ không?",
        answer: "Có. Đây là tuyến thường xuyên.",
      },
      {
        question: "Có đưa đón sân bay Cần Thơ từ Long Xuyên không?",
        answer:
          "Có. Xem trang Long Xuyên — Sân bay Cần Thơ hoặc chọn dịch vụ sân bay.",
      },
    ],
    related: [
      {
        href: "/ride/routes/long-xuyen-san-bay-can-tho",
        label: "Long Xuyên — Sân bay Cần Thơ",
      },
      { href: "/ride/locations/long-xuyen", label: "Xe Long Xuyên" },
      { href: "/ride/dua-don-san-bay", label: "Đưa đón sân bay" },
      { href: "/ride/booking", label: "Đặt chuyến" },
    ],
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Tuyến đường", path: "/ride/routes/long-xuyen-can-tho" },
      { name: "Long Xuyên — Cần Thơ", path: "/ride/routes/long-xuyen-can-tho" },
    ],
  },
  {
    slug: "long-xuyen-san-bay-can-tho",
    type: "route",
    path: "/ride/routes/long-xuyen-san-bay-can-tho",
    title: "Xe Long Xuyên Đi Sân Bay Cần Thơ | Có Tài Xế",
    description:
      "Đặt xe đưa đón sân bay Cần Thơ từ Long Xuyên — xe riêng có tài xế, đúng giờ bay.",
    h1: "Xe Long Xuyên đi sân bay Cần Thơ",
    intro:
      "Đưa đón sân bay Cần Thơ xuất phát từ Long Xuyên. Tài xế đón tận nơi, hỗ trợ hành lý.",
    sections: [
      {
        heading: "Chiều đi và chiều về",
        body: "Cung cấp giờ bay / giờ hạ cánh. Có thể đặt một chiều hoặc khứ hồi.",
      },
    ],
    benefits: ["Đúng giờ bay", "Đón tận nhà Long Xuyên", "Xe riêng + tài xế", "Hỗ trợ hành lý"],
    faqs: [
      {
        question: "Có xe Long Xuyên đi sân bay Cần Thơ không?",
        answer: "Có. Chọn dịch vụ sân bay hoặc gửi yêu cầu trên trang này.",
      },
      {
        question: "Giá được xác nhận thế nào?",
        answer: "Nhân viên liên hệ báo giá sau khi có thời gian và địa chỉ đón.",
      },
    ],
    related: [
      { href: "/ride/dua-don-san-bay", label: "Đưa đón sân bay" },
      { href: "/ride/routes/long-xuyen-can-tho", label: "Long Xuyên — Cần Thơ" },
      { href: "/ride/locations/long-xuyen", label: "Long Xuyên" },
      { href: "/ride/booking?serviceType=AIRPORT", label: "Đặt chuyến sân bay" },
    ],
    bookingQuery: "serviceType=AIRPORT",
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Tuyến đường", path: "/ride/routes/long-xuyen-san-bay-can-tho" },
      {
        name: "Long Xuyên — Sân bay Cần Thơ",
        path: "/ride/routes/long-xuyen-san-bay-can-tho",
      },
    ],
  },
  {
    slug: "chau-doc-can-tho",
    type: "route",
    path: "/ride/routes/chau-doc-can-tho",
    title: "Xe Châu Đốc Đi Cần Thơ | Xe Riêng Có Tài Xế",
    description:
      "Đặt xe Châu Đốc đi Cần Thơ có tài xế — đón tận nơi, xe riêng, phù hợp du lịch và công tác.",
    h1: "Xe Châu Đốc đi Cần Thơ có tài xế",
    intro:
      "Tuyến từ Châu Đốc đến Cần Thơ bằng xe riêng có tài xế — đón theo địa chỉ tại Châu Đốc.",
    sections: [
      {
        heading: "Xuất phát Châu Đốc",
        body: "Nhà riêng, khách sạn hoặc điểm hẹn trong khu vực Châu Đốc.",
      },
      {
        heading: "Đến Cần Thơ",
        body: "Theo địa chỉ bạn cung cấp; có thể kết hợp sân bay Cần Thơ nếu cần.",
      },
    ],
    benefits: ["Xe riêng + tài xế", "Đón tại Châu Đốc", "Lịch trình linh hoạt", "Báo giá rõ ràng"],
    faqs: [
      {
        question: "Có xe Châu Đốc đi Cần Thơ không?",
        answer: "Có. Gửi điểm đón, điểm đến và thời gian để được xác nhận.",
      },
      {
        question: "Có phải tự lái không?",
        answer: "Không. Tài xế phục vụ cả chuyến.",
      },
    ],
    related: [
      { href: "/ride/locations/chau-doc", label: "Xe Châu Đốc" },
      { href: "/ride/routes/an-giang-can-tho", label: "An Giang — Cần Thơ" },
      { href: "/ride/du-lich", label: "Xe du lịch" },
      { href: "/ride/booking", label: "Đặt chuyến" },
    ],
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Tuyến đường", path: "/ride/routes/chau-doc-can-tho" },
      { name: "Châu Đốc — Cần Thơ", path: "/ride/routes/chau-doc-can-tho" },
    ],
  },
];
