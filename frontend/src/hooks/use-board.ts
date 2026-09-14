import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { api, type CreateTaskInput, type MoveTaskInput, type UpdateTaskInput } from "@/services";

export const boardKeys = {
  board: ["board"] as const,
  tasks: ["tasks"] as const,
};

export function useBoard(enabled: boolean) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const keys = {
    board: [...boardKeys.board, user?.id],
    tasks: [...boardKeys.tasks, user?.id],
  };
  const onError = (error: Error) => toast.error(error.message);

  const board = useQuery({
    queryKey: keys.board,
    queryFn: ({ signal }) => api.board.getBoard(signal),
    enabled,
    retry: false,
  });
  const tasks = useQuery({
    queryKey: keys.tasks,
    queryFn: ({ signal }) => api.board.listTasks(signal),
    enabled,
    retry: false,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: keys.tasks });
    void qc.invalidateQueries({ queryKey: keys.board });
  };

  const rename = useMutation({
    onError,
    mutationFn: (name: string) => api.board.renameBoard(name),
    onSuccess: invalidate,
  });
  const create = useMutation({
    onError,
    mutationFn: (input: CreateTaskInput) => api.board.createTask(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    onError,
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      api.board.updateTask(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    onError,
    mutationFn: (id: string) => api.board.deleteTask(id),
    onSuccess: invalidate,
  });
  const move = useMutation({
    onError,
    mutationFn: (input: MoveTaskInput) => api.board.moveTask(input),
    onSuccess: (next) => {
      qc.setQueryData(keys.tasks, next);
    },
  });

  return {
    board: board.data ?? null,
    tasks: tasks.data ?? [],
    loading: board.isLoading || tasks.isLoading,
    error: board.error ?? tasks.error,
    retry: invalidate,
    rename,
    create,
    update,
    remove,
    move,
  };
}
