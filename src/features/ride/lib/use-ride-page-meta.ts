import { useEffect } from "react";
import { rideBrand } from "@/features/ride/config/ride-brand";

export function useRidePageMeta(title: string, description?: string) {
  useEffect(() => {
    const full = `${title} · ${rideBrand.name}`;
    document.title = full;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    if (description) {
      meta.setAttribute("content", description);
    }

    return () => {
      document.title = rideBrand.name;
    };
  }, [title, description]);
}
