import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { AppLayout } from "../components/layout/AppLayout";
import { ROLE_NAMES } from "../features/auth/types/auth.types";
import { HomePage } from "../pages/public/HomePage";
import { ProtectedRoute } from "./ProtectedRoute";
import { PermissionRoute } from "./PermissionRoute";
import { RoleRoute } from "./RoleRoute";

const LoginPage = lazy(() =>
  import("../pages/auth/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import("../pages/auth/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("../pages/auth/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("../pages/auth/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ExplorePage = lazy(() =>
  import("../pages/public/ExplorePage").then((module) => ({
    default: module.ExplorePage,
  })),
);
const AboutPage = lazy(() =>
  import("../pages/public/AboutPage").then((module) => ({
    default: module.AboutPage,
  })),
);
const MapPage = lazy(() =>
  import("../pages/public/MapPage").then((module) => ({
    default: module.MapPage,
  })),
);
const PlaceDetailsPage = lazy(() =>
  import("../pages/public/PlaceDetailsPage").then((module) => ({
    default: module.PlaceDetailsPage,
  })),
);
const ForbiddenPage = lazy(() =>
  import("../pages/public/ForbiddenPage").then((module) => ({
    default: module.ForbiddenPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("../pages/public/NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);
const ProfilePage = lazy(() =>
  import("../pages/account/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  })),
);
const ListPropertyPage = lazy(() =>
  import("../pages/owner/ListPropertyPage").then((module) => ({
    default: module.ListPropertyPage,
  })),
);
const OwnerPropertiesPage = lazy(() =>
  import("../pages/owner/OwnerPropertiesPage").then((module) => ({
    default: module.OwnerPropertiesPage,
  })),
);
const EditPropertyPage = lazy(() =>
  import("../pages/owner/EditPropertyPage").then((module) => ({
    default: module.EditPropertyPage,
  })),
);
const ReviewerQueuePage = lazy(() =>
  import("../pages/reviewer/ReviewerQueuePage").then((module) => ({
    default: module.ReviewerQueuePage,
  })),
);
const ReviewerListingPage = lazy(() =>
  import("../pages/reviewer/ReviewerListingPage").then((module) => ({
    default: module.ReviewerListingPage,
  })),
);
const ReviewerCreatePropertyPage = lazy(() =>
  import("../pages/reviewer/ReviewerCreatePropertyPage").then((module) => ({
    default: module.ReviewerCreatePropertyPage,
  })),
);
const ReviewerEditPropertyPage = lazy(() =>
  import("../pages/reviewer/ReviewerEditPropertyPage").then((module) => ({
    default: module.ReviewerEditPropertyPage,
  })),
);
const UserManagementListPage = lazy(() =>
  import("../features/user-management/components/UserManagementListPage").then(
    (module) => ({
      default: module.UserManagementListPage,
    }),
  ),
);
const UserManagementDetailPage = lazy(() =>
  import("../features/user-management/components/UserManagementDetailPage").then(
    (module) => ({
      default: module.UserManagementDetailPage,
    }),
  ),
);
const AdminReviewersPage = lazy(() =>
  import("../pages/admin/AdminReviewersPage").then((module) => ({
    default: module.AdminReviewersPage,
  })),
);
const AdminPropertiesPage = lazy(() =>
  import("../pages/admin/AdminPropertiesPage").then((module) => ({
    default: module.AdminPropertiesPage,
  })),
);
const AdminReportsPage = lazy(() =>
  import("../pages/admin/AdminReportsPage").then((module) => ({
    default: module.AdminReportsPage,
  })),
);
const DeveloperAdminsPage = lazy(() =>
  import("../pages/developer/DeveloperAdminsPage").then((module) => ({
    default: module.DeveloperAdminsPage,
  })),
);
const DeveloperOperationsPage = lazy(() =>
  import("../pages/developer/DeveloperOperationsPage").then((module) => ({
    default: module.DeveloperOperationsPage,
  })),
);
const DeveloperAccessManagementPage = lazy(() =>
  import("../pages/developer/DeveloperAccessManagementPage").then((module) => ({
    default: module.DeveloperAccessManagementPage,
  })),
);
const SupportPage = lazy(() =>
  import("../pages/support/SupportPage").then((module) => ({
    default: module.SupportPage,
  })),
);
const SupportTicketPage = lazy(() =>
  import("../pages/support/SupportTicketPage").then((module) => ({
    default: module.SupportTicketPage,
  })),
);
const StaffReviewsPage = lazy(() =>
  import("../pages/staff/StaffReviewsPage").then((module) => ({
    default: module.StaffReviewsPage,
  })),
);
const StaffSupportPage = lazy(() =>
  import("../pages/staff/StaffSupportPage").then((module) => ({
    default: module.StaffSupportPage,
  })),
);
const StaffSupportTicketPage = lazy(() =>
  import("../pages/staff/StaffSupportTicketPage").then((module) => ({
    default: module.StaffSupportTicketPage,
  })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading page…" />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="places/:id" element={<PlaceDetailsPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="403" element={<ForbiddenPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<RoleRoute allowedRoles={["CLIENT"]} />}>
              <Route path="list-property" element={<ListPropertyPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="support/:id" element={<SupportTicketPage />} />
            </Route>
            <Route element={<RoleRoute allowedRoles={ROLE_NAMES} />}>
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route element={<RoleRoute allowedRoles={["OWNER"]} />}>
              <Route
                path="owner/properties"
                element={<OwnerPropertiesPage />}
              />
              <Route
                path="owner/properties/:id/edit"
                element={<EditPropertyPage />}
              />
            </Route>
            <Route element={<RoleRoute allowedRoles={["REVIEWER"]} />}>
              <Route
                element={
                  <PermissionRoute allowedPermissions={["LISTING_REVIEW"]} />
                }
              >
                <Route path="reviewer" element={<ReviewerQueuePage />} />
                <Route
                  path="reviewer/listings/:id"
                  element={<ReviewerListingPage />}
                />
              </Route>
              <Route
                element={
                  <PermissionRoute
                    allowedPermissions={["MANUAL_PROPERTY_MANAGEMENT"]}
                  />
                }
              >
                <Route
                  path="reviewer/properties"
                  element={<OwnerPropertiesPage workflow="reviewer" />}
                />
                <Route
                  path="reviewer/properties/new"
                  element={<ReviewerCreatePropertyPage />}
                />
                <Route
                  path="reviewer/properties/:id/edit"
                  element={<ReviewerEditPropertyPage />}
                />
              </Route>
            </Route>
            <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
              <Route
                element={
                  <PermissionRoute allowedPermissions={["USER_MANAGEMENT"]} />
                }
              >
                <Route
                  path="admin/users"
                  element={<UserManagementListPage scope="admin" />}
                />
                <Route
                  path="admin/users/:id"
                  element={<UserManagementDetailPage scope="admin" />}
                />
              </Route>
              <Route
                element={
                  <PermissionRoute
                    allowedPermissions={["REVIEWER_MANAGEMENT"]}
                  />
                }
              >
                <Route path="admin/reviewers" element={<AdminReviewersPage />} />
              </Route>
              <Route
                element={
                  <PermissionRoute
                    allowedPermissions={["PROPERTY_MANAGEMENT"]}
                  />
                }
              >
                <Route
                  path="admin/properties"
                  element={<AdminPropertiesPage />}
                />
              </Route>
              <Route
                element={
                  <PermissionRoute allowedPermissions={["REPORT_MANAGEMENT"]} />
                }
              >
                <Route path="admin/reports" element={<AdminReportsPage />} />
              </Route>
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
              <Route
                path="developer/admins"
                element={<DeveloperAdminsPage />}
              />
              <Route
                path="developer/operations"
                element={<DeveloperOperationsPage />}
              />
              <Route
                path="developer/access"
                element={<DeveloperAccessManagementPage />}
              />
            </Route>
            <Route
              element={<RoleRoute allowedRoles={["REVIEWER", "ADMIN"]} />}
            >
              <Route
                element={
                  <PermissionRoute allowedPermissions={["REVIEW_MODERATION"]} />
                }
              >
                <Route path="staff/reviews" element={<StaffReviewsPage />} />
              </Route>
              <Route
                element={
                  <PermissionRoute allowedPermissions={["SUPPORT_MANAGEMENT"]} />
                }
              >
                <Route path="staff/support" element={<StaffSupportPage />} />
                <Route
                  path="staff/support/:id"
                  element={<StaffSupportTicketPage />}
                />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
