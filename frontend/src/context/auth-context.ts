import { createContext } from "react";
import type {
  CurrentUser,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "../features/auth/types/auth.types";

export interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoggingOut: boolean;
  initializationError: string | null;
  login: (input: LoginInput) => Promise<CurrentUser>;
  register: (input: RegisterInput) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<CurrentUser>;
  updateProfile: (input: UpdateProfileInput) => Promise<CurrentUser>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
  refetchUser: () => Promise<CurrentUser | null>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
