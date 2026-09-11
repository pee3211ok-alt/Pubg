import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setToken } from "./api";

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  is_admin?: boolean;
  points: number;
  invite_code?: string;
  referrals_count?: number;
  subscribed_channels?: string[];
};

type AuthState = {
  user: User | null;
  loading: boolean;
  signInWithToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api("/api/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const signInWithToken = useCallback(async (token: string) => {
    await setToken(token);
    await refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch {}
    await setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signInWithToken, signOut, refresh }), [user, loading, signInWithToken, signOut, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
