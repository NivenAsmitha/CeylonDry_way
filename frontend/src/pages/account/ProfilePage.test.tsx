import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContextValue } from "../../context/auth-context";
import { ProfilePage } from "./ProfilePage";

const logout = vi.fn<() => Promise<void>>();
const authValue: AuthContextValue = {
  user: {
    id: "user-1",
    email: "person@example.test",
    name: "Person",
    phone: "+94 77 123 4567",
    language: "en",
    status: "ACTIVE",
    roles: ["CLIENT", "OWNER"],
    permissions: [],
    createdAt: "2026-08-25T00:00:00.000Z",
  },
  isAuthenticated: true,
  isInitializing: false,
  isLoggingOut: false,
  initializationError: null,
  login: vi.fn(),
  register: vi.fn(),
  logout,
  refreshSession: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  refetchUser: vi.fn(),
};

vi.mock("../../features/auth/hooks/useAuth", () => ({
  useAuth: () => authValue,
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="location">{`${location.pathname}${location.search}`}</span>
  );
}

function renderProfile(entry = "/profile") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("ProfilePage settings navigation", () => {
  beforeEach(() => logout.mockResolvedValue(undefined));

  it("shows account details first and opens edit/security settings on demand", async () => {
    renderProfile();

    expect(screen.getByRole("heading", { name: "Person" })).toBeTruthy();
    expect(screen.getAllByText("person@example.test")).toHaveLength(2);
    expect(screen.queryByLabelText("Current password")).toBeNull();

    await userEvent.click(screen.getByRole("link", { name: /Edit profile/ }));
    expect(await screen.findByLabelText("Full name")).toBeTruthy();

    await userEvent.click(
      screen.getByRole("link", { name: /Password & security/ }),
    );
    expect(await screen.findByLabelText("Current password")).toBeTruthy();
    expect(screen.getByLabelText("New password")).toBeTruthy();
  });

  it("provides the owner workspace and a working sign-out action", async () => {
    renderProfile();

    expect(
      screen.getByRole("link", { name: "My properties" }).getAttribute("href"),
    ).toBe("/owner/properties");
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(logout).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", { name: "Sign out of ComfortGo?" }),
    ).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Yes, sign out" }),
    );

    expect(logout).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/login"),
    );
  });
});
