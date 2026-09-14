import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CreateTaskInput, type MoveTaskInput, type UpdateTaskInput } from "@/services";

export const boardKeys = {
  board: ["board"] as const,
  tasks: ["tasks"] as const,
};

export function useBoard(enabled: boolean) {
  const qc = useQueryClient();

  const board = useQuery({ queryKey: boardKeys.board, queryFn: api.board.getBoard, enabled });
  const tasks = useQuery({ queryKey: boardKeys.tasks, queryFn: api.board.listTasks, enabled });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: boardKeys.tasks });
    void qc.invalidateQueries({ queryKey: boardKeys.board });
  };

  const rename = useMutation({
    mutationFn: (name: string) => api.board.renameBoard(name),
    onSuccess: invalidate,
  });
  const create = useMutation({
    mutationFn: (input: CreateTaskInput) => api.board.createTask(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => api.board.updateTask(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.board.deleteTask(id),
    onSuccess: invalidate,
  });
  const move = useMutation({
    mutationFn: (input: MoveTaskInput) => api.board.moveTask(input),
    onSuccess: (next) => {
      qc.setQueryData(boardKeys.tasks, next);
    },
  });

  return {
    board: board.data ?? null,
    tasks: tasks.data ?? [],
    loading: board.isLoading || tasks.isLoading,
    rename,
    create,
    update,
    remove,
    move,
  };
}
