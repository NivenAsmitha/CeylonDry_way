function requirePublicUrl(value: unknown, variableName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `${variableName} is required. Add it to frontend/.env using a public API URL.`,
    );
  }

  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${variableName} must be a valid absolute URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${variableName} must use http or https.`);
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      `${variableName} must not contain credentials, query parameters, or fragments.`,
    );
  }

  return url.toString().replace(/\/$/, "");
}

export const API_BASE_URL = requirePublicUrl(
  import.meta.env.VITE_API_BASE_URL,
  "VITE_API_BASE_URL",
);
