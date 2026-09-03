import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

const authService = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}));

vi.mock("../../features/auth/auth.service", () => authService);
vi.mock("../../i18n/useLanguage", () => ({
  useLanguage: () => ({ t: (message: string) => message }),
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    authService.requestPasswordReset.mockReset();
    authService.requestPasswordReset.mockResolvedValue({
      accepted: true,
      message:
        "If an active account exists for that email, password reset instructions have been sent.",
    });
  });

  it("submits a normalized email and displays the non-enumerating response", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ForgotPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "  traveller@example.test  ",
    );
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(authService.requestPasswordReset.mock.calls[0][0]).toEqual({
      email: "traveller@example.test",
    });
    expect((await screen.findByRole("status")).textContent).toContain(
      "If an active account exists for that email",
    );
  });
});
