import { API_BASE_URL } from "../../../services/environment";

const API_ORIGIN = new URL(API_BASE_URL).origin;

export function normalizeMediaUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value, `${API_ORIGIN}/`);
  } catch {
    return value;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return value;

  const isLocalMedia =
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname) &&
    url.pathname.startsWith("/api/v1/media/property-photos/");
  if (isLocalMedia) {
    return new URL(`${url.pathname}${url.search}`, API_ORIGIN).toString();
  }
  return url.toString();
}
