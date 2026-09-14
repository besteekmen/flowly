/** All board/task persistence goes through the authenticated FastAPI endpoints. */
import { request } from "./http";
import type {
  Board,
  CreateTaskInput,
  MoveTaskInput,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from "./types";

export function getBoard(signal?: AbortSignal): Promise<Board> {
  return request("/board", { signal });
}

export function renameBoard(name: string): Promise<Board> {
  return request("/board", { method: "PATCH", body: { name } });
}

export function listTasks(signal?: AbortSignal): Promise<Task[]> {
  return request("/board/tasks", { signal });
}

export function createTask(input: CreateTaskInput): Promise<Task> {
  return request("/board/tasks", { method: "POST", body: input });
}

export function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return request(`/board/tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
}

export function deleteTask(id: string): Promise<void> {
  return request(`/board/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function moveTask({ taskId, status, index }: MoveTaskInput): Promise<Task[]> {
  return request(`/board/tasks/${encodeURIComponent(taskId)}/move`, {
    method: "POST",
    body: { status, index },
  });
}

/** Pure client-side helper; filtering and temporary sorting do not write to the API. */
export function columnTasks(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);
}
