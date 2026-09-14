import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type User } from "@/services";

interface AuthValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, updateUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const userId = useRef<string | null>(null);
  const revision = useRef(0);

  const setUser = useCallback(
    (next: User | null) => {
      revision.current += 1;
      if (userId.current !== (next?.id ?? null)) {
        queryClient.clear();
        userId.current = next?.id ?? null;
      }
      updateUser(next);
      setLoading(false);
    },
    [queryClient],
  );

  const refresh = useCallback(async () => {
    const current = ++revision.current;
    try {
      const session = await api.auth.getSession();
      if (current === revision.current) setUser(session?.user ?? null);
    } catch (error) {
      if (current === revision.current) {
        setUser(null);
        toast.error(error instanceof Error ? error.message : "Could not restore your session.");
      }
    }
  }, [setUser]);

  useEffect(() => {
    void refresh();
    return api.auth.onSessionChange(() => {
      // Immediately hide the previous account before restoring a changed token.
      setUser(null);
      setLoading(true);
      void refresh();
    });
  }, [refresh, setUser]);

  const value = useMemo(
    () => ({ user, loading, refresh, setUser }),
    [user, loading, refresh, setUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
