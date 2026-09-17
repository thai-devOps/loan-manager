import type { SEOLandingPage } from "@/features/ride/seo/types";

const sharedFaqs = {
  selfDrive: {
    question: "Đây có phải thuê xe tự lái không?",
    answer:
      "Không. Đây là dịch vụ xe riêng có tài xế. Chúng tôi không cung cấp thuê xe tự lái.",
  },
  pickup: {
    question: "Có nhận đón tận nơi không?",
    answer:
      "Có. Xe đón và trả theo địa chỉ bạn yêu cầu trong khu vực phục vụ.",
  },
  interProvince: {
    question: "Có nhận chuyến liên tỉnh không?",
    answer:
      "Có. Ngoài An Giang, chúng tôi nhận các tuyến đi tỉnh theo lịch trình và nhu cầu của bạn.",
  },
  price: {
    question: "Giá chuyến được xác nhận như thế nào?",
    answer:
      "Sau khi bạn gửi yêu cầu (lộ trình, loại xe, thời gian), nhân viên liên hệ báo giá cụ thể. Không tự tạo giá ảo trên website.",
  },
  howToBook: {
    question: "Làm sao để đặt chuyến?",
    answer:
      "Chọn dịch vụ hoặc nhấn Đặt chuyến, nhập điểm đón/đến, ngày giờ và số điện thoại. Không cần tạo tài khoản.",
  },
};

