/**
 * Mock persistence layer. Everything here is temporary and disappears the day
 * the real backend arrives — only `services/*` may import it.
 */
import type { Board, Task, User } from "./types";

const KEY = "flowly:db";
const SESSION_KEY = "flowly:session";

interface StoredUser extends User {
  password: string | null;
}

export interface Db {
  users: StoredUser[];
  boards: Board[];
  tasks: Task[];
}

const emptyDb: Db = { users: [], boards: [], tasks: [] };

const isBrowser = () => typeof window !== "undefined";

export function readDb(): Db {
  if (!isBrowser()) return { ...emptyDb };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...emptyDb };
    const parsed = JSON.parse(raw) as Db;
    return {
      users: parsed.users ?? [],
      boards: parsed.boards ?? [],
      tasks: parsed.tasks ?? [],
    };
  } catch {
    return { ...emptyDb };
  }
}

export function writeDb(db: Db) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

export function mutateDb(fn: (db: Db) => void): Db {
  const db = readDb();
  fn(db);
  writeDb(db);
  return db;
}

export function readSessionUserId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function writeSessionUserId(id: string | null) {
  if (!isBrowser()) return;
  if (id) window.localStorage.setItem(SESSION_KEY, id);
  else window.localStorage.removeItem(SESSION_KEY);
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Simulated network latency so the UI exercises real loading states. */
export function delay<T>(value: T, ms = 260): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export type { StoredUser };
