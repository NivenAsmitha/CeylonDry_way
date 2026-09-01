import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../../services/api";
import {
  deleteOwnedProperty,
  uploadPropertyPhotos,
} from "./properties.service";

const PROPERTY_ID = "11111111-1111-4111-8111-111111111111";
const PHOTO_ID = "22222222-2222-4222-8222-222222222222";

describe("uploadPropertyPhotos", () => {
  beforeEach(() => {
    vi.spyOn(apiClient, "post").mockResolvedValue({
      data: [
        {
          id: PHOTO_ID,
          url: "https://images.example.test/property.jpg",
          sortOrder: 0,
          isCover: true,
          altText: null,
        },
      ],
    });
  });

  it("uses the exact multipart field without forcing a Content-Type boundary", async () => {
    const first = new File(["first"], "first.jpg", { type: "image/jpeg" });
    const second = new File(["second"], "second.webp", {
      type: "image/webp",
    });

    const result = await uploadPropertyPhotos(PROPERTY_ID, [first, second]);

    expect(result).toHaveLength(1);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe(`/owner/properties/${PROPERTY_ID}/photos`);
    expect(body).toBeInstanceOf(FormData);
    expect([...(body as FormData).entries()]).toEqual([
      ["photos", first],
      ["photos", second],
    ]);
    expect(config).not.toHaveProperty("headers.Content-Type");
    expect(config).toMatchObject({ _authenticationRetry: true });
    expect(apiClient.defaults.headers.common["Content-Type"]).toBeUndefined();
    expect(apiClient.defaults.withCredentials).toBe(true);
  });
});

describe("deleteOwnedProperty", () => {
  it("uses the owner-scoped deletion endpoint", async () => {
    const request = vi.spyOn(apiClient, "delete").mockResolvedValue({ data: null });

    await deleteOwnedProperty(PROPERTY_ID);

    expect(request).toHaveBeenCalledWith(`/owner/properties/${PROPERTY_ID}`);
  });
});
