import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api";
import * as storage from "@/lib/auth-storage";
import type { RegisterInput, User } from "@/types/auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = storage.getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await api.get<User>("/auth/me", token);
      setUser(me);
    } catch {
      storage.clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.postJson<{ accessToken: string }>("/auth/login", {
        email,
        password,
      });
      storage.setToken(res.accessToken);
      await refreshUser();
    },
    [refreshUser],
  );

  const register = useCallback(
    async (data: RegisterInput) => {
      await api.postJson<User>("/auth/register", {
        email: data.email,
        password: data.password,
        name: data.name,
        phone: data.phone,
      });
      await login(data.email, data.password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    const token = storage.getToken();
    if (token) {
      try {
        await api.postJson("/auth/logout", {}, token);
      } catch {
        // still clear local session
      }
    }
    storage.clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
