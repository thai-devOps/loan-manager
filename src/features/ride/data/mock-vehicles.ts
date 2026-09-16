import type { Vehicle } from "@/features/ride/types/ride";

/** Fallback SVG for vehicles without a photo yet. */
function vehiclePlaceholder(label: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue} 35% 28%)"/>
        <stop offset="100%" stop-color="hsl(${hue} 30% 18%)"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#g)"/>
    <text x="400" y="255" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="36" font-weight="600">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: "v-vios",
    name: "Toyota Vios",
    brand: "Toyota",
    model: "Vios",
    seats: 4,
    transmission: "Số tự động",
    fuel: "Xăng",
    images: [
      "https://www.toyota.com.vn/compression/webp?u=%2FResources%2FVehicles%2F318%2F531%2Flibrary%2Facc3306c8126347f9bd25a71dbffbaaf-f964cab1c8.png%3Fv%3D445b75d633&q=80",
    ],
    features: ["Điều hòa", "Camera lùi", "Xe riêng + tài xế"],
    suitableFor: ["airport", "business", "medical", "travel"],
    active: true,
  },
  {
    id: "v-accent",
    name: "Hyundai Accent",
    brand: "Hyundai",
    model: "Accent",
    seats: 5,
    transmission: "Số tự động",
    fuel: "Xăng",
    images: [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSc1mGghuTsJUYPP8GLA_hUWvixjvpAAOuFpeWk_XvR8w&s=10",
    ],
    features: ["Điều hòa", "Màn hình giải trí", "Xe riêng + tài xế"],
    suitableFor: ["airport", "business", "medical", "travel", "family"],
    active: true,
  },
  {
    id: "v-fortuner",
    name: "Toyota Fortuner Legender",
    brand: "Toyota",
    model: "Fortuner Legender",
    seats: 7,
    transmission: "Số tự động",
    fuel: "Máy dầu",
    images: [
      "https://cdn.dailyxe.com.vn/image/toyota-fortuner-legender-24-at-4x2-340460j.jpg",
    ],
    features: [
      "Không gian rộng",
      "Điều hòa 2 vùng",
      "Xe riêng + tài xế",
      "Phù hợp hành lý nhiều",
    ],
    suitableFor: [
      "travel",
      "pilgrimage",
      "medical",
      "business",
      "family",
      "airport",
    ],
    active: true,
  },
  {
    id: "v-innova",
    name: "Toyota Innova",
    brand: "Toyota",
    model: "Innova",
    seats: 7,
    transmission: "Số tự động",
    fuel: "Xăng",
    images: [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsmt1syR5ilvy1y3HGPHL7Sn_z-tot4x0vVN0jTNNbWA&s=10",
    ],
    features: ["Ghế linh hoạt", "Điều hòa", "Xe riêng + tài xế"],
    suitableFor: ["travel", "pilgrimage", "family", "medical", "custom"],
    active: true,
  },
  {
    id: "v-transit",
    name: "Ford Transit",
    brand: "Ford",
    model: "Transit",
    seats: 16,
    transmission: "Số sàn",
    fuel: "Máy dầu",
    images: [vehiclePlaceholder("Ford Transit · 16 chỗ", 220)],
    features: ["Đoàn lớn", "Hành lý nhiều", "Xe riêng + tài xế"],
    suitableFor: ["pilgrimage", "travel", "custom", "family"],
    active: true,
  },
];
