import { useEffect, useMemo, useState } from "react";
import "./styles/AdminView.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

const emptyLeave = {
  id: "",
  user_id: "",
  leave_type: "",
  leave_days: "",
};

function ManageLeave() {
  const [usersLeave, setUsersLeave] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [form, setForm] = useState(emptyLeave);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchUserLeave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user_leaves`);
      const data = await response.json();
      setUsersLeave(data);
    } catch {
      setStatus({ type: "error", message: "Failed to load leave records." });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);
      const data = await response.json();
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leave_types`);
      const data = await response.json();
      setLeaveTypes(data);
    } catch {
      setLeaveTypes([]);
    }
  };

  useEffect(() => {
    fetchUserLeave();
    fetchUsers();
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 3500);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => setPage(1), [search, rowsPerPage]);

  const getUserName = (id) => {
    const user = users.find((u) => u.id === id);
    return user ? user.name : `User #${id}`;
  };

  /** SEARCH + SORT BY NAME ASC */
  const filteredUsersLeave = useMemo(() => {
    const term = search.toLowerCase();

    const enriched = usersLeave.map((item) => ({
      ...item,
      userName: getUserName(item.user_id),
    }));

    const searched = enriched.filter((item) => {
      const u = item.userName.toLowerCase();

      return (
        u.includes(term) ||
        item.leave_type.toLowerCase().includes(term) ||
        item.leave_days.toString().includes(term) ||
        item.user_id.toString().includes(term)
      );
    });

    /** SORT HERE (ASC by username) */
    return searched.sort((a, b) => a.userName.localeCompare(b.userName));
  }, [usersLeave, users, search]);

  const totalPages =
    Math.ceil(filteredUsersLeave.length / rowsPerPage) || 1;

  const visibleUsersLeave = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredUsersLeave.slice(start, start + rowsPerPage);
  }, [filteredUsersLeave, page, rowsPerPage]);

  const openCreateModal = () => {
    setForm(emptyLeave);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setForm(item);
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setForm(emptyLeave);
    setModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.user_id || !form.leave_type) {
      setStatus({ type: "error", message: "All fields are required." });
      return;
    }

    const payload = {
      user_id: Number(form.user_id),
      leave_type: form.leave_type,
      leave_days: Number(form.leave_days),
    };

    try {
      let response;

      if (modalMode === "create") {
        response = await fetch(`${API_BASE_URL}/api/user_leaves`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/user_leaves/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      if (modalMode === "create") {
        setUsersLeave((prev) => [...prev, result]);
        setStatus({ type: "success", message: "Leave added successfully." });
      } else {
        setUsersLeave((prev) =>
          prev.map((i) => (i.id === result.id ? result : i))
        );
        setStatus({ type: "success", message: "Leave updated successfully." });
      }

      closeModal();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/user_leaves/${deleteTarget.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Delete failed");

      setUsersLeave((prev) =>
        prev.filter((i) => i.id !== deleteTarget.id)
      );
      setStatus({ type: "success", message: "Leave deleted." });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="admin-view">

      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Manage User Leave Allocations</h2>
          <p>Assign leave days per user, based on leave type.</p>
        </div>

        <div className="admin-toolbar-actions">
          <input
            type="search"
            value={search}
            className="admin-search"
            placeholder="Search by name, type, ID, or days"
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="admin-primary-action" onClick={openCreateModal}>
            + Add User Leave
          </button>
        </div>
      </div>

      {status && (
        <div className={`admin-status-banner admin-status-banner--${status.type}`}>
          {status.message}
        </div>
      )}

      {/* ---------------------- TABLE ---------------------- */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Leave Type</th>
              <th>Days</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={4}>Loading...</td></tr>
            ) : visibleUsersLeave.length === 0 ? (
              <tr><td colSpan={4}>No records found.</td></tr>
            ) : (
              visibleUsersLeave.map((item) => (
                <tr key={item.id}>
                  <td>{item.userName}</td>
                  <td>{item.leave_type}</td>
                  <td>{item.leave_days}</td>
                  <td className="text-center">
                    <button className="admin-row-btn" onClick={() => openEditModal(item)}>Edit</button>
                    <button
                      className="admin-row-btn admin-row-btn--danger"
                      onClick={() => setDeleteTarget(item)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------------- PAGINATION ---------------------- */}
      <div className="admin-pagination">

        <span className="admin-pagination-info">
          Showing {visibleUsersLeave.length} of {filteredUsersLeave.length}
        </span>

        <div className="admin-pagination-controls">
          <button
            className="admin-pagination-btn"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>

          <span className="admin-pagination-info">
            Page {page} of {totalPages}
          </span>

          <button
            className="admin-pagination-btn"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>

        <label className="admin-pagination-info">
          Rows per page:
          <select
            className="admin-rows-select"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>

      {/* ---------------------- MODAL ---------------------- */}
      {modalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-panel">

            <h2>{modalMode === "create" ? "Add User Leave" : "Edit User Leave"}</h2>

            <form onSubmit={handleSubmit} className="admin-modal-form">

              <select
                name="user_id"
                value={form.user_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, user_id: e.target.value }))
                }
                required
              >
                <option value="">-- Select User --</option>
                {users
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (ID: {u.id})
                    </option>
                  ))}
              </select>

              <select
                name="leave_type"
                value={form.leave_type}
                onChange={(e) => {
                  const selected = leaveTypes.find(
                    (lt) => lt.leave_type === e.target.value
                  );

                  if (!selected) {
                    setForm((prev) => ({
                      ...prev,
                      leave_type: e.target.value,
                    }));
                    return;
                  }

                  setForm((prev) => ({
                    ...prev,
                    leave_type: selected.leave_type,
                    leave_days: selected.leave_days,
                  }));
                }}
                required
              >
                <option value="">-- Select Leave Type --</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.leave_type}>
                    {lt.leave_type} ({lt.leave_days} days)
                  </option>
                ))}
              </select>

              <input
                type="number"
                name="leave_days"
                value={form.leave_days}
                readOnly
              />

              <div className="admin-modal-footer">
                <button type="button" onClick={closeModal}>Cancel</button>
                <button type="submit">
                  {modalMode === "create" ? "Add Leave" : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-panel">
            <h2>Delete Leave?</h2>
            <p>
              Remove <strong>{deleteTarget.leave_type}</strong> for{" "}
              <strong>{getUserName(deleteTarget.user_id)}</strong>?
            </p>

            <div className="admin-modal-footer">
              <button onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="admin-danger-btn" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ManageLeave;
