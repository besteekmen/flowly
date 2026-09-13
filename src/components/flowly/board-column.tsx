import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type TaskStatus } from "@/services";

interface Props {
  status: TaskStatus;
  count: number;
  isDropTarget: boolean;
  onAdd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  children: React.ReactNode;
}

export function BoardColumn({
  status,
  count,
  isDropTarget,
  onAdd,
  onDragOver,
  onDrop,
  onDragLeave,
  children,
}: Props) {
  return (
    <section
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border bg-surface/60 p-3 transition",
        isDropTarget && "border-primary/60 bg-accent/60",
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2 px-1">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span className="truncate">{STATUS_LABEL[status]}</span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
        </h2>
        <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0" onClick={onAdd} aria-label={`Add task to ${STATUS_LABEL[status]}`}>
          <Plus className="h-4 w-4" />
        </Button>
      </header>
      <div className="flex min-h-24 flex-1 flex-col gap-2.5">{children}</div>
    </section>
  );
}
