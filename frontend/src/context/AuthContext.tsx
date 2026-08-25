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
  getAccessToken,
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

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const authenticationLifecycle = useRef(0);
  const [isInitializing, setIsInitializing] = useState(true);
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

  useEffect(
    () => subscribeToAuthenticationFailure(removePrivateAuthenticationState),
    [removePrivateAuthenticationState],
  );

  useEffect(() => {
    let active = true;
    const lifecycle = authenticationLifecycle.current;

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

        await queryClient.fetchQuery({
          queryKey: CURRENT_USER_QUERY_KEY,
          queryFn: ({ signal }) => authService.getCurrentUser(signal),
          staleTime: 0,
        });
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
    };
  }, [queryClient, removePrivateAuthenticationState]);

  const login = useCallback(
    async (input: LoginInput): Promise<CurrentUser> => {
      authenticationLifecycle.current += 1;
      const authResponse = await authService.login(input);
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
    authenticationLifecycle.current += 1;
    const logoutRequest = authService.logout();

    void logoutRequest.catch(() => undefined);

    try {
      await queryClient.cancelQueries({ queryKey: PRIVATE_QUERY_KEY });
      removePrivateAuthenticationState();
      await logoutRequest;
    } finally {
      await queryClient.cancelQueries({ queryKey: PRIVATE_QUERY_KEY });
      removePrivateAuthenticationState();
      setInitializationError(null);
    }
  }, [queryClient, removePrivateAuthenticationState]);

  const refreshSession = useCallback(async (): Promise<CurrentUser> => {
    await authService.refreshSession();
    return queryClient.fetchQuery({
      queryKey: CURRENT_USER_QUERY_KEY,
      queryFn: ({ signal }) => authService.getCurrentUser(signal),
      staleTime: 0,
    });
  }, [queryClient]);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput): Promise<CurrentUser> => {
      const updatedUser = await authService.updateProfile(input);
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, updatedUser);
      return updatedUser;
    },
    [queryClient],
  );

  const refetchUser = useCallback(async (): Promise<CurrentUser | null> => {
    const result = await currentUserQuery.refetch();
    return result.data ?? null;
  }, [currentUserQuery]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && getAccessToken()),
      isInitializing,
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
