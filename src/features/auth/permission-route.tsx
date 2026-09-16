import { Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { ForbiddenPage } from "@/features/auth/forbidden-page";

export function PermissionRoute({
  permission,
  anyOf,
  children,
}: {
  permission?: string;
  anyOf?: string[];
  children?: React.ReactNode;
}) {
  const meLoaded = useAuthStore((s) => s.meLoaded);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);

  if (!meLoaded) return null;

  let allowed = true;
  if (permission) allowed = hasPermission(permission);
  if (anyOf) allowed = allowed && hasAnyPermission(anyOf);

  if (!allowed) {
    return <ForbiddenPage />;
  }

  return children ? <>{children}</> : <Outlet />;
}

/** Block module routes when user has no *.view permission in that module. */
export function ModuleRoute({
  module,
  children,
}: {
  module: string;
  children?: React.ReactNode;
}) {
  const meLoaded = useAuthStore((s) => s.meLoaded);
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess);

  if (!meLoaded) return null;
  if (!hasModuleAccess(module)) {
    return <ForbiddenPage />;
  }
  return children ? <>{children}</> : <Outlet />;
}
