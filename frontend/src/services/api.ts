import axios, {
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { authResponseSchema } from "../features/auth/schemas/auth-response.schema";
import type { AuthResponse } from "../features/auth/types/auth.types";
import { API_BASE_URL } from "./environment";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _authenticationRetry?: boolean;
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

let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse> | null = null;
let logoutInProgress = false;
let authenticationGeneration = 0;

class AuthenticationSupersededError extends Error {
  constructor() {
    super("Authentication refresh was superseded by logout");
    this.name = "AuthenticationSupersededError";
  }
}

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
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export function isLogoutInProgress(): boolean {
  return logoutInProgress;
}

export function beginLogout(): Promise<void> {
  logoutInProgress = true;
  authenticationGeneration += 1;
  clearAccessToken();

  const pendingRefresh = refreshPromise;

  if (!pendingRefresh) {
    return Promise.resolve();
  }

  return pendingRefresh.then(
    () => undefined,
    () => undefined,
  );
}

export function finishLogout(): void {
  clearAccessToken();
  logoutInProgress = false;
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

function isUnauthenticatedEndpoint(url: string | undefined): boolean {
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

export function requestTokenRefresh(): Promise<AuthResponse> {
  if (logoutInProgress) {
    return Promise.reject(new AuthenticationSupersededError());
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshGeneration = authenticationGeneration;

  refreshPromise = refreshClient
    .post<unknown>("/auth/refresh")
    .then((response) => authResponseSchema.parse(response.data))
    .then((authResponse) => {
      if (logoutInProgress || refreshGeneration !== authenticationGeneration) {
        throw new AuthenticationSupersededError();
      }

      setAccessToken(authResponse.accessToken);
      return authResponse;
    })
    .catch((error: unknown) => {
      clearAccessToken();
      notifyAuthenticationFailure();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

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
    error.response?.status !== 401 ||
    !originalRequest ||
    originalRequest._authenticationRetry ||
    isUnauthenticatedEndpoint(originalRequest.url) ||
    !requestHasBearerToken(originalRequest)
  ) {
    throw error;
  }

  originalRequest._authenticationRetry = true;
  const authResponse = await requestTokenRefresh();
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
