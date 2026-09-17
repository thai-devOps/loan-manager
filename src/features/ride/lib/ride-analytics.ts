type RideAnalyticsEvent =
  | "page_view"
  | "booking_started"
  | "booking_submitted"
  | "booking_success";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function measurementId(): string | undefined {
  const id = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim();
  return id || undefined;
}

let loaded = false;

export function initRideAnalytics() {
  const id = measurementId();
  if (!id || loaded || typeof document === "undefined") return;
  loaded = true;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { send_page_view: false });
}

export function trackRideEvent(
  event: RideAnalyticsEvent,
  params?: Record<string, string | number | boolean | undefined>,
) {
  if (!measurementId() || typeof window.gtag !== "function") return;
  const clean: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) clean[k] = v;
    }
  }
  // Capture UTM if present
  try {
    const sp = new URLSearchParams(window.location.search);
    for (const key of ["utm_source", "utm_medium", "utm_campaign"] as const) {
      const val = sp.get(key);
      if (val) clean[key] = val;
    }
  } catch {
    /* ignore */
  }
  window.gtag("event", event, clean);
}

export function trackRidePageView(path: string) {
  trackRideEvent("page_view", { page_path: path });
}
