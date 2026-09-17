import { useLocation } from "react-router-dom";
import { useSEO } from "@/features/ride/lib/use-seo";

/**
 * Convenience wrapper — prefer useSEO with explicit path for landings.
 */
export function useRidePageMeta(
  title: string,
  description?: string,
  options?: { noindex?: boolean },
) {
  const { pathname } = useLocation();
  const desc =
    description ??
    "Xe riêng có tài xế tại An Giang — đón tận nơi, báo giá theo lộ trình.";

  useSEO({
    title,
    description: desc,
    path: pathname,
    robots: options?.noindex ? "noindex,nofollow" : "index,follow",
  });
}
