import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import "./App.css";

import { RequireRole } from "./admin/auth/RequireRole";
import { AdminLayout } from "./admin/layouts/AdminLayout";
import { AdminLoginPage } from "./admin/pages/AdminLoginPage";
import { UpcomingPage } from "./admin/pages/UpcomingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PublicHomePage } from "./pages/PublicHomePage";

const AdminDashboardPage = lazy(() => import("./admin/pages/AdminDashboardPage").then(module => ({ default: module.AdminDashboardPage })));
const EnquiriesPage = lazy(() => import("./admin/pages/EnquiriesPage").then(module => ({ default: module.EnquiriesPage })));

const StudentsPage = lazy(() => import("./admin/pages/StudentsPage").then(module => ({ default: module.StudentsPage })));

const CoursesPage = lazy(() => import("./admin/pages/CoursesPage").then(module => ({ default: module.CoursesPage })));

const SettingsPage = lazy(() => import("./admin/pages/SettingsPage").then(module => ({ default: module.SettingsPage })));

function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicHomePage />} />

      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Suspense fallback={<p role="status">Loading dashboard…</p>}><AdminDashboardPage /></Suspense>} />

        <Route path="enquiries" element={<Suspense fallback={<p role="status">Loading enquiries…</p>}><EnquiriesPage /></Suspense>} />
        <Route path="students" element={<Suspense fallback={<p role="status">Loading students…</p>}><StudentsPage /></Suspense>} />
        <Route path="courses" element={<Suspense fallback={<p role="status">Loading courses…</p>}><CoursesPage /></Suspense>} />

        <Route path="batches" element={<UpcomingPage title="Batches" />} />
        <Route path="attendance" element={<UpcomingPage title="Attendance" />} />
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
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
