import { useEffect, useMemo, useState } from "react";
import "./styles/AdminView.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

const emptyLeaveType = {
  id: "",
  leave_type: "",
  leave_days: "",
};

function LeaveTypes() {
  const [leaveType, setLeaveType] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [form, setForm] = useState(emptyLeaveType);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchLeaveTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/leave_types`);
      if (!response.ok) throw new Error("Failed to fetch leave types");

      const data = await response.json();
      setLeaveType(data);
    } catch (error) {
      console.error("Error fetching leave types", error);
      setStatus({ type: "error", message: "Could not load leave type directory." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (!status) return;
    const timeout = setTimeout(() => setStatus(null), 3500);
    return () => clearTimeout(timeout);
  }, [status]);

  useEffect(() => setPage(1), [search, rowsPerPage]);

  const filteredLeaveTypes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leaveType;

    return leaveType.filter((item) =>
      [item.leave_type, item.leave_days?.toString()]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [leaveType, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLeaveTypes.length / rowsPerPage));

  const visibleLeaveType = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredLeaveTypes.slice(start, start + rowsPerPage);
  }, [filteredLeaveTypes, page, rowsPerPage]);

  const openCreateModal = () => {
    setForm(emptyLeaveType);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setForm({
      id: item.id,
      leave_type: item.leave_type,
      leave_days: item.leave_days,
    });
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyLeaveType);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.leave_type.trim() || !form.leave_days.trim()) {
      setStatus({ type: "error", message: "Leave type and leave days are required." });
      return;
    }

    const payload = {
      leave_type: form.leave_type.trim(),
      leave_days: Number(form.leave_days),
    };

    try {
      let response;

      if (modalMode === "create") {
        response = await fetch(`${API_BASE_URL}/api/leave_types`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/leave_types/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      if (modalMode === "create") {
        setLeaveType((prev) => [...prev, result]);
        setStatus({ type: "success", message: "Leave type added successfully." });
      } else {
        setLeaveType((prev) =>
          prev.map((item) => (item.id === result.id ? result : item))
        );
        setStatus({ type: "success", message: "Leave type updated successfully." });
      }

      closeModal();
    } catch (err) {
      console.error("Save error:", err);
      setStatus({ type: "error", message: err.message || "Unable to save leave type." });
    }
  };

  const confirmDelete = (item) => setDeleteTarget(item);
  const cancelDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/leave_types/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete leave type");

      setLeaveType((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setStatus({ type: "success", message: "Leave type removed successfully." });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Unable to delete leave type." });
    } finally {
      cancelDelete();
    }
  };

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Manage Leave Types</h2>
          <p>Configure and maintain all leave categories for your organization.</p>
        </div>

        <div className="admin-toolbar-actions">
          <input
            type="search"
            className="admin-search"
            placeholder="Search leave types"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="admin-primary-action" onClick={openCreateModal}>
            + Add Leave Type
          </button>
        </div>
      </div>

      {status && (
        <div className={`admin-status-banner ${
          status.type === "error"
            ? "admin-status-banner--error"
            : status.type === "success"
            ? "admin-status-banner--success"
            : ""
        }`}>
          {status.message}
        </div>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Leave Type</th>
              <th className="text-center">Days</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="admin-empty-state">Loading leave types...</td>
              </tr>
            ) : visibleLeaveType.length === 0 ? (
              <tr>
                <td colSpan={3} className="admin-empty-state">
                  {search ? "No matching leave types." : "No leave types available."}
                </td>
              </tr>
            ) : (
              visibleLeaveType.map((item) => (
                <tr key={item.id}>
                  <td>{item.leave_type}</td>
                  <td className="text-center">{item.leave_days}</td>
                  <td className="text-center">
                    <button className="admin-row-btn" onClick={() => openEditModal(item)}>Edit</button>
                    <button className="admin-row-btn admin-row-btn--danger" onClick={() => confirmDelete(item)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <span className="admin-pagination-info">
          Showing {visibleLeaveType.length} of {filteredLeaveTypes.length} leave types
        </span>

        <div className="admin-pagination-controls">
          <button
            className="admin-pagination-btn"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Prev
          </button>

          <span className="admin-pagination-info">Page {page} of {totalPages}</span>

          <button
            className="admin-pagination-btn"
            disabled={page === totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>

        <label className="admin-pagination-info">
          Rows per page
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

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-panel">
            <h2>{modalMode === "create" ? "Add Leave Type" : "Edit Leave Type"}</h2>
            <p className="admin-modal-subtext">
              Capture the leave type name and the number of days allowed.
            </p>

            <form className="admin-modal-form" onSubmit={handleSubmit}>
              <input
                name="leave_type"
                placeholder="Leave type (e.g. Sick Leave)"
                value={form.leave_type}
                onChange={handleFormChange}
                required
              />

              <input
                type="number"
                name="leave_days"
                placeholder="Number of days"
                value={form.leave_days}
                onChange={handleFormChange}
                required
              />

              <div className="admin-modal-footer">
                <button type="button" className="admin-ghost-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="admin-primary-btn">
                  {modalMode === "create" ? "Add Leave Type" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-panel">
            <h2>Remove Leave Type</h2>
            <p className="admin-modal-subtext">
              This will remove <strong>{deleteTarget.leave_type}</strong> from your list.
              Any policies or settings tied to it must be updated manually.
            </p>

            <div className="admin-modal-footer">
              <button className="admin-ghost-btn" onClick={cancelDelete}>Cancel</button>
              <button className="admin-danger-btn" onClick={handleDelete}>
                Delete Leave Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveTypes;