export const SEO_SERVICE_PAGES: SEOLandingPage[] = [
  {
    slug: "xe-co-tai-xe",
    type: "pillar",
    path: "/ride/xe-co-tai-xe",
    title: "Xe Có Tài Xế An Giang | Đặt Xe Riêng Có Tài Xế",
    description:
      "Đặt xe riêng có tài xế tại An Giang. Đón tận nơi tại Long Xuyên, Châu Đốc, Tri Tôn — phục vụ du lịch, khám bệnh, sân bay và đi tỉnh.",
    h1: "Xe có tài xế tại An Giang",
    intro:
      "Dịch vụ xe riêng có tài xế giúp bạn di chuyển an tâm trong An Giang và các tuyến liên tỉnh. Tài xế phục vụ theo lịch trình bạn chọn — không phải thuê xe tự lái.",
    sections: [
      {
        heading: "Xe riêng + tài xế, rõ ràng từ đầu",
        body: "Mỗi chuyến đều có tài xế đi cùng. Phù hợp gia đình, người bệnh, công tác và hành trình cần đúng giờ.",
      },
      {
        heading: "Khu vực phục vụ",
        body: "Đón trả tại Long Xuyên, Châu Đốc, Tri Tôn, Châu Thành và các khu vực khác trong An Giang; nhận thêm tuyến đi Cần Thơ, TP.HCM và sân bay.",
      },
    ],
    benefits: [
      "Xe riêng, không ghép khách",
      "Tài xế lịch sự, đúng giờ",
      "Đón tận nơi theo địa chỉ",
      "Báo giá sau khi xác nhận lộ trình",
    ],
    faqs: [
      sharedFaqs.selfDrive,
      sharedFaqs.pickup,
      sharedFaqs.interProvince,
      sharedFaqs.howToBook,
      sharedFaqs.price,
    ],
    related: [
      { href: "/ride/dich-vu", label: "Tất cả dịch vụ" },
      { href: "/ride/locations/an-giang", label: "Xe có tài xế An Giang" },
      { href: "/ride/routes/an-giang-can-tho", label: "Tuyến An Giang — Cần Thơ" },
      { href: "/ride/booking", label: "Đặt chuyến" },
    ],
    bookingQuery: "",
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Xe có tài xế", path: "/ride/xe-co-tai-xe" },
    ],
  },
  {
    slug: "du-lich",
    type: "service",
    path: "/ride/du-lich",
    title: "Xe Đi Du Lịch An Giang | Xe Riêng Có Tài Xế",
    description:
      "Thuê xe đi du lịch An Giang có tài xế: đón tận nơi, lịch trình linh hoạt cho gia đình và nhóm bạn.",
    h1: "Xe đi du lịch có tài xế",
    intro:
      "Phù hợp gia đình, nhóm bạn đi tham quan trong tỉnh hoặc liên tỉnh. Xe riêng, tài xế phục vụ theo lịch bạn đặt.",
    sections: [
      {
        heading: "Lịch trình linh hoạt",
        body: "Có thể kết hợp nhiều điểm trong ngày hoặc đi overnight — báo rõ lộ trình khi đặt để được tư vấn loại xe phù hợp.",
      },
      {
        heading: "Gợi ý điểm đến phổ biến",
        body: "Châu Đốc, rừng tràm Trà Sư, núi Cấm / Tri Tôn và các điểm tham quan quanh An Giang — kết nối thêm Cần Thơ nếu cần.",
      },
    ],
    benefits: ["Xe riêng", "Tài xế phục vụ", "Đón tận nơi", "Lịch trình linh hoạt"],
    faqs: [
      sharedFaqs.selfDrive,
      sharedFaqs.pickup,
      {
        question: "Có đặt xe đi chơi trong ngày được không?",
        answer:
          "Có. Bạn ghi rõ điểm đón, điểm đến và khung giờ; nhân viên sẽ xác nhận và báo giá.",
      },
      sharedFaqs.price,
    ],
    related: [
      { href: "/ride/xe-co-tai-xe", label: "Xe có tài xế" },
      { href: "/ride/locations/chau-doc", label: "Xe Châu Đốc" },
      { href: "/ride/kham-benh", label: "Xe khám bệnh" },
      { href: "/ride/booking?serviceType=TRAVEL", label: "Đặt chuyến du lịch" },
    ],
    bookingQuery: "serviceType=TRAVEL",
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Dịch vụ", path: "/ride/dich-vu" },
      { name: "Du lịch", path: "/ride/du-lich" },
    ],
  },
  {
    slug: "kham-benh",
    type: "service",
    path: "/ride/kham-benh",
    title: "Xe Đi Khám Bệnh | Xe Đưa Đón Bệnh Viện Có Tài Xế",
    description:
      "Đặt xe đưa đón khám bệnh có tài xế tại An Giang — đón tận nhà, chờ theo lịch hẹn, phù hợp người bệnh và gia đình.",
    h1: "Xe đi khám bệnh có tài xế",
    intro:
      "Đưa đón đến bệnh viện, phòng khám trong và ngoài tỉnh. Tài xế hỗ trợ hành khách, lịch trình bám theo giờ khám.",
    sections: [
      {
        heading: "Đón — chờ — trả theo lịch khám",
        body: "Bạn cung cấp địa chỉ nhà và cơ sở y tế, khung giờ hẹn. Chúng tôi sắp xếp xe riêng để giảm lo chỗ đậu và di chuyển.",
      },
      {
        heading: "Phù hợp ai?",
        body: "Người lớn tuổi, sản phụ, bệnh nhân tái khám định kỳ, hoặc gia đình cần đưa đón liên tỉnh đến bệnh viện tuyến trên.",
      },
    ],
    benefits: [
      "Đón tận nhà / bệnh viện",
      "Tài xế hỗ trợ hành khách",
      "Chờ theo lịch khám",
      "Xe riêng, sạch sẽ",
    ],
    faqs: [
      sharedFaqs.pickup,
      {
        question: "Có thể đặt xe đi khám bệnh không?",
        answer:
          "Có. Chọn dịch vụ Khám bệnh hoặc ghi rõ trong ghi chú khi đặt chuyến.",
      },
      sharedFaqs.interProvince,
      sharedFaqs.price,
    ],
    related: [
      { href: "/ride/xe-co-tai-xe", label: "Xe có tài xế" },
      { href: "/ride/locations/long-xuyen", label: "Xe Long Xuyên" },
      { href: "/ride/cong-tac", label: "Xe công tác" },
      { href: "/ride/booking?serviceType=MEDICAL", label: "Đặt chuyến khám bệnh" },
    ],
    bookingQuery: "serviceType=MEDICAL",
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Dịch vụ", path: "/ride/dich-vu" },
      { name: "Khám bệnh", path: "/ride/kham-benh" },
    ],
  },
  {
    slug: "hanh-huong",
    type: "service",
    path: "/ride/hanh-huong",
    title: "Xe Đi Hành Hương | Xe Riêng Có Tài Xế An Giang",
    description:
      "Thuê xe đi hành hương có tài xế tại An Giang — phù hợp gia đình và đoàn nhỏ, lịch trình theo yêu cầu.",
    h1: "Xe đi hành hương có tài xế",
    intro:
      "Phục vụ chuyến hành hương, lễ hội, hành trình tâm linh. Xe riêng giúp đoàn di chuyển cùng nhau, đúng giờ.",
    sections: [
      {
        heading: "Lịch trình theo yêu cầu",
        body: "Nhiều điểm dừng trong ngày hoặc hành trình dài ngày — ghi rõ lộ trình để được tư vấn số chỗ và thời gian hợp lý.",
      },
    ],
    benefits: [
      "Xe riêng + tài xế",
      "Phù hợp đoàn nhỏ / lớn",
      "Lịch trình theo yêu cầu",
      "Đón trả linh hoạt",
    ],
    faqs: [sharedFaqs.selfDrive, sharedFaqs.pickup, sharedFaqs.price, sharedFaqs.howToBook],
    related: [
      { href: "/ride/du-lich", label: "Xe du lịch" },
      { href: "/ride/locations/tri-ton", label: "Xe Tri Tôn" },
      { href: "/ride/booking?serviceType=PILGRIMAGE", label: "Đặt chuyến hành hương" },
    ],
    bookingQuery: "serviceType=PILGRIMAGE",
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Dịch vụ", path: "/ride/dich-vu" },
      { name: "Hành hương", path: "/ride/hanh-huong" },
    ],
  },
  {
    slug: "dua-don-san-bay",
    type: "service",
    path: "/ride/dua-don-san-bay",
    title: "Xe Đưa Đón Sân Bay Cần Thơ Từ An Giang",
    description:
      "Đặt xe đưa đón sân bay Cần Thơ từ An Giang, Long Xuyên, Châu Đốc — xe riêng có tài xế, đúng giờ bay.",
    h1: "Xe đưa đón sân bay có tài xế",
    intro:
      "Đưa đón sân bay (thường là sân bay Cần Thơ) từ các điểm tại An Giang. Tài xế theo dõi giờ bay linh hoạt khi có thay đổi nhẹ.",
    sections: [
      {
        heading: "Từ An Giang đến sân bay Cần Thơ",
        body: "Xuất phát Long Xuyên, Châu Đốc hoặc các huyện — đón tận nhà, hỗ trợ hành lý, trả đúng cửa nhà ga.",
      },
      {
        heading: "Chiều về",
        body: "Đón tại sân bay và đưa về An Giang theo giờ hạ cánh bạn cung cấp.",
      },
    ],
    benefits: ["Đúng giờ", "Theo dõi giờ bay", "Xe riêng + tài xế", "Hỗ trợ hành lý"],
    faqs: [
      {
        question: "Có đưa đón sân bay Cần Thơ không?",
        answer:
          "Có. Đây là tuyến phổ biến từ An Giang. Ghi rõ chiều đi/về và giờ bay khi đặt.",
      },
      sharedFaqs.pickup,
      sharedFaqs.price,
      sharedFaqs.howToBook,
    ],
    related: [
      { href: "/ride/routes/long-xuyen-san-bay-can-tho", label: "Long Xuyên — Sân bay Cần Thơ" },
      { href: "/ride/locations/long-xuyen", label: "Xe Long Xuyên" },
      { href: "/ride/booking?serviceType=AIRPORT", label: "Đặt chuyến sân bay" },
    ],
    bookingQuery: "serviceType=AIRPORT",
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Dịch vụ", path: "/ride/dich-vu" },
      { name: "Đưa đón sân bay", path: "/ride/dua-don-san-bay" },
    ],
  },
  {
    slug: "cong-tac",
    type: "service",
    path: "/ride/cong-tac",
    title: "Xe Công Tác Có Tài Xế | Xe Riêng Đi Tỉnh",
    description:
      "Xe riêng phục vụ công tác, họp, sự kiện tại An Giang và liên tỉnh — tài xế lịch sự, đúng giờ.",
    h1: "Xe công tác có tài xế",
    intro:
      "Phù hợp doanh nghiệp và cá nhân cần xe riêng cho họp, sự kiện, đi tỉnh công tác.",
    sections: [
      {
        heading: "Lịch trình chuyên nghiệp",
        body: "Một hoặc nhiều điểm trong ngày. Có thể kết hợp chờ tại điểm họp rồi đưa về.",
      },
    ],
    benefits: ["Xe riêng", "Tài xế lịch sự", "Đúng giờ", "Lịch trình linh hoạt"],
    faqs: [sharedFaqs.selfDrive, sharedFaqs.interProvince, sharedFaqs.price, sharedFaqs.howToBook],
    related: [
      { href: "/ride/lien-tinh", label: "Xe liên tỉnh" },
      { href: "/ride/routes/an-giang-tphcm", label: "An Giang — TP.HCM" },
      { href: "/ride/booking?serviceType=BUSINESS", label: "Đặt chuyến công tác" },
    ],
    bookingQuery: "serviceType=BUSINESS",
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Dịch vụ", path: "/ride/dich-vu" },
      { name: "Công tác", path: "/ride/cong-tac" },
    ],
  },
  {
    slug: "lien-tinh",
    type: "service",
    path: "/ride/lien-tinh",
    title: "Xe Riêng Đi Tỉnh | Xe Có Tài Xế Liên Tỉnh Từ An Giang",
    description:
      "Đặt xe riêng đi tỉnh từ An Giang: Cần Thơ, TP.HCM và các tuyến khác — có tài xế, đón tận nơi.",
    h1: "Xe riêng đi tỉnh / liên tỉnh",
    intro:
      "Ngoài di chuyển trong An Giang, chúng tôi nhận các chuyến liên tỉnh theo lịch trình bạn đặt.",
    sections: [
      {
        heading: "Tuyến thường gặp",
        body: "An Giang — Cần Thơ, Long Xuyên — TP.HCM, Châu Đốc — Cần Thơ, đưa đón sân bay Cần Thơ.",
      },
    ],
    benefits: [
      "Xe riêng + tài xế",
      "Đón tận nơi",
      "Lịch trình theo yêu cầu",
      "Báo giá theo lộ trình thực tế",
    ],
    faqs: [
      sharedFaqs.interProvince,
      sharedFaqs.price,
      sharedFaqs.howToBook,
      sharedFaqs.selfDrive,
    ],
    related: [
      { href: "/ride/routes/an-giang-can-tho", label: "An Giang — Cần Thơ" },
      { href: "/ride/routes/an-giang-tphcm", label: "An Giang — TP.HCM" },
      { href: "/ride/dua-don-san-bay", label: "Đưa đón sân bay" },
      { href: "/ride/booking", label: "Đặt chuyến" },
    ],
    bookingQuery: "",
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Dịch vụ", path: "/ride/dich-vu" },
      { name: "Liên tỉnh", path: "/ride/lien-tinh" },
    ],
  },
  {
    slug: "theo-yeu-cau",
    type: "service",
    path: "/ride/theo-yeu-cau",
    title: "Xe Theo Yêu Cầu | Lộ Trình Riêng Có Tài Xế",
    description:
      "Đặt xe theo yêu cầu tại An Giang: nhiều điểm dừng, lộ trình riêng, xe riêng có tài xế.",
    h1: "Chuyến đi theo yêu cầu có tài xế",
    intro:
      "Khi lộ trình không cố định — nhiều điểm dừng hoặc lịch riêng — chọn dịch vụ theo yêu cầu để được tư vấn.",
    sections: [
      {
        heading: "Báo giá sau khi xác nhận lộ trình",
        body: "Mô tả điểm đón, các điểm dừng và thời gian dự kiến. Nhân viên liên hệ xác nhận và báo giá.",
      },
    ],
    benefits: [
      "Lộ trình tùy chỉnh",
      "Nhiều điểm dừng",
      "Xe riêng + tài xế",
      "Báo giá sau khi xác nhận lộ trình",
    ],
    faqs: [sharedFaqs.howToBook, sharedFaqs.price, sharedFaqs.selfDrive],
    related: [
      { href: "/ride/dich-vu", label: "Dịch vụ" },
      { href: "/ride/xe-co-tai-xe", label: "Xe có tài xế" },
      { href: "/ride/booking?serviceType=CUSTOM", label: "Đặt chuyến theo yêu cầu" },
    ],
    bookingQuery: "serviceType=CUSTOM",
    indexable: true,
    breadcrumbs: [
      { name: "Trang chủ", path: "/ride" },
      { name: "Dịch vụ", path: "/ride/dich-vu" },
      { name: "Theo yêu cầu", path: "/ride/theo-yeu-cau" },
    ],
  },
];
