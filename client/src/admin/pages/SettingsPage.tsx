import {
  CircleCheck,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";

import {
  changeOwnPassword,
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  type AdminUser,
  type CreateAdminUserInput,
} from "../../api/adminUsers";

import "../styles/AdminDirectory.css";
import "../styles/SettingsPage.css";

type AdminFormValues = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  role: "ADMIN" | "STAFF";
};

function fullName(user: AdminUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

function roleLabel(role: AdminUser["role"]) {
  if (role === "SUPER_ADMIN") {
    return "Super Administrator";
  }

  if (role === "STAFF") {
    return "Staff";
  }

  return "Administrator";
}

function initials(user: AdminUser) {
  const first = user.firstName?.[0] ?? "";

  const last = user.lastName?.[0] ?? "";

  return `${first}${last}`.toUpperCase();
}

export function SettingsPage() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
  });

  const [editing, setEditing] = useState<AdminUser | null>(null);

  const [formOpen, setFormOpen] = useState(false);

  const [notice, setNotice] = useState("");

  const [formError, setFormError] = useState("");

  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  const [passwordOpen, setPasswordOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordError, setPasswordError] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [passwordConfirmOpen, setPasswordConfirmOpen] =
    useState(false);

  const { register, handleSubmit, reset } = useForm<AdminFormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      role: "ADMIN",
    },
  });

  const users = query.data ?? [];

  const activeUsers = users.filter((user) => user.isActive).length;

  useEffect(() => {
    if (!formOpen) {
      return;
    }

    if (editing) {
      reset({
        firstName: editing.firstName,

        lastName: editing.lastName,

        username: editing.username,

        email: editing.email,

        password: "",

        role: editing.role === "STAFF" ? "STAFF" : "ADMIN",
      });

      return;
    }

    reset({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      role: "ADMIN",
    });
  }, [editing, formOpen, reset]);

  const refreshUsers = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["admin-users"],
    });
  };

  const createMutation = useMutation({
    mutationFn: createAdminUser,

    onSuccess: async (user) => {
      setFormOpen(false);
      setEditing(null);
      setFormError("");

      setNotice(`${fullName(user)} can now access Learners Admin.`);

      await refreshUsers();
    },

    onError: (error) => {
      setFormError(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;

      input: {
        firstName?: string;
        lastName?: string;
        username?: string;
        email?: string;
        password?: string;
        role?: "ADMIN" | "STAFF";
        isActive?: boolean;
      };
    }) => updateAdminUser(id, input),

    onSuccess: async (user) => {
      setFormOpen(false);
      setEditing(null);
      setFormError("");

      setNotice(`${fullName(user)} was updated.`);

      await refreshUsers();
    },

    onError: (error) => {
      setFormError(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,

    onSuccess: async () => {
      setNotice(
        deleting
          ? `${fullName(deleting)} was removed from Learners Admin.`
          : "User removed.",
      );

      setDeleting(null);

      await refreshUsers();
    },
  });

  const passwordMutation = useMutation({
    mutationFn: changeOwnPassword,

    onSuccess: () => {
      window.location.href = "/admin/login";
    },

    onError: (error) => {
      setPasswordError(error.message);
    },
  });

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    passwordMutation.isPending;

  const openCreate = () => {
    if (busy) return;

    setEditing(null);
    setFormError("");
    setNotice("");
    setFormOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    if (busy || user.role === "SUPER_ADMIN") {
      return;
    }

    setEditing(user);
    setFormError("");
    setNotice("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (busy) return;

    setFormOpen(false);
    setEditing(null);
    setFormError("");
  };

  const submitForm = (values: AdminFormValues) => {
    setFormError("");

    if (editing) {
      updateMutation.mutate({
        id: editing.id,

        input: {
          firstName: values.firstName,

          lastName: values.lastName,

          username: values.username,

          email: values.email,

          role: values.role,

          ...(values.password
            ? {
                password: values.password,
              }
            : {}),
        },
      });

      return;
    }

    createMutation.mutate(values as CreateAdminUserInput);
  };

  const toggleActive = (user: AdminUser) => {
    if (busy || user.role === "SUPER_ADMIN") {
      return;
    }

    setNotice("");

    updateMutation.mutate({
      id: user.id,

      input: {
        isActive: !user.isActive,
      },
    });
  };

  return (
    <div className="settings-admin">
      <header className="settings-header">
        <div>
          <span className="settings-eyebrow">Administration</span>

          <h1>Settings</h1>

          <p>Manage who can sign in and use Learners Admin.</p>
        </div>

        <div className="settings-header__actions">
          <button
            className="settings-button"
            type="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw size={18} aria-hidden="true" />
            Refresh
          </button>

          <button
            className="settings-button settings-button--primary"
            type="button"
            disabled={busy}
            onClick={openCreate}
          >
            <Plus size={19} aria-hidden="true" />
            Add user
          </button>
        </div>
      </header>

      <section className="settings-overview" aria-label="Access summary">
        <div className="settings-overview__item">
          <span className="settings-overview__icon">
            <Users size={24} aria-hidden="true" />
          </span>

          <div>
            <strong>{query.data ? users.length : "—"}</strong>

            <span>People with access</span>
          </div>
        </div>

        <div className="settings-overview__divider" />

        <div className="settings-overview__item">
          <span className="settings-overview__icon settings-overview__icon--green">
            <UserCheck size={24} aria-hidden="true" />
          </span>

          <div>
            <strong>{query.data ? activeUsers : "—"}</strong>

            <span>Active accounts</span>
          </div>
        </div>
      </section>

      {query.isError && (
        <div className="settings-notice settings-notice--error" role="alert">
          {query.error.message}
        </div>
      )}

      {notice && (
        <div className="settings-notice" role="status">
          <CircleCheck size={19} aria-hidden="true" />

          <span>{notice}</span>

          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {deleteMutation.isError && (
        <div className="settings-notice settings-notice--error" role="alert">
          {deleteMutation.error.message}
        </div>
      )}

      <section
        className="settings-access"
        aria-labelledby="settings-access-title"
      >
        <header className="settings-section-heading">
          <div>
            <h2 id="settings-access-title">People with access</h2>

            <p>These people can sign in to the administration area.</p>
          </div>
        </header>

        {query.isPending ? (
          <div className="settings-empty" role="status">
            <RefreshCw className="settings-spin" size={28} aria-hidden="true" />

            <strong>Loading users...</strong>
          </div>
        ) : (
          <div className="settings-user-list">
            {users.map((user) => {
              const protectedAccount = user.role === "SUPER_ADMIN";

              return (
                <article className="settings-user-card" key={user.id}>
                  <div className="settings-user-card__main">
                    <span
                      className={`settings-user-avatar${
                        protectedAccount ? " settings-user-avatar--super" : ""
                      }`}
                      aria-hidden="true"
                    >
                      {protectedAccount ? <Crown size={22} /> : initials(user)}
                    </span>

                    <div className="settings-user-info">
                      <div className="settings-user-info__title">
                        <h3>{fullName(user)}</h3>

                        <span
                          className={`settings-status ${
                            user.isActive
                              ? "settings-status--active"
                              : "settings-status--inactive"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <strong className="settings-user-role">
                        {roleLabel(user.role)}
                      </strong>

                      <div className="settings-user-details">
                        <span>{user.email}</span>

                        <span>
                          Username: <strong>{user.username}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="settings-user-card__actions">
                    {protectedAccount ? (
                      <div className="settings-super-actions">
                        <span className="settings-protected">
                          <ShieldCheck size={18} aria-hidden="true" />
                          Protected account
                        </span>

                        <button
                          className="settings-user-action settings-user-action--password"
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setPasswordError("");
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                            setPasswordOpen(true);
                          }}
                        >
                          <KeyRound size={17} aria-hidden="true" />
                          Change password
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="settings-user-action"
                          type="button"
                          disabled={busy}
                          onClick={() => openEdit(user)}
                        >
                          <Pencil size={17} aria-hidden="true" />
                          Edit details
                        </button>

                        <button
                          className={`settings-user-action ${
                            user.isActive
                              ? "settings-user-action--warning"
                              : "settings-user-action--success"
                          }`}
                          type="button"
                          disabled={busy}
                          onClick={() => toggleActive(user)}
                        >
                          {user.isActive ? (
                            <UserMinus size={17} aria-hidden="true" />
                          ) : (
                            <UserCheck size={17} aria-hidden="true" />
                          )}

                          {user.isActive ? "Disable access" : "Enable access"}
                        </button>

                        <button
                          className="settings-user-action settings-user-action--danger"
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setNotice("");

                            setDeleting(user);
                          }}
                        >
                          <Trash2 size={17} aria-hidden="true" />
                          Remove user
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {formOpen && (
        <div className="settings-editor-backdrop" role="presentation">
          <section
            className="settings-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-editor-title"
          >
            <header className="settings-editor__header">
              <div>
                <span className="settings-eyebrow">
                  {editing ? "Edit access" : "New user"}
                </span>

                <h2 id="settings-editor-title">
                  {editing ? `Edit ${fullName(editing)}` : "Add a user"}
                </h2>

                <p>
                  {editing
                    ? "Change this user's details or access level."
                    : "Create a login for someone who needs access to Learners Admin."}
                </p>
              </div>

              <button
                className="settings-editor__close"
                type="button"
                disabled={busy}
                aria-label="Close"
                onClick={closeForm}
              >
                <X size={21} aria-hidden="true" />
              </button>
            </header>

            <form className="settings-form" onSubmit={handleSubmit(submitForm)}>
              <div className="settings-form__section">
                <h3>Personal information</h3>

                <div className="settings-form__grid">
                  <label>
                    <span>First name</span>

                    <input
                      type="text"
                      autoComplete="given-name"
                      {...register("firstName", {
                        required: true,
                      })}
                    />
                  </label>

                  <label>
                    <span>Last name</span>

                    <input
                      type="text"
                      autoComplete="family-name"
                      {...register("lastName", {
                        required: true,
                      })}
                    />
                  </label>
                </div>
              </div>

              <div className="settings-form__section">
                <h3>Login information</h3>

                <div className="settings-form__grid">
                  <label>
                    <span>Username</span>

                    <input
                      type="text"
                      autoComplete="username"
                      {...register("username", {
                        required: true,
                        minLength: 3,
                      })}
                    />
                  </label>

                  <label>
                    <span>Email address</span>

                    <input
                      type="email"
                      autoComplete="email"
                      {...register("email", {
                        required: true,
                      })}
                    />
                  </label>
                </div>
              </div>

              <div className="settings-form__section">
                <h3>Access</h3>

                <div className="settings-form__grid">
                  <label>
                    <span>Access level</span>

                    <select
                      {...register("role", {
                        required: true,
                      })}
                    >
                      <option value="ADMIN">Administrator</option>

                      <option value="STAFF">Staff</option>
                    </select>

                    <small>
                      Administrators have more management permissions than
                      Staff.
                    </small>
                  </label>

                  <label>
                    <span>
                      <KeyRound size={16} aria-hidden="true" />

                      {editing ? "New password" : "Password"}
                    </span>

                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={
                        editing
                          ? "Leave blank to keep current password"
                          : "Minimum 8 characters"
                      }
                      {...register("password", {
                        required: !editing,
                        minLength: editing ? undefined : 8,
                      })}
                    />

                    {editing && (
                      <small>
                        Only enter a password if you want to change it.
                      </small>
                    )}
                  </label>
                </div>
              </div>

              {formError && (
                <div
                  className="settings-notice settings-notice--error"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              <footer className="settings-form__actions">
                <button
                  className="settings-button"
                  type="button"
                  disabled={busy}
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button
                  className="settings-button settings-button--primary"
                  type="submit"
                  disabled={busy}
                >
                  {editing ? "Save changes" : "Create user"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {passwordOpen && (
        <div className="settings-editor-backdrop" role="presentation">
          <section
            className="settings-confirm settings-password-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
          >
            <span className="settings-confirm__icon settings-password-dialog__icon">
              <KeyRound size={25} aria-hidden="true" />
            </span>

            <h2 id="change-password-title">Change password</h2>

            <p>
              Enter your current password, then choose a new password for the
              Super Admin account.
            </p>

            <div className="settings-password-form">
              <label>
                <span>Current password</span>

                <div className="settings-password-input">
                  <input
                    type={
                      showCurrentPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) =>
                      setCurrentPassword(
                        event.target.value,
                      )
                    }
                  />

                  <button
                    className="settings-password-toggle"
                    type="button"
                    aria-label={
                      showCurrentPassword
                        ? "Hide current password"
                        : "Show current password"
                    }
                    onClick={() =>
                      setShowCurrentPassword(
                        (value) => !value,
                      )
                    }
                  >
                    {showCurrentPassword ? (
                      <EyeOff
                        size={19}
                        aria-hidden="true"
                      />
                    ) : (
                      <Eye
                        size={19}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>
              </label>

              <label>
                <span>New password</span>

                <div className="settings-password-input">
                  <input
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(
                        event.target.value,
                      )
                    }
                  />

                  <button
                    className="settings-password-toggle"
                    type="button"
                    aria-label={
                      showNewPassword
                        ? "Hide new password"
                        : "Show new password"
                    }
                    onClick={() =>
                      setShowNewPassword(
                        (value) => !value,
                      )
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff
                        size={19}
                        aria-hidden="true"
                      />
                    ) : (
                      <Eye
                        size={19}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>

                <small>Use at least 8 characters.</small>
              </label>

              <label>
                <span>Confirm new password</span>

                <div className="settings-password-input">
                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                  />

                  <button
                    className="settings-password-toggle"
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmed password"
                        : "Show confirmed password"
                    }
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value,
                      )
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff
                        size={19}
                        aria-hidden="true"
                      />
                    ) : (
                      <Eye
                        size={19}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>
              </label>
            </div>

            {passwordError && (
              <div
                className="settings-notice settings-notice--error"
                role="alert"
              >
                {passwordError}
              </div>
            )}

            <div className="settings-confirm__actions">
              <button
                className="settings-button"
                type="button"
                disabled={passwordMutation.isPending}
                onClick={() => {
                  setPasswordOpen(false);
                  setPasswordError("");
                }}
              >
                Cancel
              </button>

              <button
                className="settings-button settings-button--primary"
                type="button"
                disabled={passwordMutation.isPending}
                onClick={() => {
                  setPasswordError("");

                  if (!currentPassword) {
                    setPasswordError("Please enter your current password.");

                    return;
                  }

                  if (newPassword.length < 8) {
                    setPasswordError(
                      "New password must contain at least 8 characters.",
                    );

                    return;
                  }

                  if (newPassword !== confirmPassword) {
                    setPasswordError("New passwords do not match.");

                    return;
                  }

                  if (currentPassword === newPassword) {
                    setPasswordError(
                      "New password must be different from your current password.",
                    );

                    return;
                  }

                  setPasswordConfirmOpen(true);
                }}
              >
                {passwordMutation.isPending ? "Changing..." : "Change password"}
              </button>
            </div>
          </section>
        </div>
      )}

      {passwordConfirmOpen && (
        <div
          className="settings-editor-backdrop"
          role="presentation"
        >
          <section
            className="settings-confirm settings-password-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-new-password-title"
          >
            <span
              className="settings-confirm__icon settings-password-confirm__icon"
            >
              <KeyRound
                size={25}
                aria-hidden="true"
              />
            </span>

            <h2 id="confirm-new-password-title">
              This is your new password
            </h2>

            <p>
              Please check it carefully before saving.
            </p>

            <div className="settings-password-preview">
              <span>
                New password
              </span>

              <strong>
                {newPassword}
              </strong>
            </div>

            <div
              className="settings-password-reminder"
              role="alert"
            >
              <strong>
                Do not forget this password.
              </strong>

              <span>
                You will need this password the next
                time you sign in to Learners Admin.
              </span>
            </div>

            <div className="settings-confirm__actions">
              <button
                className="settings-button"
                type="button"
                disabled={passwordMutation.isPending}
                onClick={() =>
                  setPasswordConfirmOpen(false)
                }
              >
                Go back
              </button>

              <button
                className="settings-button settings-button--primary"
                type="button"
                disabled={passwordMutation.isPending}
                onClick={() => {
                  passwordMutation.mutate({
                    currentPassword,
                    newPassword,
                  });
                }}
              >
                {passwordMutation.isPending
                  ? "Saving..."
                  : "Yes, save this password"}
              </button>
            </div>
          </section>
        </div>
      )}


      {deleting && (
        <div className="settings-editor-backdrop" role="presentation">
          <section
            className="settings-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
          >
            <span className="settings-confirm__icon">
              <Trash2 size={25} aria-hidden="true" />
            </span>

            <h2 id="delete-user-title">Remove this user?</h2>

            <p>
              <strong>{fullName(deleting)}</strong> will no longer be able to
              access Learners Admin.
            </p>

            <p className="settings-confirm__warning">
              This action cannot be undone.
            </p>

            <div className="settings-confirm__actions">
              <button
                className="settings-button"
                type="button"
                disabled={busy}
                onClick={() => setDeleting(null)}
              >
                Keep user
              </button>

              <button
                className="settings-delete-button"
                type="button"
                disabled={busy}
                onClick={() => deleteMutation.mutate(deleting.id)}
              >
                <Trash2 size={17} aria-hidden="true" />
                Remove user
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
