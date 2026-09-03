import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { useAuth } from "../features/auth/hooks/useAuth";
import type { PermissionKey } from "../features/auth/types/auth.types";

interface PermissionRouteProps {
  allowedPermissions: readonly PermissionKey[];
}

export function PermissionRoute({
  allowedPermissions,
}: PermissionRouteProps) {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <LoadingScreen />;

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (
    !user.roles.includes("DEVELOPER") &&
    !allowedPermissions.some((permission) =>
      user.permissions.includes(permission),
    )
  ) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
