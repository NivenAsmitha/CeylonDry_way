import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { OwnerProperty } from "../types/property.types";
import { PropertyForm } from "./PropertyForm";

const hooks = vi.hoisted(() => ({
  create: { mutateAsync: vi.fn(), isPending: false },
  update: { mutateAsync: vi.fn(), isPending: false },
  submit: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock("../hooks/useOwnerProperties", () => ({
  useCreatePropertyDraft: () => hooks.create,
  useUpdatePropertyDraft: () => hooks.update,
  useSubmitPropertyDraft: () => hooks.submit,
  usePropertyAmenities: () => ({
    data: [],
    isPending: false,
    isError: false,
  }),
  useUploadPropertyPhotos: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReorderPropertyPhotos: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSetPropertyPhotoCover: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdatePropertyPhotoAltText: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRemovePropertyPhoto: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("../../maps/components/LocationPicker", () => ({
  LocationPicker: ({
    latitude,
    longitude,
    disabled,
    onChange,
  }: {
    latitude: number | null;
    longitude: number | null;
    disabled: boolean;
    onChange: (latitude: number, longitude: number) => void;
  }) => (
    <div>
      <p>
        Saved marker: {latitude}, {longitude}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(7.12345678, 80.87654321)}
      >
        Choose map location
      </button>
    </div>
  ),
}));

const completeDraftWithoutPhotos: OwnerProperty = {
  id: "11111111-1111-4111-8111-111111111111",
  lifecycleStatus: "DRAFT",
  createdAt: "2026-08-25T00:00:00.000Z",
  updatedAt: "2026-08-25T00:00:00.000Z",
  canEdit: true,
  canSubmit: true,
  latestDecision: null,
  activeVersion: {
    id: "22222222-2222-4222-8222-222222222222",
    version: 1,
    propertyType: "HOTEL",
    name: "Accessible Coast Hotel",
    organisation: null,
    description:
      "A complete description long enough for this accessible property submission.",
    accessNotes: "Use the level entrance by reception.",
    isFree: true,
    feeLkr: null,
    phone: null,
    email: null,
    website: null,
    address: "1 Coast Road",
    district: "Galle",
    city: "Galle",
    latitude: 6.0329,
    longitude: 80.2168,
    submittedAt: null,
    amenities: [{ code: "RAMP", name: "Ramp", notes: null }],
    openingHours: [],
    photos: [],
  },
};

describe("PropertyForm photo submission validation", () => {
  it("navigates a photo-less submission back to the Photos step", async () => {
    render(
      <MemoryRouter initialEntries={["/owner/properties/test/edit?step=7"]}>
        <PropertyForm property={completeDraftWithoutPhotos} />
      </MemoryRouter>,
    );

    await userEvent.click(
      screen.getByLabelText(/I confirm this listing is complete/i),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Submit for review" }),
    );

    expect(
      await screen.findByText("Add at least one photo before submitting."),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Photos" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: /6\s*Photos/i })
        .getAttribute("aria-current"),
    ).toBe("step");
    expect(hooks.update.mutateAsync).not.toHaveBeenCalled();
    expect(hooks.submit.mutateAsync).not.toHaveBeenCalled();
  });

  it("restores saved coordinates and synchronizes map selection with manual fields", async () => {
    render(
      <MemoryRouter initialEntries={["/owner/properties/test/edit?step=5"]}>
        <PropertyForm property={completeDraftWithoutPhotos} />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Saved marker: 6.0329, 80.2168")).toBeTruthy();
    const latitude = screen.getByLabelText("Latitude") as HTMLInputElement;
    const longitude = screen.getByLabelText("Longitude") as HTMLInputElement;
    expect(latitude.value).toBe("6.0329");
    expect(longitude.value).toBe("80.2168");

    await userEvent.click(
      screen.getByRole("button", { name: "Choose map location" }),
    );
    expect(latitude.value).toBe("7.1234568");
    expect(longitude.value).toBe("80.8765432");
  });

  it("keeps the saved location read-only for a pending property", async () => {
    render(
      <MemoryRouter initialEntries={["/owner/properties/test/edit?step=5"]}>
        <PropertyForm
          property={{
            ...completeDraftWithoutPhotos,
            lifecycleStatus: "PENDING",
            canEdit: false,
            canSubmit: false,
          }}
        />
      </MemoryRouter>,
    );
    const picker = await screen.findByRole("button", {
      name: "Choose map location",
    });
    expect(picker.hasAttribute("disabled")).toBe(true);
  });
});
