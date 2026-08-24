"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { user: next } = (await api.me()) as { user: User };
      setUser(next);
    } catch {
      api.clearToken();
      setUser(null);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !localStorage.getItem("authToken")) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { user: next, token } = (await api.login(email, password)) as { user: User; token: string };
    api.setToken(token);
    setUser(next);
    return next;
  };

  const register = async (email: string, password: string, name: string) => {
    const { user: next, token } = (await api.register({ email, password, name })) as {
      user: User;
      token: string;
    };
    api.setToken(token);
    setUser(next);
    return next;
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
