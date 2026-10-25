import { Navigate, Outlet } from "react-router-dom";

import type { AdminRole } from "../../api/auth";
import { useAdminAuth } from "./useAdminAuth.ts";

type RequireRoleProps = {
  allowedRoles: AdminRole[];
};

export function RequireRole({ allowedRoles }: RequireRoleProps) {
  const { user, isAuthenticated } = useAdminAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
