import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { useAuth } from "../features/auth/hooks/useAuth";
import type { RoleName } from "../features/auth/types/auth.types";

interface RoleRouteProps {
  allowedRoles: readonly RoleName[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!allowedRoles.some((role) => user.roles.includes(role))) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
