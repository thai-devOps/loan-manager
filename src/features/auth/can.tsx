import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth.store";

export function Can({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
}: {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);
  const hasAllPermissions = useAuthStore((s) => s.hasAllPermissions);

  let allowed = true;
  if (permission) allowed = hasPermission(permission);
  if (anyOf) allowed = allowed && hasAnyPermission(anyOf);
  if (allOf) allowed = allowed && hasAllPermissions(allOf);

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
