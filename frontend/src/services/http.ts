import { ApiError } from "./types";

/** Includes the contract's /api prefix. Override in frontend/.env.local. */
export const API_BASE_URL = (
  import.meta.env["VITE_API_BASE_URL"]?.trim() || "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

const TOKEN_KEY = "flowly:access-token";
const SESSION_EVENT = "flowly:session-changed";

export function getAccessToken(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export function saveAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(notify = true): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  if (notify) window.dispatchEvent(new Event(SESSION_EVENT));
}

export function onSessionChange(listener: () => void): () => void {
  const storage = (event: StorageEvent) => {
    if (event.key === TOKEN_KEY || event.key === null) listener();
  };
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener("storage", storage);
  };
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  authenticated?: boolean;
  signal?: AbortSignal | undefined;
}

export async function request<T>(
  path: string,
  { method = "GET", body, authenticated = true, signal }: RequestOptions = {},
): Promise<T> {
  const token = authenticated ? getAccessToken() : null;
  if (authenticated && !token) {
    throw new ApiError("Sign in to continue.", 401, "unauthorized");
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: "omit",
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError("Could not reach Flowly. Check that the backend is running.");
  }

  // A response from a previous account must not update the current account's UI.
  if (authenticated && getAccessToken() !== token) {
    throw new ApiError("Your session changed. Please try again.", 401, "session_changed");
  }
  if (!response.ok) {
    if (authenticated && response.status === 401) clearAccessToken();
    const error = await response.json().catch(() => null);
    throw new ApiError(
      typeof error?.message === "string" ? error.message : `Request failed (${response.status}).`,
      response.status,
      typeof error?.code === "string" ? error.code : undefined,
    );
  }
  // The contract specifies no body for logout/deletions/password operations and reset requests.
  if (response.status === 204 || response.status === 202) return undefined as T;
  return response.json() as Promise<T>;
}
