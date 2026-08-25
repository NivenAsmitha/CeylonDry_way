import axios from "axios";

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

export interface NormalizedApiError {
  statusCode: number | null;
  code: string;
  messages: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item: unknown) => typeof item === "string")
  );
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.statusCode === "number" &&
    typeof value.code === "string" &&
    (typeof value.message === "string" || isStringArray(value.message)) &&
    typeof value.path === "string" &&
    typeof value.timestamp === "string"
  );
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const responseData: unknown = error.response?.data;

    if (isApiErrorResponse(responseData)) {
      return {
        statusCode: responseData.statusCode,
        code: responseData.code,
        messages:
          typeof responseData.message === "string"
            ? [responseData.message]
            : responseData.message,
      };
    }

    if (!error.response) {
      return {
        statusCode: null,
        code: "NETWORK_ERROR",
        messages: [
          "The service could not be reached. Check your connection and try again.",
        ],
      };
    }
  }

  return {
    statusCode: null,
    code: "REQUEST_FAILED",
    messages: ["The request could not be completed. Please try again."],
  };
}

export function getApiErrorMessage(error: unknown): string {
  return normalizeApiError(error).messages.join(" ");
}
