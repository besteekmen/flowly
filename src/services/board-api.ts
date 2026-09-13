/**
 * Board + task operations, always scoped to the signed-in user.
 */
import { delay, mutateDb, readDb, readSessionUserId, uid } from "./mock-store";
import {
  ApiError,
  type Board,
  type CreateTaskInput,
  type MoveTaskInput,
  type Task,
  type TaskStatus,
  type UpdateTaskInput,
} from "./types";

function currentUserId(): string {
  const id = readSessionUserId();
  if (!id) throw new ApiError("You are not signed in.");
  return id;
}

function findBoard(): Board {
  const userId = currentUserId();
  let board = readDb().boards.find((b) => b.ownerId === userId);
  if (!board) {
    const created: Board = { id: uid("board"), ownerId: userId, name: "My Board" };
    mutateDb((db) => void db.boards.push(created));
    board = created;
  }
  return board;
}

export async function getBoard(): Promise<Board> {
  return delay(findBoard(), 180);
}

export async function renameBoard(name: string): Promise<Board> {
  const board = findBoard();
  const clean = name.trim() || "My Board";
  mutateDb((db) => {
    const target = db.boards.find((b) => b.id === board.id);
    if (target) target.name = clean;
  });
  return delay({ ...board, name: clean }, 200);
}

export async function listTasks(): Promise<Task[]> {
  const board = findBoard();
  const tasks = readDb()
    .tasks.filter((t) => t.boardId === board.id)
    .sort((a, b) => a.position - b.position);
  return delay(tasks, 220);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const board = findBoard();
  const now = new Date().toISOString();
  const siblings = readDb().tasks.filter((t) => t.boardId === board.id && t.status === input.status);
  const task: Task = {
    id: uid("task"),
    boardId: board.id,
    title: input.title.trim(),
    description: input.description.trim(),
    dueDate: input.dueDate,
    priority: input.priority,
    status: input.status,
    position: siblings.length,
    createdAt: now,
    updatedAt: now,
  };
  mutateDb((db) => void db.tasks.push(task));
  return delay(task, 260);
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  let updated: Task | undefined;
  mutateDb((db) => {
    const task = db.tasks.find((t) => t.id === id);
    if (!task) return;
    if (input.status && input.status !== task.status) {
      task.position = db.tasks.filter(
        (t) => t.boardId === task.boardId && t.status === input.status,
      ).length;
      task.status = input.status;
    }
    if (input.title !== undefined) task.title = input.title.trim();
    if (input.description !== undefined) task.description = input.description.trim();
    if (input.dueDate !== undefined) task.dueDate = input.dueDate;
    if (input.priority !== undefined) task.priority = input.priority;
    task.updatedAt = new Date().toISOString();
    updated = task;
  });
  if (!updated) throw new ApiError("Task not found.");
  return delay(updated, 240);
}

export async function deleteTask(id: string): Promise<void> {
  mutateDb((db) => {
    db.tasks = db.tasks.filter((t) => t.id !== id);
  });
  return delay(undefined, 200);
}

/** Moves a task to a column at a given index and renumbers both columns. */
export async function moveTask({ taskId, status, index }: MoveTaskInput): Promise<Task[]> {
  const board = findBoard();
  mutateDb((db) => {
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const from = task.status;
    task.status = status;
    task.updatedAt = new Date().toISOString();

    const column = db.tasks
      .filter((t) => t.boardId === board.id && t.status === status && t.id !== taskId)
      .sort((a, b) => a.position - b.position);
    column.splice(Math.max(0, Math.min(index, column.length)), 0, task);
    column.forEach((t, i) => (t.position = i));

    if (from !== status) {
      db.tasks
        .filter((t) => t.boardId === board.id && t.status === from)
        .sort((a, b) => a.position - b.position)
        .forEach((t, i) => (t.position = i));
    }
  });
  return listTasks();
}

export function columnTasks(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);
}
