export const ROLE_NAMES = [
  "CLIENT",
  "OWNER",
  "REVIEWER",
  "ADMIN",
  "DEVELOPER",
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "DISABLED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const SUPPORTED_LANGUAGES = ["en", "ja"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  language: string;
  status: UserStatus;
  roles: RoleName[];
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: CurrentUser;
}

export type AccessTokenResponse = Pick<AuthResponse, "accessToken">;

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
  language?: SupportedLanguage;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  confirmPassword: string;
}
