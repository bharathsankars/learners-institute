import { Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from "lucide-react";

import { type FormEvent, useEffect, useState } from "react";

import {
  createTemporaryRecoveryPassword,
  fetchRecoverySuperAdmin,
  recoveryLogin,
  recoveryLogout,
  type RecoverySuperAdmin,
} from "../../api/recovery";

import "../styles/RecoveryPage.css";

export function RecoveryPage() {
  const [user, setUser] = useState<RecoverySuperAdmin | null>(null);

  const [checking, setChecking] = useState(true);

  const [username, setUsername] = useState("");

  const [loginPassword, setLoginPassword] = useState("");

  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [loginError, setLoginError] = useState("");

  const [loggingIn, setLoggingIn] = useState(false);

  const [temporaryPassword, setTemporaryPassword] = useState("");

  const [confirmTemporaryPassword, setConfirmTemporaryPassword] = useState("");

  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);

  const [showConfirmTemporaryPassword, setShowConfirmTemporaryPassword] =
    useState(false);

  const [createError, setCreateError] = useState("");

  const [creating, setCreating] = useState(false);

  const [createdPassword, setCreatedPassword] = useState("");

  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreRecoverySession() {
      try {
        const result = await fetchRecoverySuperAdmin();

        if (!cancelled) {
          setUser(result);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    void restoreRecoverySession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoginError("");

    if (!username.trim() || !loginPassword) {
      setLoginError("Enter your recovery username and password.");

      return;
    }

    try {
      setLoggingIn(true);

      await recoveryLogin(username.trim(), loginPassword);

      const result = await fetchRecoverySuperAdmin();

      setUser(result);
      setLoginPassword("");
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    } finally {
      setLoggingIn(false);
    }
  }

  async function createTemporaryPassword() {
    setCreateError("");

    if (temporaryPassword.length < 8) {
      setCreateError("Temporary password must contain at least 8 characters.");

      return;
    }

    if (temporaryPassword !== confirmTemporaryPassword) {
      setCreateError("Temporary passwords do not match.");

      return;
    }

    try {
      setCreating(true);

      const expiry = await createTemporaryRecoveryPassword(temporaryPassword);

      setCreatedPassword(temporaryPassword);

      setExpiresAt(expiry);

      setTemporaryPassword("");
      setConfirmTemporaryPassword("");

      setShowTemporaryPassword(false);
      setShowConfirmTemporaryPassword(false);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Unable to create temporary recovery password.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await recoveryLogout();

    setUser(null);
    setCreatedPassword("");
    setExpiresAt(null);
  }

  if (checking) {
    return (
      <main className="recovery-page recovery-page--center">
        <p>Checking recovery access…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="recovery-page recovery-page--center">
        <section className="recovery-panel recovery-login">
          <div className="recovery-mark">
            <ShieldCheck size={28} aria-hidden="true" />
          </div>

          <span className="recovery-eyebrow">Developer recovery</span>

          <h1>Recovery Administrator</h1>

          <p className="recovery-lead">
            Sign in to create a temporary password for Super Admin account
            recovery.
          </p>

          <form className="recovery-form" onSubmit={handleLogin}>
            <label>
              <span>Recovery username</span>

              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={loggingIn}
                autoFocus
              />
            </label>

            <label>
              <span>Recovery password</span>

              <div className="recovery-password-field">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  disabled={loggingIn}
                />

                <button
                  type="button"
                  aria-label={
                    showLoginPassword ? "Hide password" : "Show password"
                  }
                  onClick={() => setShowLoginPassword((value) => !value)}
                >
                  {showLoginPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>

            {loginError && (
              <div className="recovery-error" role="alert">
                {loginError}
              </div>
            )}

            <button
              className="recovery-primary-button"
              type="submit"
              disabled={loggingIn}
            >
              {loggingIn ? "Signing in…" : "Open recovery"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="recovery-page">
      <div className="recovery-shell">
        <header className="recovery-header">
          <div>
            <span className="recovery-eyebrow">Developer recovery</span>

            <h1>Super Admin recovery</h1>

            <p>
              Create a temporary recovery password only when the Super
              Administrator has forgotten their normal password.
            </p>
          </div>

          <button
            className="recovery-secondary-button"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </header>

        <section className="recovery-account-card">
          <div className="recovery-account-icon">
            <ShieldCheck size={26} aria-hidden="true" />
          </div>

          <div>
            <span>Super Administrator</span>

            <h2>
              {user.firstName} {user.lastName}
            </h2>

            <p>
              Username: <strong>{user.username}</strong>
            </p>
          </div>
        </section>

        {createdPassword ? (
          <section className="recovery-panel">
            <div className="recovery-mark recovery-mark--success">
              <KeyRound size={27} />
            </div>

            <span className="recovery-eyebrow">Temporary password ready</span>

            <h2>Give this password to the Super Administrator</h2>

            <div className="recovery-password-result">{createdPassword}</div>

            <div className="recovery-warning">
              <strong>Valid for 30 minutes and one use only.</strong>

              <span>
                The Super Administrator should click “Forgot password?” on the
                login page and enter this temporary password.
              </span>

              {expiresAt && (
                <span>
                  Expires at{" "}
                  <strong>
                    {expiresAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </span>
              )}
            </div>

            <button
              className="recovery-secondary-button"
              type="button"
              onClick={() => {
                setCreatedPassword("");
                setExpiresAt(null);
              }}
            >
              Create another temporary password
            </button>
          </section>
        ) : (
          <section className="recovery-panel">
            <div className="recovery-section-heading">
              <KeyRound size={23} />

              <div>
                <h2>Create temporary recovery password</h2>

                <p>
                  Creating a new one immediately invalidates any previous
                  recovery password.
                </p>
              </div>
            </div>

            <div className="recovery-form">
              <label>
                <span>Temporary recovery password</span>

                <div className="recovery-password-field">
                  <input
                    type={showTemporaryPassword ? "text" : "password"}
                    value={temporaryPassword}
                    onChange={(event) =>
                      setTemporaryPassword(event.target.value)
                    }
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    aria-label={
                      showTemporaryPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowTemporaryPassword((value) => !value)}
                  >
                    {showTemporaryPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>

                <small>Minimum 8 characters.</small>
              </label>

              <label>
                <span>Confirm temporary password</span>

                <div className="recovery-password-field">
                  <input
                    type={showConfirmTemporaryPassword ? "text" : "password"}
                    value={confirmTemporaryPassword}
                    onChange={(event) =>
                      setConfirmTemporaryPassword(event.target.value)
                    }
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    aria-label={
                      showConfirmTemporaryPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() =>
                      setShowConfirmTemporaryPassword((value) => !value)
                    }
                  >
                    {showConfirmTemporaryPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </label>

              {createError && (
                <div className="recovery-error" role="alert">
                  {createError}
                </div>
              )}

              <button
                className="recovery-primary-button"
                type="button"
                disabled={creating}
                onClick={createTemporaryPassword}
              >
                {creating ? "Creating…" : "Create temporary password"}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
