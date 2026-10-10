import { useRef } from "react";
import { Menu } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";

import { useAdminAuth } from "../auth/useAdminAuth.ts";
import { AdminSidebar } from "../components/AdminSidebar";

import "../styles/AdminLayout.css";

export function AdminLayout() {
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const { user, isAuthenticated } = useAdminAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="admin-layout">
      <aside className="admin-layout__sidebar">
        <AdminSidebar role={user.role} />
      </aside>

      <div className="admin-layout__main">
        <header className="admin-layout__topbar">
          <div className="admin-layout__welcome">
            <span>Welcome </span>

            <strong>
              {[user.firstName, user.lastName].filter(Boolean).join(" ")}
            </strong>
          </div>
          <details ref={mobileMenu} className="admin-layout__mobile-menu" onKeyDown={event => { if (event.key === "Escape" && mobileMenu.current) { mobileMenu.current.open = false; mobileMenu.current.querySelector("summary")?.focus(); } }}>
            <summary><Menu size={20} aria-hidden="true" />Navigation</summary>
            <div className="admin-layout__mobile-panel" onClick={event => { if ((event.target as HTMLElement).closest("a, button") && mobileMenu.current) mobileMenu.current.open = false; }}>
              <AdminSidebar role={user.role} />
            </div>
          </details>
        </header>

        <main className="admin-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
