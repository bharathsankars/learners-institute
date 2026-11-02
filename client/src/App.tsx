import { lazy, Suspense, useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import "./App.css";

import { AdminAuthProvider } from "./admin/auth/AdminAuthContext";
import { RequireRole } from "./admin/auth/RequireRole";
import { AdminLayout } from "./admin/layouts/AdminLayout";
import { AdminLoginPage } from "./admin/pages/AdminLoginPage";
import { UpcomingPage } from "./admin/pages/UpcomingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PublicHomePage } from "./pages/PublicHomePage";
import { RecoveryPage } from "./admin/pages/RecoveryPage";
import { ForgotPasswordPage } from "./admin/pages/ForgotPasswordPage";

const AdminDashboardPage = lazy(() => import("./admin/pages/AdminDashboardPage").then(module => ({ default: module.AdminDashboardPage })));
const EnquiriesPage = lazy(() => import("./admin/pages/EnquiriesPage").then(module => ({ default: module.EnquiriesPage })));

const StudentsPage = lazy(() => import("./admin/pages/StudentsPage").then(module => ({ default: module.StudentsPage })));

const CoursesPage = lazy(() => import("./admin/pages/CoursesPage").then(module => ({ default: module.CoursesPage })));
const AttendancePage = lazy(() => import("./admin/pages/AttendancePage").then(module => ({ default: module.AttendancePage })));
const BatchesPage = lazy(() => import("./admin/pages/BatchesPage").then(module => ({ default: module.BatchesPage })));

const SettingsPage = lazy(() => import("./admin/pages/SettingsPage").then(module => ({ default: module.SettingsPage })));

// Only admin routes restore the staff session, so public visitors never
// wait on (or trigger) the /api/auth/me request.
function AdminAuthRoutes() {
  useEffect(() => {
    const publicTitle = document.title;
    document.title = "Staff portal | Learners Commercial Institute";

    return () => {
      document.title = publicTitle;
    };
  }, []);

  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicHomePage />} />

      <Route element={<AdminAuthRoutes />}>
        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route
          path="/admin/forgot-password"
          element={<ForgotPasswordPage />}
        />

        <Route
          path="/admin/recovery"
          element={<RecoveryPage />}
        />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Suspense fallback={<p role="status">Loading dashboard…</p>}><AdminDashboardPage /></Suspense>} />

          <Route path="enquiries" element={<Suspense fallback={<p role="status">Loading enquiries…</p>}><EnquiriesPage /></Suspense>} />
          <Route path="students" element={<Suspense fallback={<p role="status">Loading students…</p>}><StudentsPage /></Suspense>} />
          <Route path="courses" element={<Suspense fallback={<p role="status">Loading courses…</p>}><CoursesPage /></Suspense>} />

          <Route path="batches" element={<Suspense fallback={<p role="status">Loading batches…</p>}><BatchesPage /></Suspense>} />
          <Route path="attendance" element={<Suspense fallback={<p role="status">Loading attendance…</p>}><AttendancePage /></Suspense>} />
          <Route path="expenses" element={<UpcomingPage title="Expenses" />} />
          <Route path="staff" element={<UpcomingPage title="Staff" />} />
          <Route path="reports" element={<UpcomingPage title="Reports" />} />

          <Route element={<RequireRole allowedRoles={["SUPER_ADMIN"]} />}>
            <Route path="fees/*" element={<UpcomingPage title="Fees" />} />

            <Route path="payments/*" element={<UpcomingPage title="Payments" />} />

            <Route
              path="settings"
              element={
                <Suspense fallback={<p role="status">Loading settings…</p>}>
                  <SettingsPage />
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<NotFoundPage admin />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
