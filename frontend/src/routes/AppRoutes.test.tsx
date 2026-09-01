import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContextValue } from "../context/auth-context";
import { AppRoutes } from "./AppRoutes";

const auth = vi.hoisted(() => ({ value: null as AuthContextValue | null }));

vi.mock("../features/auth/hooks/useAuth", () => ({
  useAuth: () => auth.value,
}));
vi.mock("../pages/public/MapPage", () => ({
  MapPage: () => <h1>Lazy map route</h1>,
}));
vi.mock("../pages/public/AboutPage", () => ({
  AboutPage: () => <h1>Lazy about route</h1>,
}));
vi.mock("../pages/auth/LoginPage", () => ({
  LoginPage: () => <h1>Lazy login route</h1>,
}));
vi.mock("../pages/public/ForbiddenPage", () => ({
  ForbiddenPage: () => <h1>Lazy forbidden route</h1>,
}));
vi.mock("../pages/owner/OwnerPropertiesPage", () => ({
  OwnerPropertiesPage: () => <h1>Lazy owner route</h1>,
}));

function LocationProbe() {
  return <span data-testid="route-location">{useLocation().pathname}</span>;
}

function renderRoutes(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("lazy application routes", () => {
  beforeEach(() => {
    auth.value = {
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      isLoggingOut: false,
      initializationError: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      refetchUser: vi.fn(),
    };
  });

  it("loads a public lazy route during direct navigation with an accessible fallback", async () => {
    renderRoutes("/map");
    expect(screen.getByRole("status").textContent).toContain("Loading page");
    expect(
      await screen.findByRole("heading", { name: "Lazy map route" }),
    ).toBeTruthy();
  });

  it("loads the public About page during direct navigation", async () => {
    renderRoutes("/about");
    expect(
      await screen.findByRole("heading", { name: "Lazy about route" }),
    ).toBeTruthy();
  });

  it("preserves ProtectedRoute redirect behavior for a direct owner URL", async () => {
    renderRoutes("/owner/properties");
    expect(
      await screen.findByRole("heading", { name: "Lazy login route" }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId("route-location").textContent).toBe("/login"),
    );
  });

  it("preserves RoleRoute behavior for a disallowed authenticated role", async () => {
    auth.value = {
      ...auth.value!,
      isAuthenticated: true,
      user: {
        id: "client-user",
        email: "client@example.test",
        name: "Client",
        phone: null,
        language: "en",
        status: "ACTIVE",
        roles: ["CLIENT"],
        createdAt: "2026-08-25T00:00:00.000Z",
      },
    };
    renderRoutes("/owner/properties");
    expect(
      await screen.findByRole("heading", { name: "Lazy forbidden route" }),
    ).toBeTruthy();
    expect(screen.getByTestId("route-location").textContent).toBe("/403");
  });
});
