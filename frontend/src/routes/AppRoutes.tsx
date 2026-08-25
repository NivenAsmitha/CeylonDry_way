import { Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { ROLE_NAMES } from "../features/auth/types/auth.types";
import { ProfilePage } from "../pages/account/ProfilePage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";
import { AdminReviewersPage } from "../pages/admin/AdminReviewersPage";
import { DeveloperAdminsPage } from "../pages/developer/DeveloperAdminsPage";
import { UserManagementDetailPage } from "../features/user-management/components/UserManagementDetailPage";
import { UserManagementListPage } from "../features/user-management/components/UserManagementListPage";
import { EditPropertyPage } from "../pages/owner/EditPropertyPage";
import { ListPropertyPage } from "../pages/owner/ListPropertyPage";
import { OwnerPropertiesPage } from "../pages/owner/OwnerPropertiesPage";
import { ExplorePage } from "../pages/public/ExplorePage";
import { ForbiddenPage } from "../pages/public/ForbiddenPage";
import { HomePage } from "../pages/public/HomePage";
import { MapPage } from "../pages/public/MapPage";
import { NotFoundPage } from "../pages/public/NotFoundPage";
import { PlaceDetailsPage } from "../pages/public/PlaceDetailsPage";
import { ReviewerListingPage } from "../pages/reviewer/ReviewerListingPage";
import { ReviewerQueuePage } from "../pages/reviewer/ReviewerQueuePage";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="places/:id" element={<PlaceDetailsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="403" element={<ForbiddenPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRoles={["CLIENT"]} />}>
            <Route path="list-property" element={<ListPropertyPage />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={ROLE_NAMES} />}>
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={["OWNER"]} />}>
            <Route path="owner/properties" element={<OwnerPropertiesPage />} />
            <Route
              path="owner/properties/:id/edit"
              element={<EditPropertyPage />}
            />
          </Route>
          <Route element={<RoleRoute allowedRoles={["REVIEWER"]} />}>
            <Route path="reviewer" element={<ReviewerQueuePage />} />
            <Route
              path="reviewer/listings/:id"
              element={<ReviewerListingPage />}
            />
          </Route>
          <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
            <Route
              path="admin/users"
              element={<UserManagementListPage scope="admin" />}
            />
            <Route
              path="admin/users/:id"
              element={<UserManagementDetailPage scope="admin" />}
            />
            <Route path="admin/reviewers" element={<AdminReviewersPage />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={["DEVELOPER"]} />}>
            <Route
              path="developer/users"
              element={<UserManagementListPage scope="developer" />}
            />
            <Route
              path="developer/users/:id"
              element={<UserManagementDetailPage scope="developer" />}
            />
            <Route path="developer/admins" element={<DeveloperAdminsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
