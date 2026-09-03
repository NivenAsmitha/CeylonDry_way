import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { AuthContextValue } from "../../context/auth-context";
import { LanguageContext } from "../../i18n/language-context";
import { Navbar } from "./Navbar";

const authValue: AuthContextValue = {
  user: {
    id: "user-1",
    email: "person@example.test",
    name: "Person",
    phone: null,
    language: "en",
    status: "ACTIVE",
    roles: ["CLIENT"],
    permissions: [],
    createdAt: "2026-08-25T00:00:00.000Z",
  },
  isAuthenticated: true,
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

vi.mock("../../features/auth/hooks/useAuth", () => ({
  useAuth: () => authValue,
}));

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderNavbar() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Navbar />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function renderNavbarWithLanguage(
  setLanguage: (language: "en" | "ja") => void,
) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <LanguageContext.Provider
        value={{ language: "en", setLanguage, t: (message) => message }}
      >
        <Navbar />
      </LanguageContext.Provider>
    </MemoryRouter>,
  );
}

describe("Navbar profile control", () => {
  it("shows About instead of a separate Map tab in public navigation", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explore" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "About" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Map" })).toBeNull();
    expect(screen.queryByRole("link", { name: "My Properties" })).toBeNull();
  });

  it("opens the full profile page directly without a settings dropdown", async () => {
    renderNavbar();

    expect(screen.queryByText("Change password")).toBeNull();
    expect(screen.queryByRole("button", { name: "Logout" })).toBeNull();
    await userEvent.click(
      screen.getByRole("link", { name: "Open your profile" }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/profile"),
    );
  });

  it("closes the mobile navigation when the profile is opened", async () => {
    renderNavbar();
    const menuButton = screen.getByRole("button", {
      name: "Open navigation menu",
    });
    await userEvent.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");

    await userEvent.click(
      screen.getByRole("link", { name: "Open your profile" }),
    );

    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("lets a user choose Japanese from the navbar and saves the preference", async () => {
    const setLanguage = vi.fn();
    renderNavbarWithLanguage(setLanguage);

    await userEvent.click(
      screen.getByRole("button", { name: "Change language" }),
    );
    await userEvent.click(
      screen.getByRole("menuitemradio", { name: "日本語" }),
    );

    expect(setLanguage).toHaveBeenCalledWith("ja");
    expect(authValue.updateProfile).toHaveBeenCalledWith({ language: "ja" });
  });
});
