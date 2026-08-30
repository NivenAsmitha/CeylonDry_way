import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildGoogleMapsDirectionsUrl } from "../utils/directions";
import { DirectionsButton } from "./DirectionsButton";

describe("Google Maps directions", () => {
  it("builds an exact-coordinate URL with safe external-link attributes", () => {
    render(<DirectionsButton latitude={6.927079} longitude={79.861244} />);
    const link = screen.getByRole("link", { name: /get directions/i });
    const url = new URL(link.getAttribute("href") ?? "");

    expect(url.origin).toBe("https://www.google.com");
    expect(url.pathname).toBe("/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toBe(
      "6.927079,79.861244",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("disables directions for invalid coordinates", () => {
    expect(buildGoogleMapsDirectionsUrl(91, 79)).toBeNull();
    render(<DirectionsButton latitude={91} longitude={79} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Directions unavailable").getAttribute("aria-disabled")).toBe(
      "true",
    );
  });
});
