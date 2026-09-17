import type { SEOLandingPage } from "@/features/ride/seo/types";

export const SEO_LOCATION_PAGES: SEOLandingPage[] = [
  {
    slug: "an-giang",
    type: "location",
    path: "/ride/locations/an-giang",
    title: "Đặt Xe Có Tài Xế An Giang | Xe Riêng Đón Tận Nơi",
    description:
      "Đặt xe riêng có tài xế tại An Giang. Đón trả tận nơi tại Long Xuyên, Châu Đốc, Tri Tôn và nhận chuyến đi tỉnh, sân bay, khám bệnh, du lịch.",
    h1: "Xe có tài xế tại An Giang",
    intro:
      "An Giang là khu vực phục vụ chính. Chúng tôi đón tận nơi trong tỉnh và nhận các tuyến liên tỉnh — luôn là xe riêng có tài xế, không thuê tự lái.",
    sections: [
      {
        heading: "Khu vực đón trả trong tỉnh",
        body: "Long Xuyên, Châu Đốc, Tri Tôn, Châu Thành và các xã/huyện khác theo địa chỉ bạn cung cấp.",
      },
      {
        heading: "Nhu cầu phổ biến",
        body: "Du lịch, khám bệnh, hành hương, công tác, đưa đón sân bay Cần Thơ và đi TP.HCM.",
      },
    ],
    benefits: [
      "Phục vụ toàn An Giang",
      "Xe riêng + tài xế",
      "Đón tận nơi",
      "Nhận tuyến liên tỉnh",
    ],
    faqs: [
      {
        question: "Có nhận đón tận nơi tại An Giang không?",
        answer: "Có. Bạn nhập địa chỉ khi đặt chuyến; tài xế đến đúng điểm hẹn.",
      },
      {
        question: "Có nhận chuyến liên tỉnh không?",
        answer: "Có. Ví dụ Cần Thơ, TP.HCM, sân bay Cần Thơ — báo lộ trình để được báo giá.",
      },
      {
        question: "Đây có phải thuê xe tự lái không?",
        answer: "Không. Chỉ xe riêng có tài xế.",
      },
    ],
    related: [
      { href: "/ride/locations/long-xuyen", label: "Long Xuyên" },
      { href: "/ride/locations/chau-doc", label: "Châu Đốc" },
      { href: "/ride/routes/an-giang-can-tho", label: "An Giang — Cần Thơ" },
      { href: "/ride/xe-co-tai-xe", label: "Xe có tài xế" },
      { href: "/ride/booking", label: "Đặt chuyến" },
    ],
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Khu vực", path: "/ride/locations/an-giang" },
      { name: "An Giang", path: "/ride/locations/an-giang" },
    ],
  },
  {
    slug: "long-xuyen",
    type: "location",
    path: "/ride/locations/long-xuyen",
    title: "Xe Có Tài Xế Long Xuyên | Xe Riêng Đón Tận Nơi",
    description:
      "Đặt xe có tài xế tại Long Xuyên: đón tận nơi, đi Châu Đốc, Cần Thơ, sân bay và các tuyến liên tỉnh.",
    h1: "Xe có tài xế tại Long Xuyên",
    intro:
      "Long Xuyên là điểm xuất phát phổ biến. Xe riêng có tài xế đón tại nhà, khách sạn hoặc địa điểm bạn chọn trong thành phố.",
    sections: [
      {
        heading: "Dịch vụ xe riêng tại Long Xuyên",
        body: "Đi trong tỉnh (Châu Đốc, Tri Tôn…) hoặc liên tỉnh (Cần Thơ, TP.HCM, sân bay Cần Thơ).",
      },
      {
        heading: "Các nhu cầu đặt xe",
        body: "Công tác, đưa đón bệnh viện, sân bay, du lịch cuối tuần và hợp đồng theo lịch.",
      },
    ],
    benefits: [
      "Đón tận nơi tại Long Xuyên",
      "Kết nối Cần Thơ & sân bay",
      "Xe riêng có tài xế",
      "Báo giá theo lộ trình",
    ],
    faqs: [
      {
        question: "Đón trong nội ô Long Xuyên được không?",
        answer: "Được. Ghi rõ địa chỉ hoặc điểm mốc khi đặt.",
      },
      {
        question: "Có xe Long Xuyên đi Cần Thơ không?",
        answer: "Có. Xem thêm trang tuyến Long Xuyên — Cần Thơ hoặc đặt trực tiếp.",
      },
      {
        question: "Giá chuyến tính thế nào?",
        answer: "Nhân viên báo giá sau khi có lộ trình và loại xe — không niêm yết giá ảo.",
      },
    ],
    related: [
      { href: "/ride/routes/long-xuyen-can-tho", label: "Long Xuyên — Cần Thơ" },
      {
        href: "/ride/routes/long-xuyen-san-bay-can-tho",
        label: "Long Xuyên — Sân bay Cần Thơ",
      },
      { href: "/ride/dua-don-san-bay", label: "Đưa đón sân bay" },
      { href: "/ride/locations/chau-doc", label: "Châu Đốc" },
      { href: "/ride/booking", label: "Đặt chuyến" },
    ],
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "An Giang", path: "/ride/locations/an-giang" },
      { name: "Long Xuyên", path: "/ride/locations/long-xuyen" },
    ],
  },
  {
    slug: "chau-doc",
    type: "location",
    path: "/ride/locations/chau-doc",
    title: "Xe Có Tài Xế Châu Đốc | Đặt Xe Riêng Đi Tỉnh",
    description:
      "Xe riêng có tài xế tại Châu Đốc: đón tận nơi, đi Long Xuyên, Cần Thơ, hành hương và du lịch.",
    h1: "Xe có tài xế tại Châu Đốc",
    intro:
      "Phục vụ đón trả tại Châu Đốc cho du lịch, hành hương, công tác và các tuyến đi tỉnh.",
    sections: [
      {
        heading: "Du lịch & hành hương",
        body: "Châu Đốc và vùng lân cận thường kết hợp lịch tham quan hoặc hành hương — xe riêng giúp cả nhà đi cùng.",
      },
      {
        heading: "Liên tỉnh từ Châu Đốc",
        body: "Tuyến Châu Đốc — Cần Thơ và các hành trình dài hơn theo yêu cầu.",
      },
    ],
    benefits: [
      "Đón tại Châu Đốc",
      "Xe riêng + tài xế",
      "Phù hợp gia đình / đoàn nhỏ",
      "Nhận tuyến liên tỉnh",
    ],
    faqs: [
      {
        question: "Có đón tận nơi ở Châu Đốc không?",
        answer: "Có. Nhập địa chỉ khi đặt chuyến.",
      },
      {
        question: "Có xe Châu Đốc đi Cần Thơ không?",
        answer: "Có. Xem trang tuyến Châu Đốc — Cần Thơ hoặc gửi yêu cầu đặt chuyến.",
      },
    ],
    related: [
      { href: "/ride/routes/chau-doc-can-tho", label: "Châu Đốc — Cần Thơ" },
      { href: "/ride/du-lich", label: "Xe du lịch" },
      { href: "/ride/hanh-huong", label: "Xe hành hương" },
      { href: "/ride/locations/long-xuyen", label: "Long Xuyên" },
      { href: "/ride/booking", label: "Đặt chuyến" },
    ],
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "An Giang", path: "/ride/locations/an-giang" },
      { name: "Châu Đốc", path: "/ride/locations/chau-doc" },
    ],
  },
  {
    slug: "tri-ton",
    type: "location",
    path: "/ride/locations/tri-ton",
    title: "Xe Riêng Tri Tôn | Xe Có Tài Xế An Giang",
    description:
      "Đặt xe có tài xế tại Tri Tôn: đón tận nơi, đi Long Xuyên, Châu Đốc, hành hương núi và liên tỉnh.",
    h1: "Xe có tài xế tại Tri Tôn",
    intro:
      "Phục vụ đón trả khu vực Tri Tôn — phù hợp đi lại trong tỉnh, hành hương và kết nối Long Xuyên / Châu Đốc.",
    sections: [
      {
        heading: "Khu vực phục vụ",
        body: "Đón theo địa chỉ tại Tri Tôn và các điểm lân cận; kết hợp lộ trình tham quan hoặc hành hương khi cần.",
      },
    ],
    benefits: ["Đón tại Tri Tôn", "Xe riêng có tài xế", "Lịch trình linh hoạt", "Nhận đi tỉnh"],
    faqs: [
      {
        question: "Có nhận đón tận nơi ở Tri Tôn không?",
        answer: "Có. Cung cấp địa chỉ hoặc điểm mốc rõ ràng khi đặt.",
      },
      {
        question: "Có phải thuê xe tự lái không?",
        answer: "Không. Chỉ xe riêng có tài xế.",
      },
    ],
    related: [
      { href: "/ride/hanh-huong", label: "Xe hành hương" },
      { href: "/ride/du-lich", label: "Xe du lịch" },
      { href: "/ride/locations/an-giang", label: "An Giang" },
      { href: "/ride/booking", label: "Đặt chuyến" },
    ],
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "An Giang", path: "/ride/locations/an-giang" },
      { name: "Tri Tôn", path: "/ride/locations/tri-ton" },
    ],
  },
  {
    slug: "chau-thanh",
    type: "location",
    path: "/ride/locations/chau-thanh",
    title: "Xe Đưa Đón Châu Thành An Giang | Xe Có Tài Xế",
    description:
      "Xe riêng có tài xế tại Châu Thành (An Giang): đón tận nơi, kết nối Long Xuyên và các tuyến trong tỉnh / liên tỉnh.",
    h1: "Xe có tài xế tại Châu Thành (An Giang)",
    intro:
      "Phục vụ đón trả khu vực Châu Thành An Giang — đi Long Xuyên, các huyện trong tỉnh hoặc tuyến liên tỉnh theo nhu cầu.",
    sections: [
      {
        heading: "Kết nối Long Xuyên & trong tỉnh",
        body: "Thường dùng cho công tác, khám bệnh, đưa đón sân bay (qua Cần Thơ) và việc riêng.",
      },
    ],
    benefits: [
      "Đón tại Châu Thành",
      "Xe riêng + tài xế",
      "Kết nối Long Xuyên",
      "Báo giá theo lộ trình",
    ],
    faqs: [
      {
        question: "Có đón tận nơi Châu Thành An Giang không?",
        answer: "Có. Ghi rõ địa chỉ khi gửi yêu cầu đặt chuyến.",
      },
      {
        question: "Có nhận chuyến liên tỉnh không?",
        answer: "Có, tùy lịch trình và loại xe.",
      },
    ],
    related: [
      { href: "/ride/locations/long-xuyen", label: "Long Xuyên" },
      { href: "/ride/kham-benh", label: "Xe khám bệnh" },
      { href: "/ride/lien-tinh", label: "Xe liên tỉnh" },
      { href: "/ride/booking", label: "Đặt chuyến" },
    ],
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "An Giang", path: "/ride/locations/an-giang" },
      { name: "Châu Thành", path: "/ride/locations/chau-thanh" },
    ],
  },
];
