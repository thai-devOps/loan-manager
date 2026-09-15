import { Outlet, useLocation } from "react-router-dom";
import { FeatureSubNav } from "@/components/layout/feature-sub-nav";
import {
  getFeatureById,
  isFeatureDetailPath,
} from "@/components/layout/nav-items";

/**
 * Wraps loans-module routes. Sub-nav is rendered by page shells via
 * {@link LoansModuleChrome} so it sits under each page's AppHeader.
 */
export function LoansLayout() {
  return <Outlet />;
}

/** Mobile feature tabs for loans module pages (hidden on detail routes). */
export function LoansModuleChrome() {
  const location = useLocation();
  const feature = getFeatureById("loans");

  if (isFeatureDetailPath(location.pathname)) return null;

  return <FeatureSubNav items={feature.nav} />;
}
