import { useState, useEffect } from "react";

function ManageBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    branch_name: "",
    branch_code: "",
    location: "",
  });
  const [editingId, setEditingId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  /* -------------------- FETCH BRANCHES -------------------- */
  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/branches");
      const data = await res.json();
      setBranches(data);
    } catch (err) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  /* -------------------- HANDLERS -------------------- */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.branch_name || !form.branch_code) return;

    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `http://localhost:5000/api/branches/${editingId}`
      : "http://localhost:5000/api/branches";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        await fetchBranches();
        closeModalAnimated();
      } else {
        alert("Failed to save branch");
      }
    } catch (err) {
      console.error("Error saving branch:", err);
    }
  };

  const handleEdit = (branch) => {
    setForm({
      branch_name: branch.branch_name,
      branch_code: branch.branch_code,
      location: branch.location || "",
    });
    setEditingId(branch.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this branch?")) return;
    try {
      await fetch(`http://localhost:5000/api/branches/${id}`, { method: "DELETE" });
      fetchBranches();
    } catch (err) {
      console.error("Error deleting branch:", err);
    }
  };

  const closeModalAnimated = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
      setForm({ branch_name: "", branch_code: "", location: "" });
      setEditingId(null);
    }, 300);
  };

  /* -------------------- SEARCH + PAGINATION -------------------- */
  const filteredBranches = branches.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.branch_name?.toLowerCase().includes(term) ||
      b.branch_code?.toLowerCase().includes(term) ||
      b.location?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredBranches.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedBranches = filteredBranches.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  /* -------------------- RENDER -------------------- */
  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full">
      <h2 className="text-xl font-semibold mb-3 text-left">Manage Branches</h2>

      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add Branch
        </button>

        <input
          type="search"
          placeholder="Search branch name, code, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {loading ? (
        <p>Loading branches...</p>
      ) : filteredBranches.length === 0 ? (
        <p className="text-gray-500 italic">No branches found.</p>
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
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                </select>
            </div>

            <span className="text-sm text-gray-600">
                Showing{" "}
                <strong>
                {filteredBranches.length === 0
                    ? 0
                    : startIndex + 1}–{Math.min(endIndex, filteredBranches.length)}
                </strong>{" "}
                of <strong>{filteredBranches.length}</strong> branches
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
                <th className="p-2 border">Branch Name</th>
                <th className="p-2 border">Branch Code</th>
                <th className="p-2 border">Location</th>
                <th className="p-2 border text-center w-40">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBranches.map((b) => (
                <tr key={b.id} className="hover:bg-gray-100">
                  <td className="p-2 border">{b.branch_name}</td>
                  <td className="p-2 border">{b.branch_code}</td>
                  <td className="p-2 border">{b.location || "—"}</td>
                  <td className="p-2 border text-center space-x-2">
                    <button
                      onClick={() => handleEdit(b)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
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
              {editingId ? "Edit Branch" : "Add Branch"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                name="branch_name"
                placeholder="Branch Name"
                value={form.branch_name}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="text"
                name="branch_code"
                placeholder="Branch Code"
                value={form.branch_code}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="text"
                name="location"
                placeholder="Location"
                value={form.location}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
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

export default ManageBranches;
