import { createFileRoute } from "@tanstack/react-router";
import { Check, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/flowly/app-header";
import { BoardColumn } from "@/components/flowly/board-column";
import { FiltersBar } from "@/components/flowly/filters-bar";
import { RequireAuth } from "@/components/flowly/require-auth";
import { TaskCard } from "@/components/flowly/task-card";
import { TaskDialog } from "@/components/flowly/task-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBoard } from "@/hooks/use-board";
import { useViewPreferences } from "@/hooks/use-view-preferences";
import { applyView, hasActiveFilters, summarize } from "@/lib/task-view";
import {
  columnTasks,
  STATUSES,
  STATUS_LABEL,
  type CreateTaskInput,
  type Task,
  type TaskStatus,
} from "@/services";

export const Route = createFileRoute("/board")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Board — Flowly" },
      {
        name: "description",
        content: "Your private Flowly Kanban board: plan, move, and finish tasks calmly.",
      },
      { property: "og:title", content: "My Board — Flowly" },
      { property: "og:description", content: "Your private Flowly Kanban board." },
    ],
  }),
  component: () => <RequireAuth>{(user) => <BoardPage user={user} />}</RequireAuth>,
});

function BoardPage({ user }: { user: Parameters<typeof AppHeader>[0]["user"] }) {
  const { board, tasks, loading, error, retry, rename, create, update, remove, move } =
    useBoard(true);
  const { prefs, setPrefs } = useViewPreferences();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ status: TaskStatus; index: number } | null>(null);

  const summary = summarize(tasks);
  const visible = applyView(tasks, prefs);
  const filtersOn = hasActiveFilters(prefs);
  const sortingOn = prefs.sort !== "manual";
  const dragEnabled = !sortingOn;

  const openCreate = (status: TaskStatus) => {
    setEditing(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  };

  const submitTask = (input: CreateTaskInput) => {
    if (editing) {
      update.mutate(
        { id: editing.id, input },
        {
          onSuccess: () => {
            setDialogOpen(false);
            toast.success("Task updated");
          },
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: () => {
          setDialogOpen(false);
          toast.success("Task created");
        },
      });
    }
  };

  const handleDrop = (status: TaskStatus) => {
    if (!dragId || !dragEnabled) return;
    const index =
      dropTarget?.status === status ? dropTarget.index : columnTasks(tasks, status).length;
    move.mutate({ taskId: dragId, status, index });
    setDragId(null);
    setDropTarget(null);
  };

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {renaming ? (
              <form
                className="flex min-w-0 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  rename.mutate(nameDraft, { onSuccess: () => setRenaming(false) });
                }}
              >
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="h-9 max-w-xs"
                  autoFocus
                />
                <Button type="submit" size="sm" className="h-9 shrink-0">
                  <Check className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <>
                <h1 className="truncate text-2xl font-bold tracking-tight">
                  {board?.name ?? "My Board"}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0"
                  aria-label="Rename board"
                  onClick={() => {
                    setNameDraft(board?.name ?? "My Board");
                    setRenaming(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <Button size="sm" onClick={() => openCreate("todo")}>
            <Plus className="mr-1 h-4 w-4" /> Create task
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { label: "Total", value: summary.total },
            { label: "To Do", value: summary.todo },
            { label: "In Progress", value: summary.inProgress },
            { label: "Done", value: summary.done },
          ].map((s) => (
            <span key={s.label} className="rounded-full border border-border bg-card px-3 py-1">
              {s.label} <span className="font-semibold">{s.value}</span>
            </span>
          ))}
          <span
            className={
              summary.overdue > 0
                ? "rounded-full border border-warning/50 bg-warning-soft px-3 py-1 font-medium text-warning"
                : "rounded-full border border-border bg-card px-3 py-1"
            }
          >
            Overdue <span className="font-semibold">{summary.overdue}</span>
          </span>
        </div>

        <FiltersBar prefs={prefs} onChange={setPrefs} active={filtersOn} />
        {sortingOn && (
          <p className="text-xs text-muted-foreground">
            Sorted view — your saved manual order is untouched, and dragging is paused.
          </p>
        )}

        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading your board…</p>
        ) : error ? (
          <div className="py-16 text-center text-sm">
            <p role="alert">{error.message}</p>
            <Button variant="outline" className="mt-3" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="card-soft mx-auto max-w-md p-10 text-center">
            <h2 className="text-base font-semibold">Nothing here yet.</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first task and get things moving.
            </p>
            <Button className="mt-5" onClick={() => openCreate("todo")}>
              Create task
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="card-soft mx-auto max-w-md p-10 text-center">
            <h2 className="text-base font-semibold">Nothing matches this view.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Try clearing a filter or two.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {STATUSES.map((status) => {
              const items = visible.filter((t) => t.status === status);
              return (
                <BoardColumn
                  key={status}
                  status={status}
                  count={items.length}
                  isDropTarget={dropTarget?.status === status}
                  onAdd={() => openCreate(status)}
                  onDragOver={(e) => {
                    if (!dragEnabled || !dragId) return;
                    e.preventDefault();
                    setDropTarget((cur) =>
                      cur?.status === status ? cur : { status, index: items.length },
                    );
                  }}
                  onDragLeave={() => undefined}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(status);
                  }}
                >
                  {items.length === 0 && (
                    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                      {`Nothing in ${STATUS_LABEL[status]}.`}
                    </p>
                  )}
                  {items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      draggable={dragEnabled}
                      isDragging={dragId === task.id}
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropTarget(null);
                      }}
                      onDragOverCard={(e) => {
                        if (!dragEnabled || !dragId) return;
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const after = e.clientY > rect.top + rect.height / 2;
                        if (task.id === dragId) return;
                        // The API index is in the saved column after removing the dragged task.
                        const index = columnTasks(tasks, status)
                          .filter((item) => item.id !== dragId)
                          .findIndex((item) => item.id === task.id);
                        setDropTarget({ status, index: index + (after ? 1 : 0) });
                      }}
                      onEdit={() => {
                        setEditing(task);
                        setDialogOpen(true);
                      }}
                      onDelete={() => setDeleting(task)}
                      onMoveTo={(next) =>
                        move.mutate({
                          taskId: task.id,
                          status: next,
                          index: columnTasks(tasks, next).length,
                        })
                      }
                    />
                  ))}
                </BoardColumn>
              );
            })}
          </div>
        )}
      </main>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        defaultStatus={defaultStatus}
        submitting={create.isPending || update.isPending}
        onSubmit={submitTask}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) {
                  remove.mutate(deleting.id, { onSuccess: () => toast.success("Task deleted") });
                }
                setDeleting(null);
              }}
            >
              Delete task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
