import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAdminAuth } from "../auth/useAdminAuth.ts";
import { AdminSidebar } from "../components/AdminSidebar";

import "../styles/AdminLayout.css";
import "../styles/AdminRouteLoader.css";

export function AdminLayout() {
  const mobileMenu = useRef<HTMLDetailsElement>(null);

  const navigationTimer = useRef<number | null>(null);
  const finishTimer = useRef<number | null>(null);

  const [isRouteLoading, setIsRouteLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const { user, isAuthenticated } = useAdminAuth();

  const handleAdminNavigate = (path: string) => {
    if (
      path === location.pathname ||
      isRouteLoading
    ) {
      return;
    }

    setIsRouteLoading(true);

    if (navigationTimer.current) {
      window.clearTimeout(navigationTimer.current);
    }

    if (finishTimer.current) {
      window.clearTimeout(finishTimer.current);
    }

    navigationTimer.current =
      window.setTimeout(() => {
        navigate(path);

        finishTimer.current =
          window.setTimeout(() => {
            setIsRouteLoading(false);
          }, 180);
      }, 300);
  };

  useEffect(() => {
    return () => {
      if (navigationTimer.current) {
        window.clearTimeout(
          navigationTimer.current,
        );
      }

      if (finishTimer.current) {
        window.clearTimeout(
          finishTimer.current,
        );
      }
    };
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  return (
    <div className="admin-layout">
      <aside className="admin-layout__sidebar">
        <AdminSidebar
          role={user.role}
          onNavigate={handleAdminNavigate}
        />
      </aside>

      <div className="admin-layout__main">
        {isRouteLoading && (
          <div
            className="admin-route-loader"
            role="status"
            aria-live="polite"
          >
            <div className="admin-route-loader__card">
              <div className="admin-route-loader__status">
                <span
                  className="admin-route-loader__spinner"
                  aria-hidden="true"
                />

                <span>Loading…</span>
              </div>
            </div>
          </div>
        )}

        <header className="admin-layout__topbar">
          <div className="admin-layout__welcome">
            <span>Welcome </span>

            <strong>
              {[
                user.firstName,
                user.lastName,
              ]
                .filter(Boolean)
                .join(" ")}
            </strong>
          </div>

          <details
            ref={mobileMenu}
            className="admin-layout__mobile-menu"
            onKeyDown={(event) => {
              if (
                event.key === "Escape" &&
                mobileMenu.current
              ) {
                mobileMenu.current.open = false;

                mobileMenu.current
                  .querySelector("summary")
                  ?.focus();
              }
            }}
          >
            <summary>
              <Menu
                size={20}
                aria-hidden="true"
              />
              Navigation
            </summary>

            <div
              className="admin-layout__mobile-panel"
              onClick={(event) => {
                if (
                  (
                    event.target as HTMLElement
                  ).closest("a, button") &&
                  mobileMenu.current
                ) {
                  mobileMenu.current.open = false;
                }
              }}
            >
              <AdminSidebar
                role={user.role}
                onNavigate={handleAdminNavigate}
              />
            </div>
          </details>
        </header>

        <main
          className={
            `admin-layout__content${
              isRouteLoading
                ? " admin-layout__content--loading"
                : ""
            }`
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
