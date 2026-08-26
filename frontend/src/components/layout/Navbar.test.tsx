import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContextValue } from "../../context/auth-context";
import { Navbar } from "./Navbar";

const logout = vi.fn<() => Promise<void>>();
const authValue: AuthContextValue = {
  user: {
    id: "user-1",
    email: "person@example.test",
    name: "Person",
    phone: null,
    language: "en",
    status: "ACTIVE",
    roles: ["CLIENT"],
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
  refetchUser: vi.fn(),
};

vi.mock("../../features/auth/hooks/useAuth", () => ({
  useAuth: () => authValue,
}));

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderNavbar() {
  return render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Navbar />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("Navbar logout controls", () => {
  beforeEach(() => logout.mockResolvedValue(undefined));

  it("uses a non-submit desktop logout button and replaces the route", async () => {
    renderNavbar();
    const logoutButton = screen.getByRole("button", { name: "Logout" });

    expect(logoutButton.getAttribute("type")).toBe("button");
    await userEvent.click(logoutButton);

    expect(logout).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/login"),
    );
  });

  it("closes the mobile menu immediately when logout starts", async () => {
    renderNavbar();
    const menuButton = screen.getByRole("button", {
      name: "Open navigation menu",
    });
    await userEvent.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
