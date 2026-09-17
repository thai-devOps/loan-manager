import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/layout/app-header";
import { FeatureSubNav } from "@/components/layout/feature-sub-nav";
import { getFeatureById } from "@/components/layout/nav-items";
import { PageShell } from "@/components/common/status-badges";
import { useAuthStore } from "@/stores/auth.store";
import { useEnsureModuleSynced } from "@/sync/use-ensure-module-synced";
import type { SyncDataModule } from "@/sync/syncModules";

export function AssetsLayout() {
  const feature = getFeatureById("assets");
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess);
  const modules: SyncDataModule[] = hasModuleAccess("gold")
    ? ["asset", "gold"]
    : ["asset"];
  useEnsureModuleSynced(modules);

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
