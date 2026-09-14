import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/layout/app-header";
import { PageShell } from "@/components/common/status-badges";

export function AssetsLayout() {
  return (
    <PageShell
      header={
        <AppHeader
          title="Tài sản của tôi"
          description="Theo dõi tài sản và cách bạn đang phân bổ nguồn vốn"
        />
      }
    >
      <Outlet />
    </PageShell>
  );
}
