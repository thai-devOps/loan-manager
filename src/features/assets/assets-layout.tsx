import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/layout/app-header";
import { FeatureSubNav } from "@/components/layout/feature-sub-nav";
import { getFeatureById } from "@/components/layout/nav-items";
import { PageShell } from "@/components/common/status-badges";

export function AssetsLayout() {
  const feature = getFeatureById("assets");

  return (
    <PageShell
      header={
        <AppHeader
          title="Tài sản của tôi"
          description="Theo dõi tài sản và cách bạn đang phân bổ nguồn vốn"
        />
      }
      subNav={<FeatureSubNav items={feature.nav} />}
    >
      <Outlet />
    </PageShell>
  );
}
