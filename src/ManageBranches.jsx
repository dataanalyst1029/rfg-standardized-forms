import { useEffect, useMemo, useState } from "react";
import "./styles/AdminView.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

const emptyBranch = {
  id: null,
  branch_name: "",
  branch_code: "",
  location: "",
  address: "",
};

function ManageBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [isDeleteClosing, setIsDeleteClosing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  const [form, setForm] = useState(emptyBranch);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/branches`);
      if (!response.ok) {
        throw new Error("Failed to fetch branches");
      }
      const data = await response.json();
      setBranches(data);
    } catch (error) {
      console.error("Error fetching branches", error);
      setStatus({ type: "error", message: "Could not load branch directory." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const filteredBranches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return branches;
    return branches.filter((branch) =>
      [branch.branch_name, branch.branch_code, branch.location, branch.address]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [branches, search]);

  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / rowsPerPage) || 1);

  const visibleBranches = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredBranches.slice(start, start + rowsPerPage);
  }, [filteredBranches, page, rowsPerPage]);

  const openCreateModal = () => {
    setForm(emptyBranch);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (branch) => {
    setForm({
      id: branch.id,
      branch_name: branch.branch_name || "",
      branch_code: branch.branch_code || "",
      location: branch.location || "",
      address: branch.address || "",
    });
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setIsClosing(true);

    setTimeout(() => {
      setModalOpen(false);
      setIsClosing(false);
      setForm(emptyBranch);
    }, 200);
  };


  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.branch_name.trim() || !form.branch_code.trim()) {
      setStatus({ type: "error", message: "Branch name and code are required." });
      return;
    }

    const payload = {
      branch_name: form.branch_name.trim(),
      branch_code: form.branch_code.trim(),
      location: form.location.trim() || null,
      address: form.address.trim() || null,
    };

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        const response = await fetch(`${API_BASE_URL}/api/branches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to create branch");

        setBranches((prev) => [...prev, result]);
        setStatus({ type: "success", message: "Branch added successfully." });
      } else {
        const response = await fetch(`${API_BASE_URL}/api/branches/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to update branch");

        setBranches((prev) => prev.map((b) => (b.id === result.id ? result : b)));
        setStatus({ type: "success", message: "Branch details updated." });
      }

      closeModal();
    } catch (error) {
      console.error("Error saving branch", error);
      setStatus({ type: "error", message: error.message || "Unable to save branch information." });
    } finally {
      setIsSubmitting(false);
    }
  };


  const confirmDelete = (branch) => setDeleteTarget(branch);
  const cancelDelete = () => {
    setIsDeleteClosing(true);

    setTimeout(() => {
      setDeleteTarget(null);
      setIsDeleteClosing(false);
      setIsDeleting(false);
    }, 200);
  };


  const handleDelete = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/branches/${deleteTarget.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) throw new Error("Failed to delete branch");

      setBranches((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setStatus({ type: "success", message: "Branch removed from directory." });
    } catch (error) {
      console.error("Error deleting branch", error);
      setStatus({ type: "error", message: "Unable to delete branch." });
    } finally {
      setIsDeleting(false);
      cancelDelete();
    }
  };

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Branch directory</h2>
          <p>Track every site and ensure location information stays current.</p>
        </div>

        <div className="admin-toolbar-actions">
          <input
            type="search"
            className="admin-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search branches"
          />
          <button type="button" className="admin-primary-action" onClick={openCreateModal}>
            + Add branch
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
              <th>Branch name</th>
              <th>Code</th>
              <th>Location</th>
              <th>Address</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="admin-empty-state">
                  Loading branches...
                </td>
              </tr>
            ) : visibleBranches.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-empty-state">
                  {search
                    ? "No branches match your search."
                    : "No branches on file. Add your first location to get started."}
                </td>
              </tr>
            ) : (
              visibleBranches.map((branch) => (
                <tr key={branch.id}>
                  <td data-label="Branch name">{branch.branch_name}</td>
                  <td data-label="Code">
                    <span className="admin-badge">{branch.branch_code}</span>
                  </td>
                  <td data-label="Location">
                    {branch.location ? (
                      <span>{branch.location}</span>
                    ) : (
                      <span className="admin-pagination-info">No location on file</span>
                    )}
                  </td>
                  <td data-label="Address">
                    {branch.address ? (
                      <span>{branch.address}</span>
                    ) : (
                      <span className="admin-pagination-info">No address</span>
                    )}
                  </td>
                  <td data-label="Actions">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-row-btn"
                        onClick={() => openEditModal(branch)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-row-btn admin-row-btn--danger"
                        onClick={() => confirmDelete(branch)}
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
          Showing {visibleBranches.length} of {filteredBranches.length} branches
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

        <label className="admin-pagination-info" htmlFor="branchRowsPerPage">
          Rows per page
          <select
            id="branchRowsPerPage"
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
        <div className={`admin-modal-backdrop ${isClosing ? "is-closing" : ""}`} role="dialog" aria-modal="true">
          <div className={`admin-modal-panel-users ${isClosing ? "is-closing" : ""}`}>
            <div>
              <h2>{modalMode === "create" ? "Add branch" : "Edit branch"}</h2>
              <br></br>
              <p className="admin-modal-subtext">
                Capture the branch name, code, and where the team is located.
              </p>
            </div>

            <form className="admin-modal-form" onSubmit={handleSubmit}>
              <input
                name="branch_name"
                placeholder="Branch name"
                value={form.branch_name}
                onChange={handleFormChange}
                required
              />
              <input
                name="branch_code"
                placeholder="Code (e.g., NCR-01)"
                value={form.branch_code}
                onChange={handleFormChange}
                required
              />
              <input
                name="location"
                placeholder="Location"
                value={form.location}
                onChange={handleFormChange}
              />

              <input
                name="address"
                placeholder="Address"
                value={form.address}
                onChange={handleFormChange}
              />

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-ghost-btn"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-primary-btn"
                  disabled={isSubmitting}
                >
                  {modalMode === "create"
                    ? (isSubmitting ? "Adding" : "Add branch")
                    : (isSubmitting ? "Saving" : "Save changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className={`admin-modal-backdrop ${isDeleteClosing ? "is-closing" : ""}`}
          role="alertdialog"
          aria-modal="true"
        >
          <div className={`admin-modal-panel-users ${isDeleteClosing ? "is-closing" : ""}`}>
            <h2>Remove branch</h2>
            <p className="admin-modal-subtext">
              This will delete <strong>{deleteTarget.branch_name || "this branch"}</strong> from your directory.
              Any departments tied to it must be reassigned manually.
            </p>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-ghost-btn"
                onClick={cancelDelete}
                disabled={isDeleteClosing || isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-danger-btn"
                onClick={handleDelete}
                disabled={isDeleteClosing || isDeleting}
              >
                {isDeleting ? "Deleting" : "Delete branch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageBranches;
