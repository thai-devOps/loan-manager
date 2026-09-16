import { useAuthStore } from "@/stores/auth.store";

export function hasPermission(permission: string | string[]): boolean {
  return useAuthStore.getState().hasPermission(permission);
}

export function hasAnyPermission(permissions: string[]): boolean {
  return useAuthStore.getState().hasAnyPermission(permissions);
}

export function hasAllPermissions(permissions: string[]): boolean {
  return useAuthStore.getState().hasAllPermissions(permissions);
}

export function hasModuleAccess(module: string): boolean {
  return useAuthStore.getState().hasModuleAccess(module);
}

export function hasRole(role: string): boolean {
  return useAuthStore.getState().hasRole(role);
}

/** Hook wrappers for reactive UI. */
export function usePermission(permission: string | string[]): boolean {
  return useAuthStore((s) => s.hasPermission(permission));
}

export function useModuleAccess(module: string): boolean {
  return useAuthStore((s) => s.hasModuleAccess(module));
}
