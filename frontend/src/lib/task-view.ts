import { isThisWeek } from "date-fns";
import { isOverdue, parseDate } from "@/lib/dates";
import type { BoardSummary, Task } from "@/services";
import type { ViewPreferences } from "@/services/preferences";

const priorityWeight = { high: 0, medium: 1, low: 2 } as const;

export function applyView(tasks: Task[], prefs: ViewPreferences): Task[] {
  let list = tasks;

  if (prefs.priorities.length > 0) {
    list = list.filter((t) => prefs.priorities.includes(t.priority));
  }

  if (prefs.due.length > 0) {
    list = list.filter((t) =>
      prefs.due.some((preset) => {
        if (preset === "none") return !t.dueDate;
        if (!t.dueDate) return false;
        if (preset === "overdue") return isOverdue(t.dueDate);
        if (preset === "today") {
          const d = parseDate(t.dueDate);
          const today = new Date();
          return d.toDateString() === today.toDateString();
        }
        return isThisWeek(parseDate(t.dueDate), { weekStartsOn: 1 });
      }),
    );
  }

  if (prefs.sort === "due") {
    list = [...list].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return a.position - b.position;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  } else if (prefs.sort === "priority") {
    list = [...list].sort(
      (a, b) => priorityWeight[a.priority] - priorityWeight[b.priority] || a.position - b.position,
    );
  }

  return list;
}

export function summarize(tasks: Task[]): BoardSummary {
  return {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter((t) => t.status !== "done" && isOverdue(t.dueDate)).length,
  };
}

export function hasActiveFilters(prefs: ViewPreferences): boolean {
  return prefs.priorities.length > 0 || prefs.due.length > 0;
}
