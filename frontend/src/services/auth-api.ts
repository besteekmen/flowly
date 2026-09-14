/** HTTP adapter preserving the session shape used by the existing UI. */
import { clearAccessToken, getAccessToken, request, saveAccessToken } from "./http";
import {
  ApiError,
  type Session,
  type SignInInput,
  type SignUpInput,
  type UpdateProfileInput,
  type User,
} from "./types";

export { onSessionChange } from "./http";

interface AuthSession extends Session {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

async function authenticate(path: string, body: unknown): Promise<Session> {
  const result = await request<AuthSession>(path, { method: "POST", body, authenticated: false });
  saveAccessToken(result.accessToken);
  return { user: result.user };
}

export async function getSession(): Promise<Session | null> {
  if (!getAccessToken()) return null;
  try {
    return await request<Session>("/auth/session");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function signUp(input: SignUpInput): Promise<Session> {
  return authenticate("/auth/signup", input);
}

export function signIn(input: SignInInput): Promise<Session> {
  return authenticate("/auth/login", input);
}

/** Calls the backend's explicit homework stub; this is not real Google OAuth. */
export function signInWithGoogle(): Promise<Session> {
  return authenticate("/auth/google", { idToken: "flowly-dev-google" });
}

export async function signOut(): Promise<void> {
  try {
    if (getAccessToken()) await request<void>("/auth/logout", { method: "POST" });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error;
  } finally {
    clearAccessToken(false);
  }
}

export function requestPasswordReset(email: string): Promise<void> {
  return request("/auth/password-reset/request", {
    method: "POST",
    body: { email },
    authenticated: false,
  });
}

export function changePassword(current: string, next: string): Promise<void> {
  return request("/me/password", {
    method: "POST",
    body: { currentPassword: current, newPassword: next },
  });
}

export function updateProfile(input: UpdateProfileInput): Promise<User> {
  return request("/me", { method: "PATCH", body: input });
}

export async function deleteAccount(): Promise<void> {
  await request<void>("/me", { method: "DELETE" });
  clearAccessToken(false);
}
