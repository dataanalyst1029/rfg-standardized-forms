import { useEffect, useMemo, useState } from "react";
import "./styles/AdminView.css";
import "./ManageUsers.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

const emptyForm = {
  id: null,
  employee_id: "",
  name: "",
  email: "",
  role: "",
  password: "",
};

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [status, setStatus] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");

  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users", error);
      setStatus({ type: "error", message: "Failed to load users." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!status) return undefined;
    const timeout = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    setPage(1);
  }, [search, rowsPerPage]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      ["employee_id", "name", "email", "role"].some((key) =>
        user[key]?.toLowerCase().includes(term),
      ),
    );
  }, [users, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / rowsPerPage) || 1,
  );

  const visibleUsers = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);

  const openCreateModal = () => {
    setForm(emptyForm);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setForm({ ...user, password: "" });
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.employee_id ||
      !form.name ||
      !form.email ||
      !form.role ||
      (modalMode === "create" && !form.password)
    ) {
      setStatus({ type: "error", message: "Please fill in all required fields." });
      return;
    }

    try {
      if (modalMode === "create") {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || "Failed to add user");
        }

        setUsers((prev) => [...prev, payload]);
        setStatus({ type: "success", message: "User created successfully." });
      } else {
        const payload = { ...form };
        if (!payload.password) {
          delete payload.password;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/users/${form.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        const updated = await response.json();
        if (!response.ok) {
          throw new Error(updated.message || "Failed to update user");
        }

        setUsers((prev) =>
          prev.map((user) => (user.id === updated.id ? updated : user)),
        );
        setStatus({ type: "success", message: "User updated successfully." });
      }

      closeModal();
    } catch (error) {
      console.error("Error saving user", error);
      setStatus({
        type: "error",
        message: error.message || "Unable to save user.",
      });
    }
  };

  const confirmDelete = (user) => {
    setDeleteTarget(user);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/${deleteTarget.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      setUsers((prev) =>
        prev.filter((user) => user.id !== deleteTarget.id),
      );
      setStatus({ type: "success", message: "User deleted successfully." });
    } catch (error) {
      console.error("Error deleting user", error);
      setStatus({ type: "error", message: "Failed to delete user." });
    } finally {
      cancelDelete();
    }
  };

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Directory</h2>
          <p>Manage the people who can access standardized forms.</p>
        </div>

        <div className="admin-toolbar-actions">
          <input
            type="search"
            className="admin-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users"
          />
          <button type="button" className="admin-primary-action" onClick={openCreateModal}>
            + Invite user
          </button>
        </div>
      </div>

      {status && (
        <div
          className={`admin-status-banner${
            status.type === "error"
              ? " admin-status-banner--error"
              : status.type === "info"
                ? " admin-status-banner--info"
                : ""
          }`}
        >
          {status.message}
        </div>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="admin-empty-state">
                  Loading users...
                </td>
              </tr>
            ) : visibleUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty-state">
                  {search
                    ? "No users match your search."
                    : "No users yet. Invite someone from your team."}
                </td>
              </tr>
            ) : (
              visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td data-label="Employee ID">{user.employee_id}</td>
                  <td data-label="Name">{user.name}</td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Role">
                    <span className="admin-badge user-role-badge">
                      {user.role ? user.role.toUpperCase() : "N/A"}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-row-btn"
                        onClick={() => openEditModal(user)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-row-btn admin-row-btn--danger"
                        onClick={() => confirmDelete(user)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <span className="admin-pagination-info">
          Showing {visibleUsers.length} of {filteredUsers.length} users
        </span>

        <div className="admin-pagination-controls">
          <button
            type="button"
            className="admin-pagination-btn"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="admin-pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="admin-pagination-btn"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>

        <label className="admin-pagination-info" htmlFor="rowsPerPage">
          Rows per page
          <select
            id="rowsPerPage"
            className="admin-rows-select"
            value={rowsPerPage}
            onChange={(event) => setRowsPerPage(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      {modalOpen && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal-panel">
            <div>
              <h2>{modalMode === "create" ? "Invite user" : "Edit user"}</h2>
              <p className="admin-modal-subtext">
                {modalMode === "create"
                  ? "New teammates receive access immediately. You can update their role anytime."
                  : "Adjust details and roles. Leave the password blank to keep the current value."}
              </p>
            </div>

            <form className="admin-modal-form" onSubmit={handleSubmit}>
              <input
                name="employee_id"
                placeholder="Employee ID"
                value={form.employee_id}
                onChange={handleFormChange}
                required
              />
              <input
                name="name"
                placeholder="Full name"
                value={form.name}
                onChange={handleFormChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Work email"
                value={form.email}
                onChange={handleFormChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder={
                  modalMode === "create"
                    ? "Temporary password"
                    : "New password (leave blank to keep)"
                }
                value={form.password}
                onChange={handleFormChange}
                required={modalMode === "create"}
              />
              <select
                name="role"
                value={form.role}
                onChange={handleFormChange}
                required
              >
                <option value="" disabled>
                  Select role
                </option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="user">User</option>
              </select>

              <div className="admin-modal-footer">
                <button type="button" className="admin-ghost-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="admin-primary-btn">
                  {modalMode === "create" ? "Invite user" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="admin-modal-backdrop" role="alertdialog" aria-modal="true">
          <div className="admin-modal-panel">
            <h2>Remove user</h2>
            <p className="admin-modal-subtext">
              You&apos;re about to remove{" "}
              <strong>{deleteTarget.name}</strong> from the workspace. This
              action cannot be undone.
            </p>
            <div className="admin-modal-footer">
              <button type="button" className="admin-ghost-btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button type="button" className="admin-danger-btn" onClick={handleDelete}>
                Delete user
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;
