import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as authService from "../features/auth/auth.service";
import type {
  CurrentUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "../features/auth/types/auth.types";
import {
  beginLogout,
  finishLogout,
  getAuthenticationGeneration,
  getAccessToken,
  isAuthenticationGenerationCurrent,
  isLogoutInProgress,
  subscribeToAuthenticationFailure,
} from "../services/api";
import {
  CURRENT_USER_QUERY_KEY,
  PRIVATE_QUERY_KEY,
} from "../services/queryClient";
import { getApiErrorMessage, normalizeApiError } from "../types/api.types";
import { AuthContext, type AuthContextValue } from "./auth-context";

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_CHANNEL_NAME = "ceylon-dryway-auth";
const LOGOUT_MESSAGE = { type: "logout" } as const;

function isLogoutBroadcast(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === LOGOUT_MESSAGE.type
  );
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const authenticationLifecycle = useRef(0);
  const logoutOperation = useRef<Promise<void> | null>(null);
  const authChannel = useRef<BroadcastChannel | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );
  const currentUserQuery = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: ({ signal }) => authService.getCurrentUser(signal),
    enabled: false,
    staleTime: 60_000,
  });
  const user = currentUserQuery.data ?? null;

  const removePrivateAuthenticationState = useCallback(() => {
    queryClient.removeQueries({ queryKey: PRIVATE_QUERY_KEY });
  }, [queryClient]);

  const cancelAndRemovePrivateState = useCallback(async () => {
    await queryClient.cancelQueries({ queryKey: PRIVATE_QUERY_KEY });
    removePrivateAuthenticationState();
  }, [queryClient, removePrivateAuthenticationState]);

  useEffect(() => {
    return subscribeToAuthenticationFailure(() => {
      authenticationLifecycle.current += 1;
      void cancelAndRemovePrivateState();
      setIsInitializing(false);
    });
  }, [cancelAndRemovePrivateState]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    authChannel.current = channel;
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (!isLogoutBroadcast(event.data)) return;
      const generation = beginLogout();
      authenticationLifecycle.current += 1;
      setIsLoggingOut(true);
      void cancelAndRemovePrivateState().finally(() => {
        finishLogout(generation);
        setInitializationError(null);
        setIsInitializing(false);
        setIsLoggingOut(false);
      });
    };

    return () => {
      channel.close();
      if (authChannel.current === channel) authChannel.current = null;
    };
  }, [cancelAndRemovePrivateState]);

  useEffect(() => {
    let active = true;
    const lifecycle = ++authenticationLifecycle.current;
    const requestGeneration = getAuthenticationGeneration();
    const controller = new AbortController();

    async function initializeAuthentication(): Promise<void> {
      try {
        await authService.refreshSession();

        if (
          !active ||
          lifecycle !== authenticationLifecycle.current ||
          isLogoutInProgress()
        ) {
          return;
        }

        const currentUser = await authService.getCurrentUser(controller.signal);

        if (
          !active ||
          lifecycle !== authenticationLifecycle.current ||
          !isAuthenticationGenerationCurrent(requestGeneration)
        ) {
          return;
        }

        queryClient.setQueryData(CURRENT_USER_QUERY_KEY, currentUser);
      } catch (error: unknown) {
        removePrivateAuthenticationState();

        if (
          active &&
          lifecycle === authenticationLifecycle.current &&
          !isLogoutInProgress() &&
          normalizeApiError(error).statusCode !== 401
        ) {
          setInitializationError(getApiErrorMessage(error));
        }
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    }

    void initializeAuthentication();

    return () => {
      active = false;
      controller.abort();
    };
  }, [queryClient, removePrivateAuthenticationState]);

  const login = useCallback(
    async (input: LoginInput): Promise<CurrentUser> => {
      const lifecycle = ++authenticationLifecycle.current;
      const requestGeneration = getAuthenticationGeneration();
      const authResponse = await authService.login(input);

      if (
        lifecycle !== authenticationLifecycle.current ||
        !isAuthenticationGenerationCurrent(requestGeneration)
      ) {
        throw new Error("Login was superseded by another authentication event");
      }

      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, authResponse.user);
      await queryClient.invalidateQueries({
        queryKey: CURRENT_USER_QUERY_KEY,
        refetchType: "none",
      });
      setInitializationError(null);
      return authResponse.user;
    },
    [queryClient],
  );

  const register = useCallback(
    (input: RegisterInput): Promise<CurrentUser> => authService.register(input),
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    if (logoutOperation.current) return logoutOperation.current;

    const generation = beginLogout();
    authenticationLifecycle.current += 1;
    setIsLoggingOut(true);
    authChannel.current?.postMessage(LOGOUT_MESSAGE);

    const operation = (async () => {
      try {
        await cancelAndRemovePrivateState();
        await authService.requestLogout();
      } finally {
        await cancelAndRemovePrivateState();
        finishLogout(generation);
        setInitializationError(null);
        setIsInitializing(false);
        setIsLoggingOut(false);
      }
    })();
    logoutOperation.current = operation;
    void operation.then(
      () => {
        if (logoutOperation.current === operation)
          logoutOperation.current = null;
      },
      () => {
        if (logoutOperation.current === operation)
          logoutOperation.current = null;
      },
    );
    return operation;
  }, [cancelAndRemovePrivateState]);

  const refreshSession = useCallback(async (): Promise<CurrentUser> => {
    const lifecycle = authenticationLifecycle.current;
    const requestGeneration = getAuthenticationGeneration();
    await authService.refreshSession();
    const currentUser = await authService.getCurrentUser();

    if (
      lifecycle !== authenticationLifecycle.current ||
      !isAuthenticationGenerationCurrent(requestGeneration)
    ) {
      throw new Error("Refresh was superseded by another authentication event");
    }

    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, currentUser);
    return currentUser;
  }, [queryClient]);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput): Promise<CurrentUser> => {
      const lifecycle = authenticationLifecycle.current;
      const requestGeneration = getAuthenticationGeneration();
      const updatedUser = await authService.updateProfile(input);

      if (
        lifecycle !== authenticationLifecycle.current ||
        !isAuthenticationGenerationCurrent(requestGeneration)
      ) {
        throw new Error("Profile update was superseded by logout");
      }

      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, updatedUser);
      return updatedUser;
    },
    [queryClient],
  );

  const refetchUser = useCallback(async (): Promise<CurrentUser | null> => {
    const lifecycle = authenticationLifecycle.current;
    const requestGeneration = getAuthenticationGeneration();
    const currentUser = await authService.getCurrentUser();

    if (
      lifecycle !== authenticationLifecycle.current ||
      !isAuthenticationGenerationCurrent(requestGeneration)
    ) {
      return null;
    }

    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, currentUser);
    return currentUser;
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && getAccessToken()),
      isInitializing,
      isLoggingOut,
      initializationError,
      login,
      register,
      logout,
      refreshSession,
      updateProfile,
      refetchUser,
    }),
    [
      initializationError,
      isInitializing,
      isLoggingOut,
      login,
      logout,
      refetchUser,
      refreshSession,
      register,
      updateProfile,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
