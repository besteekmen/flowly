/**
 * The single backend-facing surface of the app.
 * UI code imports from "@/services" only.
 */
import * as auth from "./auth-api";
import * as board from "./board-api";

export const api = { auth, board };

export * from "./types";
export { columnTasks } from "./board-api";
