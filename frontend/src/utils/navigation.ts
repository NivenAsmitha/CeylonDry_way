function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getSafeRedirectPath(
  locationState: unknown,
  fallback = "/",
): string {
  if (!isRecord(locationState) || typeof locationState.from !== "string") {
    return fallback;
  }

  const destination = locationState.from;

  if (
    !destination.startsWith("/") ||
    destination.startsWith("//") ||
    destination.startsWith("/login") ||
    destination.startsWith("/register")
  ) {
    return fallback;
  }

  return destination;
}

export function getRoleLandingPath(
  roles: readonly string[],
  permissions: readonly string[] = [],
): string {
  if (roles.includes("DEVELOPER")) return "/developer/operations";
  if (roles.includes("ADMIN")) {
    if (permissions.includes("USER_MANAGEMENT")) return "/admin/users";
    if (permissions.includes("REVIEWER_MANAGEMENT")) return "/admin/reviewers";
    if (permissions.includes("PROPERTY_MANAGEMENT")) return "/admin/properties";
    if (permissions.includes("REPORT_MANAGEMENT")) return "/admin/reports";
    if (permissions.includes("REVIEW_MODERATION")) return "/staff/reviews";
    if (permissions.includes("SUPPORT_MANAGEMENT")) return "/staff/support";
    return "/profile";
  }
  if (roles.includes("REVIEWER")) {
    if (permissions.includes("LISTING_REVIEW")) return "/reviewer";
    if (permissions.includes("MANUAL_PROPERTY_MANAGEMENT")) {
      return "/reviewer/properties";
    }
    if (permissions.includes("REVIEW_MODERATION")) return "/staff/reviews";
    if (permissions.includes("SUPPORT_MANAGEMENT")) return "/staff/support";
    return "/profile";
  }
  return "/";
}

export function hasRegistrationSuccessNotice(locationState: unknown): boolean {
  return (
    isRecord(locationState) && locationState.notice === "registration-success"
  );
}
