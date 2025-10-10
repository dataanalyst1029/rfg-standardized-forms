import { useState, useEffect } from "react";

function ManageDepartments() {
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    department_name: "",
    branch_id: "",
  });
  const [editingId, setEditingId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  /* -------------------- FETCH DATA -------------------- */
  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/departments");
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/branches");
      const data = await res.json();
      setBranches(data);
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchBranches();
  }, []);

  /* -------------------- HANDLERS -------------------- */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.department_name || !form.branch_id) return;

    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `http://localhost:5000/api/departments/${editingId}`
      : "http://localhost:5000/api/departments";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        await fetchDepartments();
        closeModalAnimated();
      } else {
        alert("Failed to save department");
      }
    } catch (err) {
      console.error("Error saving department:", err);
    }
  };

  const handleEdit = (dept) => {
    setForm({
      department_name: dept.department_name,
      branch_id: dept.branch_id || "",
    });
    setEditingId(dept.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    try {
      await fetch(`http://localhost:5000/api/departments/${id}`, { method: "DELETE" });
      fetchDepartments();
    } catch (err) {
      console.error("Error deleting department:", err);
    }
  };

  const closeModalAnimated = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
      setForm({ department_name: "", branch_id: "" });
      setEditingId(null);
    }, 300);
  };

  /* -------------------- SEARCH + PAGINATION -------------------- */
  const filteredDepartments = departments.filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      d.department_name?.toLowerCase().includes(term) ||
      d.branch_name?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredDepartments.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedDepartments = filteredDepartments.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  /* -------------------- RENDER -------------------- */
  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full">
      <h2 className="text-xl font-semibold mb-3 text-left">Manage Departments</h2>

      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add Department
        </button>

        <input
          type="search"
          placeholder="Search department name or branch..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {loading ? (
        <p>Loading departments...</p>
      ) : filteredDepartments.length === 0 ? (
        <p className="text-gray-500 italic">No departments found.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <label htmlFor="rowsPerPage" className="text-sm text-gray-600">
                Rows per page:
              </label>
              <select
                id="rowsPerPage"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {[5, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <span className="text-sm text-gray-600">
              Showing{" "}
              <strong>
                {filteredDepartments.length === 0
                  ? 0
                  : startIndex + 1}–{Math.min(endIndex, filteredDepartments.length)}
              </strong>{" "}
              of <strong>{filteredDepartments.length}</strong> departments
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="p-2 border">Department Name</th>
                <th className="p-2 border">Branch</th>
                <th className="p-2 border text-center w-40">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDepartments.map((d) => (
                <tr key={d.id} className="hover:bg-gray-100 text-left">
                  <td className="p-2 border">{d.department_name}</td>
                  <td className="p-2 border">
                    {d.branch_name || "—"}
                  </td>
                  <td className="p-2 border text-center space-x-2">
                    <button
                      onClick={() => handleEdit(d)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* -------------------- MODAL -------------------- */}
      {isModalOpen && (
        <div
          className={`fixed inset-0 flex justify-center items-start z-50 pt-20 transition-all duration-300 ${
            isClosing
              ? "animate-fadeOut bg-opacity-0"
              : "animate-fadeIn bg-black bg-opacity-50"
          }`}
        >
          <div
            className={`bg-white w-full max-w-md p-6 rounded-lg shadow-lg transform transition-all duration-300 ease-out ${
              isClosing ? "animate-slideUp" : "animate-slideDown"
            }`}
          >
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? "Edit Department" : "Add Department"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                name="department_name"
                placeholder="Department Name"
                value={form.department_name}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              <select
                name="branch_id"
                value={form.branch_id}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}
                  </option>
                ))}
              </select>

              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={closeModalAnimated}
                  className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded ${
                    editingId
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-green-500 hover:bg-green-600"
                  }`}
                >
                  {editingId ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageDepartments;
