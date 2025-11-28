import { useEffect, useMemo, useState } from "react";
import "./styles/AdminView.css";
import "./styles/ManageUsersAccess.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

const initialForm = {
  id: null,
  user_id: "",
  access_forms: "",
  role: "",
};

function ManageUsersAccess() {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [form, setForm] = useState(initialForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accessRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/user_access`),
        fetch(`${API_BASE_URL}/api/users`),
      ]);

      if (!accessRes.ok) {
        throw new Error("Failed to fetch user access records");
      }

      if (!usersRes.ok) {
        throw new Error("Failed to fetch users");
      }

      const accessData = await accessRes.json();
      const userData = await usersRes.json();
      setRecords(accessData);
      setUsers(userData);
    } catch (error) {
      console.error("Error loading access records", error);
      setStatus({ type: "error", message: error.message || "Unable to load data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!status) return undefined;
    const timeout = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    setPage(1);
  }, [search, rowsPerPage]);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((user) => {
      map.set(String(user.id), user);
    });
    return map;
  }, [users]);

  const mergedRecords = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        user: userMap.get(String(record.user_id)) || null,
      })),
    [records, userMap],
  );

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return mergedRecords;
    return mergedRecords.filter((record) => {
      const candidate = [
        record.user?.name,
        record.user?.email,
        record.access_forms,
        record.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return candidate.includes(term);
    });
  }, [mergedRecords, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage) || 1);

  const visibleRecords = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage]);

  const availableStaff = useMemo(
    () => users.filter((user) => user.role === "staff"),
    [users],
  );

  const openCreateModal = () => {
    setForm(initialForm);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setForm({
      id: record.id,
      user_id: String(record.user_id ?? ""),
      access_forms: record.access_forms || "",
      role: record.role || "",
    });
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(initialForm);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.user_id || !form.access_forms.trim() || !form.role) {
      setStatus({
        type: "error",
        message: "Please select a user, enter forms, and assign a role.",
      });
      return;
    }

    const payload = {
      user_id: Number(form.user_id),
      access_forms: form.access_forms.trim(),
      role: form.role,
    };

    try {
      if (modalMode === "create") {
        const res = await fetch(`${API_BASE_URL}/api/user_access`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.message || "Failed to assign access");
        }

        setRecords((prev) => [...prev, result]);
        setStatus({ type: "success", message: "Access assignment created." });
      } else {
        const res = await fetch(
          `${API_BASE_URL}/api/user_access/${form.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.message || "Failed to update access");
        }

        setRecords((prev) =>
          prev.map((record) => (record.id === result.id ? result : record)),
        );
        setStatus({ type: "success", message: "Access assignment updated." });
      }

      closeModal();
    } catch (error) {
      console.error("Error saving access record", error);
      setStatus({
        type: "error",
        message: error.message || "Unable to save access assignment.",
      });
    }
  };

  const confirmDelete = (record) => {
    setDeleteTarget(record);
  };

  const cancelDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/user_access/${deleteTarget.id}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        throw new Error("Failed to delete record");
      }

      setRecords((prev) => prev.filter((record) => record.id !== deleteTarget.id));
      setStatus({ type: "success", message: "Access assignment removed." });
    } catch (error) {
      console.error("Error deleting access record", error);
      setStatus({ type: "error", message: "Unable to delete access record." });
    } finally {
      cancelDelete();
    }
  };

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Form permissions</h2>
          <p>Configure which staff members can work on specific standardized forms.</p>
        </div>

        <div className="admin-toolbar-actions">
          <input
            type="search"
            className="admin-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search access records"
          />
          <button type="button" className="admin-primary-action" onClick={openCreateModal}>
            + Assign access
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
              <th>User</th>
              <th>Email</th>
              <th>Forms</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="admin-empty-state">
                  Loading access records...
                </td>
              </tr>
            ) : visibleRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty-state">
                  {search
                    ? "No access assignments match your search."
                    : "No assignments yet. Start by granting access to a staff member."}
                </td>
              </tr>
            ) : (
              visibleRecords.map((record) => {
                const forms = record.access_forms
                  ? record.access_forms.split(",").map((item) => item.trim()).filter(Boolean)
                  : [];
                return (
                  <tr key={record.id}>
                    <td data-label="User">
                      {record.user ? (
                        <div className="access-user">
                          <span className="access-user-name">{record.user.name}</span>
                          <span className="access-user-meta">{record.user.employee_id}</span>
                        </div>
                      ) : (
                        <span className="access-user-missing">User not found</span>
                      )}
                    </td>
                    <td data-label="Email">{record.user?.email || "—"}</td>
                    <td data-label="Forms">
                      {forms.length ? (
                        <div className="access-chip-group">
                          {forms.map((formName, index) => (
                            <span key={`${record.id}-${formName}-${index}`} className="access-chip">
                              {formName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="access-user-meta">No forms assigned</span>
                      )}
                    </td>
                    <td data-label="Role">
                      <span className="admin-badge access-role-badge">
                        {record.role || "Unassigned"}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-row-btn"
                          onClick={() => openEditModal(record)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-row-btn admin-row-btn--danger"
                          onClick={() => confirmDelete(record)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <span className="admin-pagination-info">
          Showing {visibleRecords.length} of {filteredRecords.length} assignments
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

        <label className="admin-pagination-info" htmlFor="accessRowsPerPage">
          Rows per page
          <select
            id="accessRowsPerPage"
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
              <h2>{modalMode === "create" ? "Assign access" : "Update access"}</h2>
              <p className="admin-modal-subtext">
                {modalMode === "create"
                  ? "Grant form permissions to a staff member."
                  : "Adjust forms or approval role for this staff member."}
              </p>
            </div>

            <form className="admin-modal-form" onSubmit={handleSubmit}>
              <select
                name="user_id"
                value={form.user_id}
                onChange={handleFormChange}
                required
                disabled={modalMode === "edit"}
              >
                <option value="" disabled>Select staff member</option>
                {availableStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} — {staff.email}
                  </option>
                ))}
              </select>

              <select 
                name="access_forms"
                value={form.access_forms}
                onChange={handleFormChange}
                placeholder="Access forms (comma separated)"
                required
                >
                  <option value="" disabled>Select access forms</option>
                  <option value="Purchase Request">Purchase Request</option>
                  <option value="Revolving Fund">Revolving Fund</option>
                  <option value="Cash Advance Request">Cash Advance Request</option>
                  <option value="Cash Advance Liquidation">Cash Advance Liquidation</option>
                  <option value="CA Receipt Form">CA Receipt Form</option>
                  <option value="Reimbursement Form">Reimbursement Form</option>
                  <option value="Payment Request Form">Payment Request Form</option>
                  <option value="Maintenance or Repair">Maintenance or Repair</option>
                  <option value="HR Overtime Approval">HR Overtime Approval</option>
                  <option value="HR Leave Application">HR Leave Application</option>
                  <option value="Interbranch Transfer Slip">Interbranch Transfer Slip</option>
                  <option value="Transmittal Form">Transmittal Form</option>
                  <option value="Credit Card Acknowledgement Receipt">Credit Card Acknowledgement Receipt</option>
                </select>
              {/* <textarea
                name="access_forms"
                value={form.access_forms}
                onChange={handleFormChange}
                placeholder="Access forms (comma separated)"
                rows={3}
                required
              /> */}

              <select name="role" value={form.role} onChange={handleFormChange} required>
                <option value="">Select role</option>
                <option value="Approve">Approve</option>
                <option value="Receive">Receive</option>
                <option value="Prepare">Prepare</option>
                <option value="Endorse">Endorse</option>
                <option value="HR Approve">HR Approve</option>
                <option value="Accomplish">Accomplish</option>
                <option value="Accounting">Accounting</option>
              </select>

              <div className="admin-modal-footer">
                <button type="button" className="admin-ghost-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="admin-primary-btn">
                  {modalMode === "create" ? "Assign access" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="admin-modal-backdrop" role="alertdialog" aria-modal="true">
          <div className="admin-modal-panel">
            <h2>Remove access</h2>
            <p className="admin-modal-subtext">
              You&apos;re about to revoke permissions for{" "}
              <strong>{deleteTarget.user?.name || "this user"}</strong>. This action cannot be
              undone.
            </p>
            <div className="admin-modal-footer">
              <button type="button" className="admin-ghost-btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button type="button" className="admin-danger-btn" onClick={handleDelete}>
                Delete assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsersAccess;
