import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scroll window to top on route changes (pathname or search).
 * Needed because React Router preserves scroll position by default.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, search]);

  return null;
}
