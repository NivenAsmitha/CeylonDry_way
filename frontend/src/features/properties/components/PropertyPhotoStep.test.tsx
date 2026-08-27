import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PropertyPhoto } from "../types/property.types";
import { PropertyPhotoStep } from "./PropertyPhotoStep";

const mutations = vi.hoisted(() => ({
  upload: { mutateAsync: vi.fn(), isPending: false },
  reorder: { mutateAsync: vi.fn(), isPending: false },
  setCover: { mutateAsync: vi.fn(), isPending: false },
  updateAltText: { mutateAsync: vi.fn(), isPending: false },
  remove: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock("../hooks/useOwnerProperties", () => ({
  useUploadPropertyPhotos: () => mutations.upload,
  useReorderPropertyPhotos: () => mutations.reorder,
  useSetPropertyPhotoCover: () => mutations.setCover,
  useUpdatePropertyPhotoAltText: () => mutations.updateAltText,
  useRemovePropertyPhoto: () => mutations.remove,
}));

const PHOTO_A: PropertyPhoto = {
  id: "11111111-1111-4111-8111-111111111111",
  url: "https://images.example.test/entrance.jpg",
  sortOrder: 0,
  isCover: true,
  altText: "Entrance",
};
const PHOTO_B: PropertyPhoto = {
  id: "22222222-2222-4222-8222-222222222222",
  url: "https://images.example.test/interior.jpg",
  sortOrder: 1,
  isCover: false,
  altText: null,
};

describe("PropertyPhotoStep", () => {
  const createObjectUrl = vi.fn(() => "blob:test-preview");
  const revokeObjectUrl = vi.fn();

  beforeEach(() => {
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectUrl },
      revokeObjectURL: { configurable: true, value: revokeObjectUrl },
    });
    for (const mutation of Object.values(mutations)) {
      mutation.mutateAsync.mockResolvedValue([]);
      mutation.isPending = false;
    }
  });

  it("validates type, size, and total count before upload", () => {
    const { rerender } = render(
      <PropertyPhotoStep
        propertyId="property-1"
        propertyName="Safe Place"
        photos={[]}
        editable
      />,
    );
    const input = screen.getByLabelText("Select photos");
    fireEvent.change(input, {
      target: {
        files: [new File(["svg"], "unsafe.svg", { type: "image/svg+xml" })],
      },
    });
    expect(screen.getByText(/choose a JPEG, PNG, or WebP image/i)).toBeTruthy();
    expect(createObjectUrl).not.toHaveBeenCalled();

    fireEvent.change(input, {
      target: {
        files: [
          new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
            type: "image/jpeg",
          }),
        ],
      },
    });
    expect(screen.getByText(/file exceeds 5 MB/i)).toBeTruthy();

    rerender(
      <PropertyPhotoStep
        propertyId="property-1"
        propertyName="Safe Place"
        photos={[PHOTO_A, PHOTO_B, { ...PHOTO_B, id: "photo-3", sortOrder: 2 }]}
        editable
      />,
    );
    fireEvent.change(screen.getByLabelText("Select photos"), {
      target: {
        files: [
          new File(["one"], "one.jpg", { type: "image/jpeg" }),
          new File(["two"], "two.jpg", { type: "image/jpeg" }),
        ],
      },
    });
    expect(screen.getByText(/no more than 1 additional photo/i)).toBeTruthy();
  });

  it("keeps a preview alive until upload succeeds, then revokes it", async () => {
    const { unmount } = render(
      <PropertyPhotoStep
        propertyId="property-1"
        propertyName="Safe Place"
        photos={[]}
        editable
      />,
    );
    const file = new File(["image"], "entrance.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Select photos"), {
      target: { files: [file] },
    });

    expect(screen.getByAltText("Selected photo preview")).toBeTruthy();
    expect(revokeObjectUrl).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Upload selected photos" }),
    );
    await waitFor(() =>
      expect(mutations.upload.mutateAsync).toHaveBeenCalledWith({
        files: [file],
        onProgress: expect.any(Function),
      }),
    );
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:test-preview");
    unmount();
  });

  it("preserves existing and selected photos when upload fails", async () => {
    mutations.upload.mutateAsync.mockRejectedValueOnce(new Error("offline"));
    render(
      <PropertyPhotoStep
        propertyId="property-1"
        propertyName="Safe Place"
        photos={[PHOTO_A]}
        editable
      />,
    );
    fireEvent.change(screen.getByLabelText("Select photos"), {
      target: {
        files: [new File(["image"], "new.jpg", { type: "image/jpeg" })],
      },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Upload selected photos" }),
    );

    expect(await screen.findByText("Photo operation failed")).toBeTruthy();
    expect(screen.getByAltText("Entrance")).toBeTruthy();
    expect(screen.getByAltText("Selected photo preview")).toBeTruthy();
  });

  it("provides accessible cover, reorder, and confirmed remove actions", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <PropertyPhotoStep
        propertyId="property-1"
        propertyName="Safe Place"
        photos={[PHOTO_A, PHOTO_B]}
        editable
      />,
    );

    const setCoverButton = screen
      .getAllByRole("button", { name: "Set as cover" })
      .find((button) => !button.hasAttribute("disabled"));
    if (!setCoverButton) throw new Error("Expected an enabled cover action");
    await userEvent.click(setCoverButton);
    expect(mutations.setCover.mutateAsync).toHaveBeenCalledWith(PHOTO_B.id);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Move later" })[0],
    );
    expect(mutations.reorder.mutateAsync).toHaveBeenCalledWith([
      PHOTO_B.id,
      PHOTO_A.id,
    ]);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Remove photo" })[0],
    );
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(mutations.remove.mutateAsync).toHaveBeenCalledWith(PHOTO_A.id);
  });

  it("locks every photo action in a non-editable status", () => {
    render(
      <PropertyPhotoStep
        propertyId="property-1"
        propertyName="Safe Place"
        photos={[PHOTO_A, PHOTO_B]}
        editable={false}
      />,
    );

    expect(screen.queryByLabelText("Select photos")).toBeNull();
    expect(screen.getByText(/photo changes are locked/i)).toBeTruthy();
    for (const button of screen.getAllByRole("button")) {
      expect(button.hasAttribute("disabled")).toBe(true);
    }
  });
});
