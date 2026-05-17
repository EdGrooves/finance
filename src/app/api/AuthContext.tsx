import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import { apiMe, apiLogout, setToken } from "./client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithToken: (token: string) => void;
  clearAuth: () => void;
  setUserFromAuth: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("auth_token") : null;
    if (!token) {
      setLoading(false);
      return;
    }

    apiMe()
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        apiLogout();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginWithToken = (token: string) => {
    setToken(token);
    setLoading(true);
    apiMe()
      .then((res) => setUser(res.user))
      .finally(() => setLoading(false));
  };

  const clearAuth = () => {
    apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithToken, clearAuth, setUserFromAuth: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
