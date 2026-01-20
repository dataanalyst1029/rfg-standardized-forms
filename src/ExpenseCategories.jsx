import { useEffect, useMemo, useState } from "react";
import "./styles/AdminView.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

const emptyExpenseCategory = {
  id: "",
  name: "",
  description: "",
  expense_account: "",
};

function ExpenseCategories() {
  const [expenseCategory, setExpenseCategory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [isDeleteClosing, setIsDeleteClosing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState(emptyExpenseCategory);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchLeaveTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/expense_category`);
      if (!response.ok) throw new Error("Failed to fetch expense category");

      const data = await response.json();
      setExpenseCategory(data);
    } catch (error) {
      console.error("Error fetching expense category", error);
      setStatus({ type: "error", message: "Could not load expense category directory." });
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

  const filteredExpenseCategory = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return expenseCategory;

    return expenseCategory.filter(item =>
        `${item.name} ${item.description} ${item.expense_account}`
        .toLowerCase()
        .includes(term.toLowerCase())
    );

  }, [expenseCategory, search]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenseCategory.length / rowsPerPage));

  const visibleLeaveType = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredExpenseCategory.slice(start, start + rowsPerPage);
  }, [filteredExpenseCategory, page, rowsPerPage]);

  const openCreateModal = () => {
    setForm(emptyExpenseCategory);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description,
      expense_account: item.expense_account,
    });
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setIsClosing(true);

    setTimeout(() => {
      setModalOpen(false);
      setIsClosing(false);
      setForm(emptyExpenseCategory);
    }, 200);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setStatus({ type: "error", message: "expense category is required." });
      return;
    }

    const payload = {
        name: form.name.trim(),
        description: (form.description ?? "").trim(),
        expense_account: form.expense_account.trim(),
    };

    setIsSubmitting(true);
    try {
      const response =
        modalMode === "create"
          ? await fetch(`${API_BASE_URL}/api/expense_category`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`${API_BASE_URL}/api/expense_category/${form.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save expense category.");

      if (modalMode === "create") {
        setExpenseCategory((prev) => [...prev, result]);
        setStatus({ type: "success", message: "expense category added successfully." });
      } else {
        setExpenseCategory((prev) => prev.map((item) => (item.id === result.id ? result : item)));
        setStatus({ type: "success", message: "expense category updated successfully." });
      }

      closeModal();
    } catch (err) {
      console.error("Save error:", err);
      setStatus({ type: "error", message: err.message || "Unable to save expense category." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (item) => setDeleteTarget(item);
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
      const response = await fetch(`${API_BASE_URL}/api/expense_category/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete expense category");

      setExpenseCategory((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setStatus({ type: "success", message: "Expense category removed successfully." });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.message || "Unable to delete expense category." });
    } finally {
      setIsDeleting(false);
      cancelDelete();
    }
  };


  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Manage Expense Category</h2>
          <p>Configure and maintain all leave categories for your organization.</p>
        </div>

        <div className="admin-toolbar-actions">
          <input
            type="search"
            className="admin-search"
            placeholder="Search . . ."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="admin-primary-action" onClick={openCreateModal}>
            + Add Expense Category
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
              <th>Expense Category</th>
              <th>Description</th>
              <th>Expense Account</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="admin-empty-state">Loading expense category...</td>
              </tr>
            ) : visibleLeaveType.length === 0 ? (
              <tr>
                <td colSpan={3} className="admin-empty-state">
                  {search ? "No matching expense category." : "No expense category available."}
                </td>
              </tr>
            ) : (
              visibleLeaveType.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td >{item.description}</td>
                  <td>{item.expense_account}</td>
                  <td>
                    <div className="text-center" style={{display: 'flex', gap: '5px'}}>
                    <button className="admin-row-btn" onClick={() => openEditModal(item)}>Edit</button>
                    <button className="admin-row-btn admin-row-btn--danger" onClick={() => confirmDelete(item)}>Delete</button>
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
          Showing {visibleLeaveType.length} of {filteredExpenseCategory.length} expense category
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
        <div className={`admin-modal-backdrop ${isClosing ? "is-closing" : ""}`}>
          <div className={`admin-modal-panel-users ${isClosing ? "is-closing" : ""}`}>
            <h2>{modalMode === "create" ? "Add expense category" : "Edit expense category"}</h2>
            <p className="admin-modal-subtext">
              Capture the expense category name and the number of days allowed.
            </p>

            <form className="admin-modal-form" onSubmit={handleSubmit}>
                <div className="pr-grid-two">
                    <div className="pr-field">
                        <label className="pr-label">Name</label>
                        <input
                            name="name"
                            className="pr-input"
                            value={form.name}
                            onChange={handleFormChange}
                            required
                        />
                    </div>
                </div>

                <div className="pr-grid-two">
                    <div className="pr-field">
                        <label className="pr-label">Description</label>
                        <textarea
                            name="description"
                            id="description"
                            className="pr-text"
                            value={form.description}
                            onChange={handleFormChange}
                        >
                        </textarea>
                    </div>
                </div>

                <div className="pr-grid-two">
                    <div className="pr-field">
                        <label className="pr-label">Expense Account</label>
                        <input
                            name="expense_account"
                            className="pr-input"
                            value={form.expense_account}
                            onChange={handleFormChange}
                            required
                        />
                    </div>
                </div>

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
                    ? (isSubmitting ? "Saving..." : "Save")
                    : (isSubmitting ? "Saving..." : "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div className={`admin-modal-backdrop ${isDeleteClosing ? "is-closing" : ""}`}>
           <div className={`admin-modal-panel-users ${isDeleteClosing ? "is-closing" : ""}`}>
            <h2>Remove expense category</h2>
            <p className="admin-modal-subtext">
              This will remove <strong>{deleteTarget.name}</strong> from your list.
              Any policies or settings tied to it must be updated manually.
            </p>

            <div className="admin-modal-footer">
              <button
                className="admin-ghost-btn"
                onClick={cancelDelete}
                disabled={isDeleteClosing || isDeleting}
              >
                Cancel
              </button>

              <button
                className="admin-danger-btn"
                onClick={handleDelete}
                disabled={isDeleteClosing || isDeleting}
              >
                {isDeleting ? "Deleting" : "Delete expense category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseCategories;
