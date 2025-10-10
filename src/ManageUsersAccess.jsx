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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!form.user_id || !form.access_forms || !form.role) return;

    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `http://localhost:5000/api/user_access/${form.id}`
      : "http://localhost:5000/api/user_access";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: form.user_id,
          access_forms: form.access_forms,
          role: form.role,
        }),
      });

      if (res.ok) {
        await fetchAccessData();
        closeModalAnimated();
      } else {
        alert("Failed to save user access");
      }
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
  const filteredAccessList = accessList.filter((item) => {
    const search = searchTerm.toLowerCase();
    return (
      item.user_id?.toString().includes(search) ||
      item.access_forms?.toLowerCase().includes(search) ||
      item.role?.toLowerCase().includes(search)
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
          placeholder="Search by user ID, form, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {loading ? (
        <p>Loading user access data...</p>
      ) : filteredAccessList.length === 0 ? (
        <p className="text-gray-500 italic">No access records found.</p>
      ) : (
        <>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Access Forms</th>
                <th className="p-2 border text-center">Role</th>
                <th className="p-2 border text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAccessList.map((record) => (
                <tr key={record.id} className="hover:bg-gray-100">
                  <td className="p-2 border text-left">
                    {
                      users.find((u) => u.id === record.user_id)?.name || 
                      `User #${record.user_id}`
                    }
                  </td>
                  <td className="p-2 border text-left">{record.access_forms}</td>
                  <td className="p-2 border text-center">{record.role}</td>
                  <td className="p-2 border text-center space-x-2">
                    <button
                      onClick={() => openEditModal(record)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(record)}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Add/Edit Modal */}
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
              {isEditing ? "Edit Access" : "Add Access"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <select
                name="user_id"
                value={form.user_id}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
                disabled={isEditing}
              >
                <option value="">Select User</option>
                {users
                  .filter((user) => user.role === "staff") 
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
              </select>


              <input
                name="access_forms"
                value={form.access_forms}
                onChange={handleChange}
                placeholder="Access Forms (e.g., Form A, Form B)"
                className="w-full border p-2 rounded"
                required
              />

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Role</option>
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
                  className="px-4 py-2 text-white rounded bg-blue-500 hover:bg-blue-600"
                >
                  {isEditing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
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
              Are you sure you want to delete access for{" "}
              <span className="font-semibold text-red-600">
                User ID {accessToDelete?.user_id}
              </span>
              ?
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
