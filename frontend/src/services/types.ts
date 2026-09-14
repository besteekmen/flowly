/**
 * API data contracts. These types describe what the backend returns and
 * accepts. UI components import from here; they never touch the mock store.
 */

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";
export type AuthProvider = "password" | "google";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: AuthProvider;
}

export interface Board {
  id: string;
  ownerId: string;
  name: string;
}

export interface Task {
  id: string;
  boardId: string;
  title: string;
  description: string;
  /** ISO date, no time component (YYYY-MM-DD). */
  dueDate: string | null;
  priority: Priority;
  status: TaskStatus;
  /** Manual order inside a column. */
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  dueDate: string | null;
  priority: Priority;
  status: TaskStatus;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

export interface MoveTaskInput {
  taskId: string;
  status: TaskStatus;
  /** Index within the destination column. */
  index: number;
}

export interface BoardSummary {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

export interface Session {
  user: User;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const PRIORITIES: Priority[] = ["low", "medium", "high"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};
