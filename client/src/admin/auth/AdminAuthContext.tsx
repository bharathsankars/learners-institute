import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
  type AuthUser,
} from "../../api/auth";
import {
  AdminAuthContext,
  type AdminAuthContextValue,
} from "./authContext.ts";
import {
  advanceAdminSessionGeneration,
  subscribeToAdminSessionExpiry,
} from "./sessionEvents";

type AdminAuthProviderProps = {
  children: ReactNode;
};

export function AdminAuthProvider({
  children,
}: AdminAuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoringSession, setIsRestoringSession] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const currentUser =
          await getCurrentUserRequest();

        if (!cancelled) {
          setUser(
          currentUser?.role === "RECOVERY_ADMIN"
            ? null
            : currentUser
        );
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeToAdminSessionExpiry(() => {
      setUser(null);
    });
  }, []);

  const login = async (
    username: string,
    password: string,
  ) => {
    try {
      const loggedInUser = await loginRequest(
        username,
        password,
      );

      if (loggedInUser.role === "RECOVERY_ADMIN") {
        setUser(null);
        return false;
      }

      advanceAdminSessionGeneration();
      setUser(loggedInUser);

      return true;
    } catch {
      setUser(null);

      return false;
    }
  };

  const logout = () => {
    advanceAdminSessionGeneration();
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

  if (isRestoringSession) {
    return null;
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
