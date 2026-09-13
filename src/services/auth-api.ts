/**
 * Auth operations. Mocked today, HTTP tomorrow — the signatures are what the
 * UI depends on, so a real client can drop in behind them.
 */
import {
  delay,
  mutateDb,
  readDb,
  readSessionUserId,
  uid,
  writeSessionUserId,
  type StoredUser,
} from "./mock-store";
import { ApiError, type Session, type SignInInput, type SignUpInput, type UpdateProfileInput, type User } from "./types";

function toUser(u: StoredUser): User {
  const { password: _password, ...rest } = u;
  return rest;
}

function ensureBoard(userId: string) {
  mutateDb((db) => {
    if (!db.boards.some((b) => b.ownerId === userId)) {
      db.boards.push({ id: uid("board"), ownerId: userId, name: "My Board" });
    }
  });
}

export async function getSession(): Promise<Session | null> {
  const id = readSessionUserId();
  if (!id) return delay(null, 120);
  const user = readDb().users.find((u) => u.id === id);
  return delay(user ? { user: toUser(user) } : null, 120);
}

export async function signUp(input: SignUpInput): Promise<Session> {
  const email = input.email.trim().toLowerCase();
  const db = readDb();
  if (db.users.some((u) => u.email === email)) {
    throw new ApiError("An account with this email already exists.");
  }
  const user: StoredUser = {
    id: uid("user"),
    name: input.name.trim() || email.split("@")[0] || "Flowly user",
    email,
    avatarUrl: null,
    provider: "password",
    password: input.password,
  };
  mutateDb((db) => void db.users.push(user));
  ensureBoard(user.id);
  writeSessionUserId(user.id);
  return delay({ user: toUser(user) });
}

export async function signIn(input: SignInInput): Promise<Session> {
  const email = input.email.trim().toLowerCase();
  const user = readDb().users.find((u) => u.email === email);
  if (!user || user.password !== input.password) {
    throw new ApiError("That email and password don't match.");
  }
  ensureBoard(user.id);
  writeSessionUserId(user.id);
  return delay({ user: toUser(user) });
}

/** Placeholder for Google OAuth — creates/reuses a demo Google account. */
export async function signInWithGoogle(): Promise<Session> {
  const email = "you@gmail.com";
  let user = readDb().users.find((u) => u.email === email);
  if (!user) {
    user = {
      id: uid("user"),
      name: "Google User",
      email,
      avatarUrl: null,
      provider: "google",
      password: null,
    };
    const created = user;
    mutateDb((db) => void db.users.push(created));
  }
  ensureBoard(user.id);
  writeSessionUserId(user.id);
  return delay({ user: toUser(user) });
}

export async function signOut(): Promise<void> {
  writeSessionUserId(null);
  return delay(undefined, 120);
}

export async function requestPasswordReset(email: string): Promise<void> {
  void email;
  return delay(undefined, 400);
}

export async function changePassword(current: string, next: string): Promise<void> {
  const id = readSessionUserId();
  const user = readDb().users.find((u) => u.id === id);
  if (!user) throw new ApiError("You are not signed in.");
  if (user.provider !== "password") {
    throw new ApiError("Password changes are only available for email accounts.");
  }
  if (user.password !== current) throw new ApiError("Your current password is incorrect.");
  mutateDb((db) => {
    const target = db.users.find((u) => u.id === id);
    if (target) target.password = next;
  });
  return delay(undefined, 300);
}

export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  const id = readSessionUserId();
  if (!id) throw new ApiError("You are not signed in.");
  let updated: StoredUser | undefined;
  mutateDb((db) => {
    const target = db.users.find((u) => u.id === id);
    if (!target) return;
    if (input.name !== undefined) target.name = input.name;
    if (input.avatarUrl !== undefined) target.avatarUrl = input.avatarUrl;
    updated = target;
  });
  if (!updated) throw new ApiError("Account not found.");
  return delay(toUser(updated), 300);
}

export async function deleteAccount(): Promise<void> {
  const id = readSessionUserId();
  if (!id) throw new ApiError("You are not signed in.");
  mutateDb((db) => {
    const boardIds = db.boards.filter((b) => b.ownerId === id).map((b) => b.id);
    db.tasks = db.tasks.filter((t) => !boardIds.includes(t.boardId));
    db.boards = db.boards.filter((b) => b.ownerId !== id);
    db.users = db.users.filter((u) => u.id !== id);
  });
  writeSessionUserId(null);
  return delay(undefined, 300);
}
