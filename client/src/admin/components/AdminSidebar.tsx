import { NavLink } from "react-router-dom";

import { adminNavigation, type AdminRole } from "../navigation/adminNavigation";

import { House } from "lucide-react";
import { Link } from "react-router-dom";

import "../styles/AdminSidebar.css";

type AdminSidebarProps = {
  role?: AdminRole;
  onNavigate?: (path: string) => void;
};

export function AdminSidebar({
  role = "SUPER_ADMIN",
  onNavigate,
}: AdminSidebarProps) {
  const visibleNavigation = adminNavigation.filter((item) =>
    item.roles.includes(role),
  );



  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__brand-logo">
          <img
            src="/learners-logo-mark.png"
            alt=""
            aria-hidden="true"
          />
        </div>

        <div className="admin-sidebar__brand-copy">
          <strong>Learners</strong>
          <span>Institute Administration</span>
        </div>
      </div>

      <div className="admin-sidebar__section-label">
        <span>Workspace</span>
      </div>

      <nav className="admin-sidebar__nav" aria-label="Admin navigation">
        {visibleNavigation.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={(event) => {
              if (!onNavigate) {
                return;
              }

              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }

              event.preventDefault();
              onNavigate(path);
            }}
            className={({ isActive }) =>
              `admin-sidebar__link${
                isActive ? " admin-sidebar__link--active" : ""
              }`
            }
          >
            <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <Link className="admin-sidebar__back-to-site" to="/">
          <House size={18} strokeWidth={1.8} aria-hidden="true" />

          <span>Back to Learners</span>
        </Link>

      </div>
    </aside>
  );
}
