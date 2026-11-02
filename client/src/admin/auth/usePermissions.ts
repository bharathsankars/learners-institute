import { useAdminAuth } from "./useAdminAuth";

// Lecturers (the STAFF role) can view, admit and take attendance for their
// own batches. Changing the register, courses and batches needs an Admin.
// The server enforces the same rules; this only hides what would be refused.
export function usePermissions() {
  const { user } = useAdminAuth();
  const isLecturer = user?.role === "STAFF";

  return {
    userId: user?.id ?? null,
    isLecturer,
    canManage: !isLecturer,
    isSuperAdmin: user?.role === "SUPER_ADMIN",
  };
}
