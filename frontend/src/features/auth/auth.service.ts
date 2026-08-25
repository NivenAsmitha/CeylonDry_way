import {
  apiClient,
  beginLogout,
  clearAccessToken,
  finishLogout,
  requestTokenRefresh,
  setAccessToken,
} from "../../services/api";
import {
  authResponseSchema,
  currentUserResponseSchema,
} from "./schemas/auth-response.schema";
import type {
  AuthResponse,
  CurrentUser,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from "./types/auth.types";

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    "/auth/reset-password",
    input,
  );
  return response.data;
}

export async function register(input: RegisterInput): Promise<CurrentUser> {
  const response = await apiClient.post<unknown>("/auth/register", input);

  return currentUserResponseSchema.parse(response.data);
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const response = await apiClient.post<unknown>("/auth/login", input);
  const authResponse = authResponseSchema.parse(response.data);

  setAccessToken(authResponse.accessToken);
  return authResponse;
}

export function refreshSession(): Promise<AuthResponse> {
  return requestTokenRefresh();
}

let logoutPromise: Promise<void> | null = null;

export function logout(): Promise<void> {
  if (logoutPromise) {
    return logoutPromise;
  }

  const pendingRefresh = beginLogout();

  logoutPromise = (async () => {
    try {
      await pendingRefresh;
      await apiClient.post<void>("/auth/logout");
    } finally {
      clearAccessToken();
      finishLogout();
    }
  })().finally(() => {
    logoutPromise = null;
  });

  return logoutPromise;
}

export async function getCurrentUser(
  signal?: AbortSignal,
): Promise<CurrentUser> {
  const response = await apiClient.get<unknown>("/me", { signal });

  return currentUserResponseSchema.parse(response.data);
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<CurrentUser> {
  const response = await apiClient.patch<unknown>("/me", input);

  return currentUserResponseSchema.parse(response.data);
}
