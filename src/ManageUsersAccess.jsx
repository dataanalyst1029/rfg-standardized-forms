import { useState, useEffect } from "react";

function ManageUsersAccess() {
  const [accessList, setAccessList] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteClosing, setIsDeleteClosing] = useState(false);
  const [accessToDelete, setAccessToDelete] = useState(null);

  const [form, setForm] = useState({
    id: "",
    user_id: "",
    employee_id: "",
    name: "",
    email: "",
    access_forms: "",
    role: "",
  });

  /* ------------------------ FETCH DATA ------------------------ */
  const fetchAccessData = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/user_access");
      if (!res.ok) throw new Error("Failed to fetch user access data");
      const data = await res.json();
      setAccessList(data);
    } catch (err) {
      console.error("Error fetching access data:", err);
      setError("Failed to load user access data");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    fetchAccessData();
    fetchUsers();
  }, []);

  /* ------------------------ HANDLERS ------------------------ */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUserSelect = (e) => {
    const selectedUserId = e.target.value;
    const selectedUser = users.find((u) => String(u.id) === selectedUserId);
    if (selectedUser) {
      setForm({
        ...form,
        user_id: selectedUser.id,
        employee_id: selectedUser.employee_id,
        name: selectedUser.name,
        email: selectedUser.email,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEditing
        ? `http://localhost:5000/api/user_access/${form.id}`
        : "http://localhost:5000/api/user_access";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save user access");
      await fetchAccessData();
      closeModalAnimated();
    } catch (err) {
      console.error("Error saving user access:", err);
      alert("Error saving user access record");
    }
  };

  /* ------------------------ DELETE HANDLERS ------------------------ */
  const openDeleteModal = (record) => {
    setAccessToDelete(record);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModalAnimated = () => {
    setIsDeleteClosing(true);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setIsDeleteClosing(false);
      setAccessToDelete(null);
    }, 300);
  };

  const handleConfirmDelete = async () => {
    if (!accessToDelete) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/user_access/${accessToDelete.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setAccessList(accessList.filter((a) => a.id !== accessToDelete.id));
        closeDeleteModalAnimated();
      } else {
        alert("Failed to delete record");
      }
    } catch (err) {
      console.error("Error deleting record:", err);
      alert("Error deleting record");
    }
  };

  /* ------------------------ MODAL HANDLERS ------------------------ */
  const openAddModal = () => {
    setIsEditing(false);
    setIsModalOpen(true);
    setForm({
      id: "",
      user_id: "",
      employee_id: "",
      name: "",
      email: "",
      access_forms: "",
      role: "",
    });
  };

  const openEditModal = (record) => {
    setIsEditing(true);
    setForm(record);
    setIsModalOpen(true);
  };

  const closeModalAnimated = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 300);
  };

  /* ------------------------ FILTERED & PAGINATED DATA ------------------------ */
  const filteredAccessList = accessList.filter((user) => {
    const search = searchTerm.toLowerCase();
    return (
      user.employee_id?.toLowerCase().includes(search) ||
      user.name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredAccessList.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedAccessList = filteredAccessList.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  /* ------------------------ RENDER ------------------------ */
  if (loading) return <p>Loading user access data...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full">
      <h2 className="text-xl text-left mb-3 font-semibold">Manage Users Access</h2>

      <div className="flex justify-between items-center mb-4">
        <button
          onClick={openAddModal}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add User Access
        </button>

        <input
          type="search"
          placeholder="Search by ID, name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

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
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <span className="text-sm text-gray-600">
          Showing{" "}
          <strong>
            {filteredAccessList.length === 0 ? 0 : startIndex + 1}–
            {Math.min(endIndex, filteredAccessList.length)}
          </strong>{" "}
          of <strong>{filteredAccessList.length}</strong> users
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

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="p-2 border text-center">Employee ID</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Access Forms</th>
              <th className="p-2 border text-center">Role</th>
              <th className="p-2 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAccessList.length > 0 ? (
              paginatedAccessList.map((user) => (
                <tr key={user.id} className="hover:bg-gray-100">
                  <td className="p-2 border">{user.employee_id}</td>
                  <td className="p-2 border text-left">{user.name}</td>
                  <td className="p-2 border text-left">{user.email}</td>
                  <td className="p-2 border text-left">{user.access_forms}</td>
                  <td className="p-2 border text-center capitalize">
                    {user.role}
                  </td>
                  <td className="p-2 border text-center space-x-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(user)}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center text-gray-500 p-4 italic">
                  No users found matching "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
              {isEditing ? "Edit User Access" : "Add User Access"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <select
                name="name"
                value={form.user_id}
                onChange={handleUserSelect}
                className="w-full border p-2 rounded"
                required
                disabled={isEditing}
              >
                <option value="">Select User</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>

              <input
                name="employee_id"
                value={form.employee_id}
                readOnly
                placeholder="Employee ID"
                className="w-full border p-2 rounded bg-gray-100 cursor-not-allowed"
              />
              <input
                type="email"
                name="email"
                value={form.email}
                readOnly
                placeholder="Email"
                className="w-full border p-2 rounded bg-gray-100 cursor-not-allowed"
              />

              <input
                name="access_forms"
                value={form.access_forms}
                onChange={handleChange}
                placeholder="Access Forms (e.g., Form A, Form B)"
                className="w-full border p-2 rounded"
              />

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              >
                <option value="" disabled>
                  Select Role
                </option>
                <option>Approve</option>
                <option>Receive</option>
                <option>Prepare</option>
                <option>Endorse</option>
                <option>HR Approve</option>
                <option>Accomplish</option>
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
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  {isEditing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div
          className={`fixed inset-0 flex justify-center items-center z-50 transition-all duration-300 ${
            isDeleteClosing
              ? "animate-fadeOut bg-opacity-0"
              : "animate-fadeIn bg-black bg-opacity-50"
          }`}
        >
          <div
            className={`bg-white w-full max-w-sm p-6 rounded-lg shadow-lg transform transition-all duration-300 ease-out ${
              isDeleteClosing ? "animate-slideUp" : "animate-slideDown"
            }`}
          >
            <h2 className="text-xl font-semibold mb-3 text-center text-gray-800">
              Confirm Delete
            </h2>
            <p className="text-center text-gray-600 mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-red-600">
                {accessToDelete?.name}
              </span>
              's access?
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={closeDeleteModalAnimated}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsersAccess;
