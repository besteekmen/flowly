import { format, isToday, parseISO, startOfDay } from "date-fns";

export function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDate(value: string): Date {
  return startOfDay(parseISO(value));
}

export function formatDue(value: string): string {
  const date = parseDate(value);
  if (isToday(date)) return "Today";
  return format(date, "d MMM");
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return parseDate(dueDate).getTime() < startOfDay(new Date()).getTime();
}
