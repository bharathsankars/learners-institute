import { type ReactNode, useMemo, useState } from "react";

import { logoutRequest, loginRequest, type AuthUser } from "../../api/auth";
import { AdminAuthContext, type AdminAuthContextValue } from "./authContext.ts";

type AdminAuthProviderProps = {
  children: ReactNode;
};

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = async (username: string, password: string) => {
    try {
      const loggedInUser = await loginRequest(username, password);
      setUser(loggedInUser);
      return true;
    } catch {
      setUser(null);
      return false;
    }
  };

  const logout = () => {
    void logoutRequest();
    setUser(null);
  };

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
