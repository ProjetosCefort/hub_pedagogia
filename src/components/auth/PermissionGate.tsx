import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGateProps {
  permissions?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permissions, children, fallback = null }: PermissionGateProps) {
  const { hasPermission, loading } = usePermissions();

  if (!permissions || permissions.length === 0) {
    return <>{children}</>;
  }

  if (loading) {
    return null;
  }

  const allowed = permissions.some((permission) => hasPermission(permission));

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
