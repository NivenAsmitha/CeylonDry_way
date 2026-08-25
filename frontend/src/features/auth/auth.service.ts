import {
  apiClient,
  clearAccessToken,
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
  UpdateProfileInput,
} from "./types/auth.types";

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

export async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    clearAccessToken();
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await apiClient.get<unknown>("/me");

  return currentUserResponseSchema.parse(response.data);
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<CurrentUser> {
  const response = await apiClient.patch<unknown>("/me", input);

  return currentUserResponseSchema.parse(response.data);
}
