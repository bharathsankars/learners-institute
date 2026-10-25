import { Eye, EyeOff, KeyRound, LogOut, ShieldCheck, Copy, Check, Clock3, RefreshCw } from "lucide-react";

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

  const [createError, setCreateError] = useState("");

  const [creating, setCreating] = useState(false);

  const [createdPassword, setCreatedPassword] = useState("");

  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const [copied, setCopied] = useState(false);


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

    try {
      setCreating(true);

      const result = await createTemporaryRecoveryPassword();

      setCreatedPassword(result.temporaryPassword);
      setExpiresAt(result.expiresAt);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Unable to generate temporary recovery password.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyRecoveryPassword() {
    if (!createdPassword) return;

    try {
      await navigator.clipboard.writeText(createdPassword);
      setCopied(true);
      setCreateError("");
    } catch {
      setCopied(false);
      setCreateError(
        "Unable to copy automatically. Please select and copy the code manually.",
      );
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


        {createdPassword ? (
          <section className="recovery-panel recovery-single-card">
        <div className="recovery-header">
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
        </div>
            <div className="recovery-single-card__heading">
              <ShieldCheck size={26} aria-hidden="true" />

              <div>
                <span className="recovery-eyebrow">
                  Super Admin Recovery
                </span>
                <h2>Temporary password generated</h2>
                <p>
                  Share this password securely with the
                  Super Administrator.
                </p>
              </div>
            </div>

            <div className="recovery-single-card__content">
              <span className="recovery-single-card__label">
                Temporary recovery password
              </span>

              <div className="recovery-single-card__password">
                <code>{createdPassword}</code>
              </div>

              <button
                type="button"
                className="recovery-single-card__copy"
                onClick={copyRecoveryPassword}
              >
                {copied ? (
                  <Check size={17} aria-hidden="true" />
                ) : (
                  <Copy size={17} aria-hidden="true" />
                )}
                {copied ? "Copied!" : "Copy password"}
              </button>
            </div>

            <div className="recovery-single-card__info">
              <Clock3 size={17} aria-hidden="true" />
              <span>
                Valid for 30 minutes · One-time use
                {expiresAt && (
                  <>
                    {" · Expires at "}
                    {expiresAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                )}
              </span>
            </div>

            <p className="recovery-single-card__notice">
              Generating another password invalidates the
              previously generated password.
            </p>

            {createError && (
              <div className="recovery-error" role="alert">
                {createError}
              </div>
            )}

            <button
              className="recovery-secondary-button recovery-single-card__regenerate"
              type="button"
              onClick={() => {
                setCreatedPassword("");
                setExpiresAt(null);
                setCopied(false);
                setCreateError("");
              }}
            >
              <RefreshCw size={17} aria-hidden="true" />
              Generate another password
            </button>
          </section>
        ) : (
          <section className="recovery-panel">
        <div className="recovery-header">
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
        </div>
            <div className="recovery-account-card">
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
        </div>

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
                {creating ? "Creating…" : "Generate temporary recovery password"}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
