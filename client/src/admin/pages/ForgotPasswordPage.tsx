import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";

import { useState } from "react";

import { Link } from "react-router-dom";

import {
  completeSuperAdminPasswordReset,
  verifyTemporaryRecoveryPassword,
} from "../../api/recovery";

import "../styles/RecoveryPage.css";

export function ForgotPasswordPage() {
  const [step, setStep] = useState<"temporary" | "new-password" | "success">(
    "temporary",
  );

  const [temporaryPassword, setTemporaryPassword] = useState("");

  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");

  const [working, setWorking] = useState(false);

  const [recoveryRequested, setRecoveryRequested] = useState(false);

  const [recoveryLoading, setRecoveryLoading] = useState(false);

  async function verifyTemporaryPassword() {
    setError("");

    if (!temporaryPassword) {
      setError("Enter the temporary recovery password.");

      return;
    }

    try {
      setWorking(true);

      await verifyTemporaryRecoveryPassword(temporaryPassword);

      setStep("new-password");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to verify temporary password.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function changePassword() {
    setError("");

    if (newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");

      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");

      return;
    }

    if (newPassword === temporaryPassword) {
      setError(
        "Choose a new password that is different from the temporary recovery password.",
      );

      return;
    }

    try {
      setWorking(true);

      await completeSuperAdminPasswordReset(temporaryPassword, newPassword);

      setTemporaryPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setStep("success");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to change password.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="recovery-page recovery-page--center">
      <section className="recovery-panel recovery-forgot">
        <Link className="recovery-back-link" to="/admin/login">
          <ArrowLeft size={17} />
          Back to sign in
        </Link>

        {step === "temporary" && (
          <>
            <div className="recovery-mark">
              <ShieldCheck size={28} aria-hidden="true" />
            </div>

            <span className="recovery-eyebrow">Password recovery</span>

            <h1>
              {recoveryRequested
                ? "Temporary recovery password"
                : "Forgot your password?"}
            </h1>

            {recoveryLoading ? (
              <div
                className="recovery-loading"
                role="status"
                aria-live="polite"
              >
                <div className="recovery-loading__spinner" aria-hidden="true" />

                <strong>Preparing recovery…</strong>

                <span>Please wait a moment.</span>
              </div>
            ) : !recoveryRequested ? (
              <>
                <div className="recovery-request-box">
                  <KeyRound size={24} aria-hidden="true" />

                  <div>
                    <strong>Need a recovery password?</strong>

                    <span>Please click Get recovery password button.</span>
                  </div>
                </div>

                <button
                  className="recovery-primary-button recovery-request-button"
                  type="button"
                  disabled={recoveryLoading}
                  onClick={() => {
                    setError("");
                    setRecoveryLoading(true);

                    window.setTimeout(() => {
                      setRecoveryLoading(false);
                      setRecoveryRequested(true);
                    }, 5000);
                  }}
                >
                  Get recovery password
                </button>
              </>
            ) : (
              <>
                <div className="recovery-sent-message">
                  <ShieldCheck size={20} aria-hidden="true" />

                  <span>
                    Your temporary password has been sent to
                    <strong> re*****.com</strong>
                  </span>
                </div>

                <div className="recovery-form">
                  <label>
                    <div className="recovery-password-field">
                      <input
                        type={showTemporaryPassword ? "text" : "password"}
                        value={temporaryPassword}
                        onChange={(event) =>
                          setTemporaryPassword(event.target.value)
                        }
                        autoComplete="one-time-code"
                        placeholder="Enter temporary password"
                        autoFocus
                      />

                      <button
                        type="button"
                        aria-label={
                          showTemporaryPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        onClick={() =>
                          setShowTemporaryPassword((value) => !value)
                        }
                      >
                        {showTemporaryPassword ? (
                          <EyeOff size={19} aria-hidden="true" />
                        ) : (
                          <Eye size={19} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </label>

                  {error && (
                    <div className="recovery-error" role="alert">
                      {error}
                    </div>
                  )}

                  <button
                    className="recovery-primary-button"
                    type="button"
                    disabled={working}
                    onClick={verifyTemporaryPassword}
                  >
                    {working ? "Checking…" : "Continue"}
                  </button>

                  <button
                    className="recovery-text-button"
                    type="button"
                    onClick={() => {
                      setError("");
                      setTemporaryPassword("");
                      setRecoveryRequested(false);
                    }}
                  >
                    Go back
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {step === "new-password" && (
          <>
            <div className="recovery-mark">
              <KeyRound size={28} />
            </div>

            <span className="recovery-eyebrow">Recovery verified</span>

            <h1>Create your new password</h1>

            <p className="recovery-lead">
              Choose the password you want to use for future Super Admin
              sign-ins.
            </p>

            <div className="recovery-form">
              <label>
                <span>New password</span>

                <div className="recovery-password-field">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    autoFocus
                  />

                  <button
                    type="button"
                    onClick={() => setShowNewPassword((value) => !value)}
                    aria-label={
                      showNewPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showNewPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </label>

              <label>
                <span>Confirm new password</span>

                <div className="recovery-password-field">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </label>

              {error && (
                <div className="recovery-error" role="alert">
                  {error}
                </div>
              )}

              <button
                className="recovery-primary-button"
                type="button"
                disabled={working}
                onClick={changePassword}
              >
                {working ? "Changing password…" : "Change my password"}
              </button>
            </div>
          </>
        )}

        {step === "success" && (
          <div className="recovery-success-state">
            <div className="recovery-mark recovery-mark--success">
              <KeyRound size={28} />
            </div>

            <span className="recovery-eyebrow">Password changed</span>

            <h1>Your new password is ready</h1>

            <p className="recovery-lead">
              The temporary recovery password has now expired and cannot be used
              again.
            </p>

            <Link
              className="recovery-primary-button recovery-link-button"
              to="/admin/login"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
