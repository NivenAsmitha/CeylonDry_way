import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../features/auth/types/auth.types";
import { useAuth } from "../features/auth/hooks/useAuth";
import { authenticationCoordinator } from "../services/authentication-coordinator";
import { CURRENT_USER_QUERY_KEY } from "../services/queryClient";
import { AuthProvider } from "./AuthContext";

const authMocks = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  getCurrentUser: vi.fn(),
  requestLogout: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("../features/auth/auth.service", () => authMocks);

const currentUser: CurrentUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "person@example.test",
  name: "Test Person",
  phone: null,
  language: "en",
  status: "ACTIVE",
  roles: ["CLIENT"],
  createdAt: "2026-08-25T00:00:00.000Z",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function Observer() {
  const auth = useAuth();

  return (
    <div>
      <span data-testid="identity">{auth.user?.email ?? "anonymous"}</span>
      <span data-testid="initializing">{String(auth.isInitializing)}</span>
      <span data-testid="logging-out">{String(auth.isLoggingOut)}</span>
      <button
        type="button"
        onClick={() => void auth.logout().catch(() => undefined)}
      >
        Logout once
      </button>
      <button
        type="button"
        onClick={() => {
          void Promise.allSettled(
            Array.from({ length: 10 }, () => auth.logout()),
          );
        }}
      >
        Logout rapidly
      </button>
    </div>
  );
}

function renderProvider(children: ReactNode = <Observer />) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

describe("AuthProvider deterministic logout", () => {
  beforeEach(() => {
    const generation = authenticationCoordinator.beginLogout();
    authenticationCoordinator.finishLogout(generation);
    authenticationCoordinator.commitAccessToken(
      "in-memory-access-token",
      authenticationCoordinator.getGeneration(),
    );
    authMocks.refreshSession.mockResolvedValue({});
    authMocks.getCurrentUser.mockResolvedValue(currentUser);
    authMocks.requestLogout.mockResolvedValue(undefined);
  });

  it("clears local authentication even when the logout request fails", async () => {
    authMocks.requestLogout.mockRejectedValueOnce(new Error("network down"));
    const { queryClient } = renderProvider();
    await screen.findByText(currentUser.email);

    await userEvent.click(screen.getByRole("button", { name: "Logout once" }));

    await waitFor(() => {
      expect(screen.getByTestId("identity").textContent).toBe("anonymous");
      expect(screen.getByTestId("logging-out").textContent).toBe("false");
    });
    expect(authenticationCoordinator.getAccessToken()).toBeNull();
    expect(queryClient.getQueryData(CURRENT_USER_QUERY_KEY)).toBeUndefined();
  });

  it("deduplicates ten rapid logout calls into one server request", async () => {
    const request = deferred<void>();
    authMocks.requestLogout.mockReturnValueOnce(request.promise);
    renderProvider();
    await screen.findByText(currentUser.email);

    await userEvent.click(
      screen.getByRole("button", { name: "Logout rapidly" }),
    );
    expect(authMocks.requestLogout).toHaveBeenCalledTimes(1);

    await act(async () => request.resolve());
    await waitFor(() =>
      expect(screen.getByTestId("identity").textContent).toBe("anonymous"),
    );
  });

  it("ignores a pending current-user response that finishes after logout", async () => {
    const currentUserRequest = deferred<CurrentUser>();
    authMocks.getCurrentUser.mockReturnValueOnce(currentUserRequest.promise);
    const { queryClient } = renderProvider();
    await waitFor(() => expect(authMocks.getCurrentUser).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Logout once" }));
    await act(async () => currentUserRequest.resolve(currentUser));

    await waitFor(() => {
      expect(screen.getByTestId("identity").textContent).toBe("anonymous");
      expect(screen.getByTestId("initializing").textContent).toBe("false");
    });
    expect(queryClient.getQueryData(CURRENT_USER_QUERY_KEY)).toBeUndefined();
  });

  it("does not restore the user on a focus event after logout", async () => {
    renderProvider();
    await screen.findByText(currentUser.email);
    await userEvent.click(screen.getByRole("button", { name: "Logout once" }));
    await waitFor(() =>
      expect(screen.getByTestId("identity").textContent).toBe("anonymous"),
    );
    const callsAfterLogout = authMocks.getCurrentUser.mock.calls.length;

    window.dispatchEvent(new Event("focus"));
    await Promise.resolve();

    expect(authMocks.getCurrentUser).toHaveBeenCalledTimes(callsAfterLogout);
  });
});
