import { createContext } from "react";

import type { AuthUser } from "../../api/auth";

export type AdminAuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;

  login: (username: string, password: string) => Promise<boolean>;

  logout: () => void;
};

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(
  null,
);
