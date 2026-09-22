import type { AppFeature, AppFeatureId } from "@/components/layout/nav-items";

export type HubAccent = {
  /** Soft icon tile background */
  icon: string;
  /** Soft badge chip */
  badge: string;
  /** Hover border / shadow tint */
  ring: string;
};

/** Pastel accents per app — page chrome stays neutral. */
export const HUB_ACCENT: Record<AppFeatureId, HubAccent> = {
  loans: {
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    ring: "hover:border-emerald-300/70 hover:shadow-emerald-900/5 dark:hover:border-emerald-700/50",
  },
  finance: {
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    ring: "hover:border-sky-300/70 hover:shadow-sky-900/5 dark:hover:border-sky-700/50",
  },
  assets: {
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    badge:
      "bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    ring: "hover:border-amber-300/70 hover:shadow-amber-900/5 dark:hover:border-amber-700/50",
  },
  analytics: {
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
    badge:
      "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    ring: "hover:border-violet-300/70 hover:shadow-violet-900/5 dark:hover:border-violet-700/50",
  },
  rideSite: {
    icon: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    ring: "hover:border-teal-300/70 hover:shadow-teal-900/5 dark:hover:border-teal-700/50",
  },
  rideOps: {
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    ring: "hover:border-rose-300/70 hover:shadow-rose-900/5 dark:hover:border-rose-700/50",
  },
  accessAdmin: {
    icon: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
    badge: "bg-pink-50 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    ring: "hover:border-pink-300/70 hover:shadow-pink-900/5 dark:hover:border-pink-700/50",
  },
};

/** Hub-only short copy (href / access unchanged). */
export const HUB_COPY: Record<
  AppFeatureId,
  { title: string; description: string }
> = {
  loans: {
    title: "Khoản vay",
    description: "Theo dõi các khoản vay, lịch trả và lãi suất.",
  },
  finance: {
    title: "Tài chính",
    description: "Quản lý thu chi, dòng tiền và ngân sách cá nhân.",
  },
  assets: {
    title: "Tài sản",
    description: "Theo dõi tài sản, vàng, tiết kiệm và giá trị hiện tại.",
  },
  analytics: {
    title: "Phân tích",
    description: "Biểu đồ, báo cáo và xu hướng chi tiêu, tài sản.",
  },
  rideSite: {
    title: "Website đặt chuyến",
    description: "Trải nghiệm đặt xe, du lịch, khám bệnh và nhiều dịch vụ khác.",
  },
  rideOps: {
    title: "Vận hành xe",
    description: "Quản lý xe, tài xế, chi phí và bảo dưỡng.",
  },
  accessAdmin: {
    title: "Quản trị",
    description: "Cài đặt, phân quyền và quản lý hệ thống.",
  },
};

export const HUB_STATIC_BADGE: Record<AppFeatureId, string> = {
  loans: "Mở ngay",
  finance: "Mở ngay",
  assets: "Mở ngay",
  analytics: "Xem chi tiết",
  rideSite: "Đặt ngay",
  rideOps: "Xe của bạn",
  accessAdmin: "Dành cho Admin",
};

export function filterFeaturesByQuery(
  features: AppFeature[],
  query: string,
): AppFeature[] {
  const q = query.trim().toLowerCase();
  if (!q) return features;
  return features.filter((f) => {
    const copy = HUB_COPY[f.id];
    const hay = [
      f.title,
      f.description,
      copy.title,
      copy.description,
      f.id,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function featureDisplayTitle(id: AppFeatureId, fallback: string): string {
  return HUB_COPY[id]?.title ?? fallback;
}

export function featureDisplayDescription(
  id: AppFeatureId,
  fallback: string,
): string {
  return HUB_COPY[id]?.description ?? fallback;
}

export function initialsFromName(name: string | undefined | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? "";
  const last = parts.at(-1)?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}
