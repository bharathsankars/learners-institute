import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, KeyRound, LoaderCircle, LogOut, X } from "lucide-react";

import { resetAdminUserPassword, signOutAdminUser, type AdminUser } from "../../api/adminUsers";

import "../styles/AddStudentModal.css";

type Props = {
  user: AdminUser;
  action: "reset" | "signout";
  isSelf: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
};

// Confirms a password reset or sign-out, then (for a reset) shows the
// temporary password exactly once.
export function UserSecurityDialog({ user, action, isSelf, onClose, onDone }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const name = `${user.firstName} ${user.lastName}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      if (action === "reset") {
        setTemporaryPassword(await resetAdminUserPassword(user.id));
        return `${name}'s password was reset and they were signed out everywhere.`;
      }

      return signOutAdminUser(user.id);
    },
    onSuccess: (message) => {
      onDone(message);

      if (action === "signout") onClose();
    },
  });

  const close = () => {
    if (!mutation.isPending) onClose();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const title =
    action === "reset"
      ? temporaryPassword
        ? "Temporary password"
        : `Reset ${user.firstName}'s password?`
      : isSelf
        ? "Sign out your other devices?"
        : `Sign ${user.firstName} out everywhere?`;

  return (
    <dialog
      ref={dialogRef}
      className="student-modal delete-dialog"
      aria-labelledby="security-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="student-modal__header">
        <div className="student-modal__heading">
          <span className="student-modal__heading-icon" aria-hidden="true">
            {action === "reset" ? <KeyRound size={21} /> : <LogOut size={21} />}
          </span>
          <div>
            <span className="student-modal__eyebrow">People &amp; access</span>
            <h2 id="security-dialog-title">{title}</h2>
            <p>{name}</p>
          </div>
        </div>
        <button className="student-modal__close" type="button" onClick={close} disabled={mutation.isPending} aria-label="Close">
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div className="student-modal__body">
        {temporaryPassword ? (
          <>
            <div className="settings-temp-password">
              <code>{temporaryPassword}</code>
              <button type="button" className="records-button" onClick={() => void copy()}>
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="delete-dialog__description">
              Give this password to {user.firstName} privately. It is shown only once. They can sign in with it now; ask
              them to keep it safe.
            </p>
          </>
        ) : (
          <p className="delete-dialog__description">
            {action === "reset"
              ? `A new temporary password will be created and ${user.firstName} will be signed out on every device. Their current password stops working immediately.`
              : isSelf
                ? "Every other phone or computer signed in as you will be signed out. This device stays signed in."
                : `${user.firstName} will be signed out on every phone and computer and must sign in again. Use this if a device was lost or shared.`}
          </p>
        )}

        {mutation.isError && (
          <div className="student-modal__server-error" role="alert">
            {mutation.error.message}
          </div>
        )}
      </div>

      <footer className="student-modal__actions">
        <span className="student-modal__save-note">
          {temporaryPassword ? "Recorded in the activity log." : "This is recorded in the activity log."}
        </span>
        <div>
          {temporaryPassword ? (
            <button className="student-modal__submit" type="button" onClick={onClose}>
              Done
            </button>
          ) : (
            <>
              <button className="student-modal__cancel" type="button" onClick={close} disabled={mutation.isPending} autoFocus>
                Cancel
              </button>
              <button className="student-modal__submit" type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <LoaderCircle size={16} className="student-modal__spinner" aria-hidden="true" />
                ) : action === "reset" ? (
                  <KeyRound size={16} aria-hidden="true" />
                ) : (
                  <LogOut size={16} aria-hidden="true" />
                )}
                {action === "reset" ? "Reset password" : isSelf ? "Sign out other devices" : "Sign out everywhere"}
              </button>
            </>
          )}
        </div>
      </footer>
    </dialog>
  );
}
