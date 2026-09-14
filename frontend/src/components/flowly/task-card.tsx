import { AlertTriangle, CalendarDays, MoveLeft, MoveRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDue, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, STATUSES, STATUS_LABEL, type Task } from "@/services";

const priorityDot: Record<Task["priority"], string> = {
  low: "bg-priority-low",
  medium: "bg-priority-medium",
  high: "bg-priority-high",
};

const priorityCard: Record<Task["priority"], string> = {
  low: "border-priority-low-border bg-priority-low-surface text-priority-low-foreground",
  medium:
    "border-priority-medium-border bg-priority-medium-surface text-priority-medium-foreground",
  high: "border-priority-high-border bg-priority-high-surface text-priority-high-foreground",
};

interface Props {
  task: Task;
  draggable: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveTo: (status: Task["status"]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverCard: (e: React.DragEvent) => void;
  isDragging: boolean;
}

export function TaskCard({
  task,
  draggable,
  onEdit,
  onDelete,
  onMoveTo,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  isDragging,
}: Props) {
  const overdue = task.status !== "done" && isOverdue(task.dueDate);
  const statusIndex = STATUSES.indexOf(task.status);
  const prev = STATUSES[statusIndex - 1];
  const next = STATUSES[statusIndex + 1];

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverCard}
      className={cn(
        "group space-y-3 rounded-xl border p-3.5 shadow-soft transition",
        priorityCard[task.priority],
        draggable && "md:cursor-grab md:active:cursor-grabbing",
        isDragging && "opacity-40",
        overdue && "ring-1 ring-warning/35",
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", priorityDot[task.priority])} aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm leading-snug font-semibold break-words">{task.title}</h3>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed opacity-75">
              {task.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs opacity-80">
        <span className="rounded-md bg-card/55 px-1.5 py-0.5 font-medium">{PRIORITY_LABEL[task.priority]}</span>
        {task.dueDate && (
          <span className={cn("flex items-center gap-1", overdue && "font-medium text-warning")}>
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDue(task.dueDate)}
          </span>
        )}
      </div>

      {overdue && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
          <AlertTriangle className="h-3.5 w-3.5" />
          This task needs attention.
        </p>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-current/15 pt-2">
        <div className="flex items-center gap-1 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            disabled={!prev}
            onClick={() => prev && onMoveTo(prev)}
            aria-label={prev ? `Move to ${STATUS_LABEL[prev]}` : "Move left"}
          >
            <MoveLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            disabled={!next}
            onClick={() => next && onMoveTo(next)}
            aria-label={next ? `Move to ${STATUS_LABEL[next]}` : "Move right"}
          >
            <MoveRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="hidden text-xs opacity-65 md:block">Drag to move</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onEdit} aria-label="Edit task">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 opacity-70 hover:text-destructive hover:opacity-100"
            onClick={onDelete}
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
