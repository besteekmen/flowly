/**
 * Per-device view preferences (filters + temporary sort). Local by design:
 * the spec keeps these on the device, not on the server.
 */
import type { Priority } from "./types";

export type DuePreset = "overdue" | "today" | "week" | "none";
export type SortMode = "manual" | "due" | "priority";

export interface ViewPreferences {
  priorities: Priority[];
  due: DuePreset[];
  sort: SortMode;
}

export const defaultPreferences: ViewPreferences = {
  priorities: [],
  due: [],
  sort: "manual",
};

const KEY = "flowly:view-preferences";

export function loadPreferences(): ViewPreferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<ViewPreferences>;
    return {
      priorities: parsed.priorities ?? [],
      due: parsed.due ?? [],
      sort: parsed.sort ?? "manual",
    };
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(prefs: ViewPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(prefs));
}
