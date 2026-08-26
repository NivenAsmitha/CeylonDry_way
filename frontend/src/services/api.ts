import axios, {
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { authResponseSchema } from "../features/auth/schemas/auth-response.schema";
import type { AuthResponse } from "../features/auth/types/auth.types";
import { API_BASE_URL } from "./environment";
import {
  AuthenticationSupersededError,
  authenticationCoordinator,
} from "./authentication-coordinator";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _authenticationRetry?: boolean;
    _authenticationGeneration?: number;
  }
}

type AuthenticationFailureListener = () => void;

const authenticationFailureListeners = new Set<AuthenticationFailureListener>();
const unauthenticatedPaths = [
  "/auth/register",
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/reset-password",
] as const;

let refreshPromise: Promise<AuthResponse> | null = null;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export function getAccessToken(): string | null {
  return authenticationCoordinator.getAccessToken();
}

export function getAuthenticationGeneration(): number {
  return authenticationCoordinator.getGeneration();
}

export function isAuthenticationGenerationCurrent(generation: number): boolean {
  return authenticationCoordinator.isCurrent(generation);
}

export function isLogoutInProgress(): boolean {
  return authenticationCoordinator.isLogoutInProgress();
}

export function commitAccessToken(token: string, generation: number): void {
  if (!authenticationCoordinator.commitAccessToken(token, generation)) {
    throw new AuthenticationSupersededError();
  }
}

export function beginLogout(): number {
  const generation = authenticationCoordinator.beginLogout();
  const staleRefresh = refreshPromise;
  refreshPromise = null;
  void staleRefresh?.catch(() => undefined);
  return generation;
}

export function finishLogout(generation: number): void {
  authenticationCoordinator.finishLogout(generation);
}

export function subscribeToAuthenticationFailure(
  listener: AuthenticationFailureListener,
): () => void {
  authenticationFailureListeners.add(listener);

  return () => {
    authenticationFailureListeners.delete(listener);
  };
}

function notifyAuthenticationFailure(): void {
  for (const listener of authenticationFailureListeners) {
    listener();
  }
}

export function isUnauthenticatedEndpoint(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  return unauthenticatedPaths.some((path) => url.endsWith(path));
}

function requestHasBearerToken(config: InternalAxiosRequestConfig): boolean {
  const authorization = AxiosHeaders.from(config.headers).get("Authorization");

  return (
    typeof authorization === "string" && authorization.startsWith("Bearer ")
  );
}

export function shouldAttemptAuthenticationRefresh(
  status: number | undefined,
  originalRequest: InternalAxiosRequestConfig | undefined,
): originalRequest is InternalAxiosRequestConfig & {
  _authenticationGeneration: number;
} {
  return Boolean(
    status === 401 &&
    originalRequest &&
    !originalRequest._authenticationRetry &&
    !isUnauthenticatedEndpoint(originalRequest.url) &&
    requestHasBearerToken(originalRequest) &&
    !authenticationCoordinator.isLogoutInProgress() &&
    originalRequest._authenticationGeneration ===
      authenticationCoordinator.getGeneration(),
  );
}

export function requestTokenRefresh(): Promise<AuthResponse> {
  if (authenticationCoordinator.isLogoutInProgress()) {
    return Promise.reject(new AuthenticationSupersededError());
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshGeneration = authenticationCoordinator.getGeneration();
  const controller = new AbortController();

  if (
    !authenticationCoordinator.registerRefresh(controller, refreshGeneration)
  ) {
    return Promise.reject(new AuthenticationSupersededError());
  }

  const operation = refreshClient
    .post<unknown>("/auth/refresh", undefined, { signal: controller.signal })
    .then((response) => authResponseSchema.parse(response.data))
    .then((authResponse) => {
      commitAccessToken(authResponse.accessToken, refreshGeneration);
      return authResponse;
    })
    .catch((error: unknown) => {
      if (
        authenticationCoordinator.markAuthenticationFailure(refreshGeneration)
      ) {
        notifyAuthenticationFailure();
      }
      throw error;
    })
    .finally(() => {
      authenticationCoordinator.clearRefresh(controller);
      if (refreshPromise === operation) refreshPromise = null;
    });

  refreshPromise = operation;
  return operation;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  config._authenticationGeneration = authenticationCoordinator.getGeneration();

  if (token && !isUnauthenticatedEndpoint(config.url)) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

async function retryAfterUnauthorized(
  error: unknown,
): Promise<AxiosResponse<unknown>> {
  if (!axios.isAxiosError(error)) {
    throw error;
  }

  const originalRequest = error.config;

  if (
    !shouldAttemptAuthenticationRefresh(error.response?.status, originalRequest)
  ) {
    throw error;
  }

  originalRequest._authenticationRetry = true;
  const authResponse = await requestTokenRefresh();
  if (
    !authenticationCoordinator.isCurrent(
      originalRequest._authenticationGeneration,
    )
  ) {
    throw new AuthenticationSupersededError();
  }
  originalRequest.headers.set(
    "Authorization",
    `Bearer ${authResponse.accessToken}`,
  );
  return apiClient.request(originalRequest);
}

apiClient.interceptors.response.use(
  (response) => response,
  retryAfterUnauthorized,
);
