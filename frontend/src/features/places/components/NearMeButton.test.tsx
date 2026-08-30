import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NearMeButton } from "./NearMeButton";

describe("NearMeButton", () => {
  const getCurrentPosition = vi.fn();
  const onLocated = vi.fn();

  beforeEach(() => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
  });

  it("requests one position only after explicit user action", async () => {
    getCurrentPosition.mockImplementationOnce((success: PositionCallback) =>
      success({ coords: { latitude: 6.9, longitude: 79.8 } } as GeolocationPosition),
    );
    render(
      <NearMeButton active={false} onClear={vi.fn()} onLocated={onLocated} />,
    );

    expect(getCurrentPosition).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Find places near me" }),
    );
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(onLocated).toHaveBeenCalledWith(6.9, 79.8);
  });

  it("keeps manual search available after permission denial", async () => {
    getCurrentPosition.mockImplementationOnce(
      (_success: PositionCallback, failure: PositionErrorCallback) =>
        failure({
          code: 1,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: "denied",
        }),
    );
    render(
      <NearMeButton active={false} onClear={vi.fn()} onLocated={onLocated} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Find places near me" }),
    );

    expect(screen.getByText(/permission was denied.*city or district/i)).toBeTruthy();
    expect(onLocated).not.toHaveBeenCalled();
  });

  it("does not request geolocation while offline", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    render(
      <NearMeButton active={false} onClear={vi.fn()} onLocated={onLocated} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Find places near me" }),
    );

    expect(screen.getByText(/appear to be offline/i)).toBeTruthy();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
