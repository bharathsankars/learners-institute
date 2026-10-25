import {
  CircleCheck,
  Crown,
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
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

  const admins = users.filter((user) => user.role === "ADMIN");

  const activeAdmins = admins.filter((user) => user.isActive).length;

  const inactiveAdmins = admins.length - activeAdmins;

  const superAdmin = users.find((user) => user.role === "SUPER_ADMIN");

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

      setNotice(`${fullName(user)} was added as an administrator.`);

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
          ? `${fullName(deleting)} was deleted.`
          : "Administrator deleted.",
      );

      setDeleting(null);

      await refreshUsers();
    },
  });

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const openCreate = () => {
    if (busy) return;

    setEditing(null);
    setFormError("");
    setNotice("");
    setFormOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    if (busy || user.role !== "ADMIN") {
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
    if (busy || user.role !== "ADMIN") {
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
    <div className="admin-directory settings-admin">
      <header className="admin-directory-heading">
        <div>
          <span className="admin-directory-eyebrow">System administration</span>

          <h1>Settings</h1>

          <p>
            Manage administrator access. Only the Super Admin can create, modify
            or remove administrator accounts.
          </p>
        </div>

        <div className="admin-directory-heading__actions">
          <button
            className="admin-directory-button"
            type="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            Refresh
          </button>

          <button
            className="admin-directory-button admin-directory-button--primary"
            type="button"
            disabled={busy}
            onClick={openCreate}
          >
            <Plus size={16} aria-hidden="true" />
            Add administrator
          </button>
        </div>
      </header>

      <section
        className="admin-directory-summary"
        aria-label="Administrator overview"
      >
        <div className="admin-directory-summary-card">
          <div>
            <span>Administrators</span>

            <span className="admin-directory-summary-icon">
              <Users size={18} aria-hidden="true" />
            </span>
          </div>

          <strong>{query.data ? admins.length : "—"}</strong>

          <small>Admin accounts</small>
        </div>

        <div className="admin-directory-summary-card admin-directory-summary-card--green">
          <div>
            <span>Active</span>

            <span className="admin-directory-summary-icon">
              <UserCheck size={18} aria-hidden="true" />
            </span>
          </div>

          <strong>{query.data ? activeAdmins : "—"}</strong>

          <small>Can currently sign in</small>
        </div>

        <div className="admin-directory-summary-card admin-directory-summary-card--amber">
          <div>
            <span>Inactive</span>

            <span className="admin-directory-summary-icon">
              <UserMinus size={18} aria-hidden="true" />
            </span>
          </div>

          <strong>{query.data ? inactiveAdmins : "—"}</strong>

          <small>Access disabled</small>
        </div>

        <div className="admin-directory-summary-card admin-directory-summary-card--slate">
          <div>
            <span>Super Admin</span>

            <span className="admin-directory-summary-icon">
              <Crown size={18} aria-hidden="true" />
            </span>
          </div>

          <strong>{superAdmin ? "1" : "—"}</strong>

          <small>Protected supreme account</small>
        </div>
      </section>

      {query.isError && (
        <div
          className="admin-directory-notice admin-directory-notice--error"
          role="alert"
        >
          {query.error.message}
        </div>
      )}

      {notice && (
        <div className="admin-directory-notice" role="status">
          <CircleCheck size={17} aria-hidden="true" />

          <span>{notice}</span>

          <button
            type="button"
            aria-label="Dismiss confirmation"
            onClick={() => setNotice("")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {deleteMutation.isError && (
        <div
          className="admin-directory-notice admin-directory-notice--error"
          role="alert"
        >
          {deleteMutation.error.message}
        </div>
      )}

      <section
        className="admin-directory-register"
        aria-label="Administrator accounts"
      >
        <div className="admin-directory-register__heading">
          <div>
            <h2>Administrator accounts</h2>

            <p>
              Super Admin is protected. Admin accounts can be managed below.
            </p>
          </div>
        </div>

        {query.isPending ? (
          <div className="admin-directory-empty" role="status">
            <ShieldCheck size={28} aria-hidden="true" />

            <h3>Loading administrators…</h3>
          </div>
        ) : (
          <div className="admin-directory-table-scroll">
            <table className="admin-directory-table settings-admin__table">
              <thead>
                <tr>
                  <th>Administrator</th>

                  <th>Account</th>

                  <th>Role</th>

                  <th>Status</th>

                  <th>Added</th>

                  <th>
                    <span className="admin-directory-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const protectedAccount = user.role === "SUPER_ADMIN";

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="admin-directory-identity">
                          <span
                            className={`admin-directory-avatar${
                              protectedAccount
                                ? " settings-admin__avatar--super"
                                : ""
                            }`}
                            aria-hidden="true"
                          >
                            {protectedAccount ? (
                              <Crown size={16} />
                            ) : (
                              user.firstName.slice(0, 1).toUpperCase()
                            )}
                          </span>

                          <div>
                            <strong className="settings-admin__name">
                              {fullName(user)}
                            </strong>

                            <span>{user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong className="settings-admin__username">
                          {user.username}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`settings-admin__role ${
                            protectedAccount
                              ? "settings-admin__role--super"
                              : ""
                          }`}
                        >
                          {protectedAccount ? "Super Admin" : "Admin"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`admin-directory-badge admin-directory-badge--${
                            user.isActive ? "active" : "inactive"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <time dateTime={user.createdAt}>
                          {formatDate(user.createdAt)}
                        </time>
                      </td>

                      <td>
                        {protectedAccount ? (
                          <span className="settings-admin__protected">
                            <ShieldCheck size={14} aria-hidden="true" />
                            Protected
                          </span>
                        ) : (
                          <div className="admin-directory-row-actions">
                            <button
                              className="admin-directory-icon-button"
                              type="button"
                              disabled={busy}
                              aria-label={`Edit ${fullName(user)}`}
                              onClick={() => openEdit(user)}
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              className="settings-admin__status-button"
                              type="button"
                              disabled={busy}
                              onClick={() => toggleActive(user)}
                            >
                              {user.isActive ? "Deactivate" : "Activate"}
                            </button>

                            <button
                              className="admin-directory-icon-button admin-directory-icon-button--delete"
                              type="button"
                              disabled={busy}
                              aria-label={`Delete ${fullName(user)}`}
                              onClick={() => {
                                setNotice("");

                                setDeleting(user);
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && (
        <section
          className="settings-admin__editor"
          aria-label={editing ? "Edit administrator" : "Add administrator"}
        >
          <header className="settings-admin__editor-header">
            <div>
              <span className="admin-directory-eyebrow">
                {editing ? "Edit access" : "New access"}
              </span>

              <h2>
                {editing ? `Edit ${fullName(editing)}` : "Add administrator"}
              </h2>

              <p>
                {editing
                  ? "Update administrator details. Leave the password empty to keep the existing password."
                  : "Create a new Admin account. Super Admin access cannot be created here."}
              </p>
            </div>

            <button
              type="button"
              className="settings-admin__close"
              disabled={busy}
              aria-label="Close administrator form"
              onClick={closeForm}
            >
              <X size={19} />
            </button>
          </header>

          <form
            className="settings-admin__form"
            onSubmit={handleSubmit(submitForm)}
          >
            <div className="settings-admin__form-grid">
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
                <span>Email</span>

                <input
                  type="email"
                  autoComplete="email"
                  {...register("email", {
                    required: true,
                  })}
                />
              </label>

              <label>
                <span>Account role</span>

                <select
                  {...register("role", {
                    required: true,
                  })}
                >
                  <option value="ADMIN">Admin</option>

                  <option value="STAFF">Staff</option>
                </select>
              </label>

              <label className="settings-admin__password">
                <span>
                  <KeyRound size={14} aria-hidden="true" />

                  {editing ? "New password" : "Password"}
                </span>

                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={
                    editing
                      ? "Leave empty to keep current password"
                      : "Minimum 8 characters"
                  }
                  {...register("password", {
                    required: !editing,

                    minLength: editing ? undefined : 8,
                  })}
                />

                {editing && <small></small>}
              </label>
            </div>

            {formError && (
              <div
                className="admin-directory-notice admin-directory-notice--error"
                role="alert"
              >
                {formError}
              </div>
            )}

            <footer className="settings-admin__form-actions">
              <button
                className="admin-directory-button"
                type="button"
                disabled={busy}
                onClick={closeForm}
              >
                Cancel
              </button>

              <button
                className="admin-directory-button admin-directory-button--primary"
                type="submit"
                disabled={busy}
              >
                {editing ? "Save changes" : "Create administrator"}
              </button>
            </footer>
          </form>
        </section>
      )}

      {deleting && (
        <div className="settings-admin__confirm-backdrop" role="presentation">
          <section
            className="settings-admin__confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-admin-title"
          >
            <span className="settings-admin__confirm-icon">
              <Trash2 size={22} aria-hidden="true" />
            </span>

            <h2 id="delete-admin-title">Delete administrator?</h2>

            <p>
              <strong>{fullName(deleting)}</strong> will permanently lose
              administrator access. This cannot be undone.
            </p>

            {deleteMutation.isError && (
              <div
                className="admin-directory-notice admin-directory-notice--error"
                role="alert"
              >
                {deleteMutation.error.message}
              </div>
            )}

            <div className="settings-admin__confirm-actions">
              <button
                className="admin-directory-button"
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (!deleteMutation.isPending) {
                    setDeleting(null);

                    deleteMutation.reset();
                  }
                }}
              >
                Cancel
              </button>

              <button
                className="settings-admin__delete-button"
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleting.id)}
              >
                <Trash2 size={15} aria-hidden="true" />

                {deleteMutation.isPending
                  ? "Deleting…"
                  : "Delete administrator"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
