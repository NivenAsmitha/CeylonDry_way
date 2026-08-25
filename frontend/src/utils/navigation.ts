function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getSafeRedirectPath(
  locationState: unknown,
  fallback = "/profile",
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

export function hasRegistrationSuccessNotice(locationState: unknown): boolean {
  return (
    isRecord(locationState) && locationState.notice === "registration-success"
  );
}
