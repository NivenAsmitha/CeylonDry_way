import {
  apiClient,
  commitAccessToken,
  getAuthenticationGeneration,
  requestTokenRefresh,
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
  const generation = getAuthenticationGeneration();
  const response = await apiClient.post<unknown>("/auth/login", input);
  const authResponse = authResponseSchema.parse(response.data);

  commitAccessToken(authResponse.accessToken, generation);
  return authResponse;
}

export function refreshSession(): Promise<AuthResponse> {
  return requestTokenRefresh();
}

export async function requestLogout(): Promise<void> {
  await apiClient.post<void>("/auth/logout");
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
