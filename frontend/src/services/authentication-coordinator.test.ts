import { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it, vi } from "vitest";
import { AuthenticationCoordinator } from "./authentication-coordinator";
import {
  getAuthenticationGeneration,
  isUnauthenticatedEndpoint,
  shouldAttemptAuthenticationRefresh,
} from "./api";

describe("AuthenticationCoordinator", () => {
  it("aborts refresh and rejects every stale token commit after logout", () => {
    const coordinator = new AuthenticationCoordinator();
    const generation = coordinator.getGeneration();
    const controller = new AbortController();

    expect(coordinator.registerRefresh(controller, generation)).toBe(true);
    expect(coordinator.commitAccessToken("access-token", generation)).toBe(
      true,
    );
    const logoutGeneration = coordinator.beginLogout();

    expect(controller.signal.aborted).toBe(true);
    expect(coordinator.getAccessToken()).toBeNull();
    expect(coordinator.commitAccessToken("stale-token", generation)).toBe(
      false,
    );
    coordinator.finishLogout(logoutGeneration);
    expect(coordinator.getAccessToken()).toBeNull();
    expect(coordinator.isLogoutInProgress()).toBe(false);
  });

  it("notifies an authentication failure only once per generation", () => {
    const coordinator = new AuthenticationCoordinator();
    const generation = coordinator.getGeneration();

    expect(coordinator.markAuthenticationFailure(generation)).toBe(true);
    expect(coordinator.markAuthenticationFailure(generation)).toBe(false);
  });

  it("stays anonymous across ten logout/reload-style generations", () => {
    const coordinator = new AuthenticationCoordinator();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const generation = coordinator.getGeneration();
      expect(
        coordinator.commitAccessToken(`token-${attempt}`, generation),
      ).toBe(true);
      const logoutGeneration = coordinator.beginLogout();
      coordinator.finishLogout(logoutGeneration);
      expect(coordinator.getAccessToken()).toBeNull();
      expect(coordinator.commitAccessToken("stale", generation)).toBe(false);
    }
  });

  it("aborts the registered refresh exactly once", () => {
    const coordinator = new AuthenticationCoordinator();
    const controller = new AbortController();
    const abortSpy = vi.spyOn(controller, "abort");
    coordinator.registerRefresh(controller, coordinator.getGeneration());

    coordinator.beginLogout();
    coordinator.beginLogout();

    expect(abortSpy).toHaveBeenCalledTimes(1);
  });
});

describe("refresh-interceptor exclusions", () => {
  it.each([
    "/auth/register",
    "/auth/login",
    "/auth/refresh",
    "/auth/logout",
    "/auth/reset-password",
  ])("never recursively refreshes %s", (path) => {
    expect(isUnauthenticatedEndpoint(path)).toBe(true);
  });

  it("does not classify protected API calls as unauthenticated", () => {
    expect(isUnauthenticatedEndpoint("/me")).toBe(false);
  });

  it("never refreshes a logout 401 or any non-401 response", () => {
    const logoutRequest = authenticatedRequest("/auth/logout");
    const protectedRequest = authenticatedRequest("/me");

    expect(shouldAttemptAuthenticationRefresh(401, logoutRequest)).toBe(false);
    for (const status of [403, 404, 409, 429, 500]) {
      expect(shouldAttemptAuthenticationRefresh(status, protectedRequest)).toBe(
        false,
      );
    }
  });

  it("allows one current protected-request retry only", () => {
    const request = authenticatedRequest("/me");
    expect(shouldAttemptAuthenticationRefresh(401, request)).toBe(true);

    request._authenticationRetry = true;
    expect(shouldAttemptAuthenticationRefresh(401, request)).toBe(false);
  });
});

function authenticatedRequest(url: string): InternalAxiosRequestConfig {
  return {
    url,
    headers: new AxiosHeaders({ Authorization: "Bearer test-access-token" }),
    _authenticationGeneration: getAuthenticationGeneration(),
  } as InternalAxiosRequestConfig;
}
