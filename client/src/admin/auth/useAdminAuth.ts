import { useContext } from "react";

import { AdminAuthContext, type AdminAuthContextValue } from "./authContext.ts";

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider.");
  }

  return context;
}
