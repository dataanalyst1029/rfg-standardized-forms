import { useEffect, useMemo, useState } from "react";
import "./styles/AdminView.css";

const PAGE_SIZES = [5, 10, 20];

const emptyDepartment = {
  id: null,
  department_name: "",
  branch_id: "",
};

function ManageDepartments() {
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [form, setForm] = useState(emptyDepartment);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/departments");
      if (!response.ok) {
        throw new Error("Failed to fetch departments");
      }
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments", error);
      setStatus({ type: "error", message: "Could not load departments." });
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/branches");
      if (!response.ok) {
        throw new Error("Failed to fetch branches");
      }
      const data = await response.json();
      setBranches(data);
    } catch (error) {
      console.error("Error fetching branches", error);
      setStatus({ type: "error", message: "Unable to retrieve branches." });
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (!status) return undefined;
    const timeout = setTimeout(() => setStatus(null), 3500);
    return () => clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    setPage(1);
  }, [search, rowsPerPage]);

  const filteredDepartments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return departments;
    return departments.filter((dept) =>
      [dept.department_name, dept.branch_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [departments, search]);

  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / rowsPerPage) || 1);

  const visibleDepartments = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredDepartments.slice(start, start + rowsPerPage);
  }, [filteredDepartments, page, rowsPerPage]);

  const openCreateModal = () => {
    setForm(emptyDepartment);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (department) => {
    setForm({
      id: department.id,
      department_name: department.department_name || "",
      branch_id: department.branch_id || "",
    });
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyDepartment);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.department_name.trim() || !form.branch_id) {
      setStatus({
        type: "error",
        message: "Department name and branch are required.",
      });
      return;
    }

    const payload = {
      department_name: form.department_name.trim(),
      branch_id: Number(form.branch_id),
    };

    try {
      if (modalMode === "create") {
        const response = await fetch("http://localhost:5000/api/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to add department");
        }

        setDepartments((prev) => [...prev, result]);
        setStatus({ type: "success", message: "Department added successfully." });
      } else {
        const response = await fetch(
          `http://localhost:5000/api/departments/${form.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to update department");
        }

        setDepartments((prev) =>
          prev.map((dept) => (dept.id === result.id ? result : dept)),
        );
        setStatus({ type: "success", message: "Department details updated." });
      }

      closeModal();
    } catch (error) {
      console.error("Error saving department", error);
      setStatus({
        type: "error",
        message: error.message || "Unable to save department.",
      });
    }
  };

  const confirmDelete = (department) => setDeleteTarget(department);
  const cancelDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(
        `http://localhost:5000/api/departments/${deleteTarget.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("Failed to delete department");
      }

      setDepartments((prev) => prev.filter((dept) => dept.id !== deleteTarget.id));
      setStatus({ type: "success", message: "Department removed." });
    } catch (error) {
      console.error("Error deleting department", error);
      setStatus({ type: "error", message: "Unable to delete department." });
    } finally {
      cancelDelete();
    }
  };

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Departments</h2>
          <p>Align departments to the correct branch for routing and reporting.</p>
        </div>

        <div className="admin-toolbar-actions">
          <input
            type="search"
            className="admin-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search departments"
          />
          <button type="button" className="admin-primary-action" onClick={openCreateModal}>
            + Add department
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
              <th>Department</th>
              <th>Branch</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="admin-empty-state">
                  Loading departments...
                </td>
              </tr>
            ) : visibleDepartments.length === 0 ? (
              <tr>
                <td colSpan={3} className="admin-empty-state">
                  {search
                    ? "No departments match your search."
                    : "No departments yet. Set up your structure to start routing forms."}
                </td>
              </tr>
            ) : (
              visibleDepartments.map((department) => (
                <tr key={department.id}>
                  <td data-label="Department">{department.department_name}</td>
                  <td data-label="Branch">
                    {department.branch_name ? (
                      <span className="admin-badge">{department.branch_name}</span>
                    ) : (
                      <span className="admin-pagination-info">No branch assigned</span>
                    )}
                  </td>
                  <td data-label="Actions">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-row-btn"
                        onClick={() => openEditModal(department)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-row-btn admin-row-btn--danger"
                        onClick={() => confirmDelete(department)}
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
          Showing {visibleDepartments.length} of {filteredDepartments.length} departments
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

        <label className="admin-pagination-info" htmlFor="departmentRowsPerPage">
          Rows per page
          <select
            id="departmentRowsPerPage"
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
              <h2>{modalMode === "create" ? "Add department" : "Edit department"}</h2>
              <p className="admin-modal-subtext">
                Pair the department with a branch so approvals route to the right place.
              </p>
            </div>

            <form className="admin-modal-form" onSubmit={handleSubmit}>
              <input
                name="department_name"
                placeholder="Department name"
                value={form.department_name}
                onChange={handleFormChange}
                required
              />
              <select
                name="branch_id"
                value={form.branch_id}
                onChange={handleFormChange}
                required
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>

              <div className="admin-modal-footer">
                <button type="button" className="admin-ghost-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="admin-primary-btn">
                  {modalMode === "create" ? "Add department" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="admin-modal-backdrop" role="alertdialog" aria-modal="true">
          <div className="admin-modal-panel">
            <h2>Delete department</h2>
            <p className="admin-modal-subtext">
              You&apos;re about to remove{" "}
              <strong>{deleteTarget.department_name || "this department"}</strong>. Make sure forms
              are reassigned before proceeding.
            </p>
            <div className="admin-modal-footer">
              <button type="button" className="admin-ghost-btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button type="button" className="admin-danger-btn" onClick={handleDelete}>
                Delete department
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageDepartments;
