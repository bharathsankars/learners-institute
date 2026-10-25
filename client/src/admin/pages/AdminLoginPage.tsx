import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { type FormEvent, useState } from "react";

import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAdminAuth } from "../auth/useAdminAuth.ts";

import "../styles/AdminLogin.css";

export function AdminLoginPage() {
  const navigate = useNavigate();

  const { user, login } = useAdminAuth();

  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showLoginAnimation, setShowLoginAnimation] = useState(false);

  if (user && !isSubmitting && !showLoginAnimation) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setError("Please enter your username and password.");

      return;
    }

    try {
      setIsSubmitting(true);

      const result = await login(cleanUsername, password);

      if (result === false) {
        setError("Invalid username or password.");

        return;
      }

      setShowLoginAnimation(true);

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 7000);
      });

      navigate("/admin/dashboard", {
        replace: true,
      });
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-login">
      {showLoginAnimation && (
        <div
          className="learners-login-transition"
          role="status"
          aria-live="polite"
          aria-label="Signing in to Learners Admin"
        >
          <div className="learners-login-transition__scene">
            <div className="learners-login-transition__logo">
              <img src="/learners-logo-mark.png" alt="" aria-hidden="true" />
            </div>

            <div className="learners-login-transition__paper">
              <div className="learners-login-transition__paper-top">
                <span />
                <span />
                <span />
              </div>

              <div className="learners-login-transition__typing">
                <span className="learners-login-transition__typed-primary">
                  LEARNERS
                </span>

                <span
                  className="learners-login-transition__cursor"
                  aria-hidden="true"
                />
              </div>

              <div className="learners-login-transition__typed-secondary">
                COMMERCIAL INSTITUTE
              </div>

              <div className="learners-login-transition__location">
                THIRUNAKKARA · KOTTAYAM
              </div>
            </div>

            <div
              className="learners-login-transition__typewriter"
              aria-hidden="true"
            >
              <div className="learners-login-transition__rail" />

              <div className="learners-login-transition__keys">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="learners-login-transition__status">
              <strong>Opening Learners Admin</strong>
              <span>Preparing your workspace…</span>
            </div>

            <div
              className="learners-login-transition__progress"
              aria-hidden="true"
            >
              <span />
            </div>
          </div>
        </div>
      )}
      {/* =====================================================
          LEFT VISUAL
          ===================================================== */}

      <section className="admin-login__visual">
        <div className="admin-login__visual-content">
          <div className="admin-login__brand">
            <div className="admin-login__brand-mark" aria-hidden="true">
              L
            </div>

            <div>
              <strong>Learners</strong>

              <span>Commercial Institute</span>
            </div>
          </div>

          <div className="admin-login__intro">
            <div className="admin-login__security-icon">
              <ShieldCheck size={26} strokeWidth={1.8} aria-hidden="true" />
            </div>

            <span>Secure Admin Access</span>

            <h2>Learners Admin Portal</h2>

            <p>
              Secure access for authorised institute staff to manage students,
              courses, enquiries, attendance and administration.
            </p>
          </div>

          <div className="admin-login__visual-footer">
            <span>Learners Commercial Institute</span>

            <span>Thirunakkara, Kottayam</span>
          </div>
        </div>
      </section>

      {/* =====================================================
          LOGIN FORM
          ===================================================== */}

      <section className="admin-login__form-section">
        <div className="admin-login__form-wrapper">
          <Link className="admin-login__back" to="/">
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to website
          </Link>

          <div className="admin-login__form-header">
            <span>Welcome back</span>

            <h2>Sign in to your account</h2>

            <p>Enter your administrator credentials to continue.</p>
          </div>

          <form
            className="admin-login__form"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* Username */}

            <div className="admin-login__field">
              <label htmlFor="admin-username">Username</label>

              <div className="admin-login__input-wrapper">
                <UserRound size={18} strokeWidth={1.8} aria-hidden="true" />

                <input
                  id="admin-username"
                  type="text"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Enter username"
                  autoComplete="username"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password */}

            <div className="admin-login__field">
              <label htmlFor="admin-password">Password</label>

              <div className="admin-login__input-wrapper admin-login__input-wrapper--password">
                <LockKeyhole size={18} strokeWidth={1.8} aria-hidden="true" />

                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />

                <button
                  type="button"
                  className="admin-login__password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Hide password" : "Show password"}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.8} aria-hidden="true" />
                  ) : (
                    <Eye size={18} strokeWidth={1.8} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}

            {error && (
              <div className="admin-login__error" role="alert">
                {error}
              </div>
            )}

            {/* Submit */}

            <button
              className="admin-login__submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="admin-login__security-note">
            <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" />

            <span>
              Authorised staff access only. Unauthorised access is not
              permitted.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
