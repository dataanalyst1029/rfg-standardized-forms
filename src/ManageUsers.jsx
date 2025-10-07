import { useState, useEffect } from "react";

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    id: null,
    employee_id: "",
    name: "",
    email: "",
    role: "",
    password: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteClosing, setIsDeleteClosing] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  /* ------------------------ FETCH USERS ------------------------ */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ------------------------ HANDLERS ------------------------ */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      user.employee_id?.toLowerCase().includes(term) ||
      user.name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.role?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rowsPerPage]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.name || !form.email || !form.password || !form.role)
      return;

    try {
      const res = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const newUser = await res.json();

      if (res.ok) {
        setUsers([...users, newUser]);
        closeModalAnimated();
      } else {
        alert(newUser.message || "Failed to add user");
      }
    } catch (err) {
      console.error("Error adding user:", err);
    }
  };

  const handleEditUser = (user) => {
    setForm({ ...user, password: "" });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/users/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updated = await res.json();

      if (res.ok) {
        setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
        closeModalAnimated();
      } else {
        alert(updated.message || "Failed to update user");
      }
    } catch (err) {
      console.error("Error updating user:", err);
    }
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setUsers(users.filter((u) => u.id !== userToDelete.id));
        closeDeleteModalAnimated();
      } else {
        alert("Failed to delete user");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  const closeModalAnimated = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
      setForm({
        id: null,
        employee_id: "",
        name: "",
        email: "",
        role: "",
        password: "",
      });
      setIsEditing(false);
    }, 300);
  };

  const closeDeleteModalAnimated = () => {
    setIsDeleteClosing(true);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setIsDeleteClosing(false);
      setUserToDelete(null);
    }, 300);
  };

  /* ------------------------ RENDER ------------------------ */
  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full">
      <h2 className="text-xl text-left mb-3 font-semibold">Manage Users</h2>

      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add User
        </button>

        <input
          type="search"
          placeholder="Search by ID, name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {loading ? (
        <p>Loading users...</p>
      ) : filteredUsers.length === 0 ? (
        <p className="text-gray-500 italic">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          {/* Pagination Controls */}
          <div className="flex justify-between items-center mb-3">
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
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Pagination Buttons */}
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

          {/* User Table */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="p-2 border text-center">Employee ID</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border text-center">Role</th>
                <th className="p-2 border text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-100">
                  <td className="p-2 border text-center">{user.employee_id}</td>
                  <td className="p-2 border text-left">{user.name}</td>
                  <td className="p-2 border text-left">{user.email}</td>
                  <td className="p-2 border text-center">{user.role}</td>
                  <td className="p-2 border text-center space-x-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(user)}
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div
          className={`fixed inset-0 flex justify-center items-start z-50 pt-20 transition-all duration-300 ${
            isClosing ? "animate-fadeOut bg-opacity-0" : "animate-fadeIn bg-black bg-opacity-50"
          }`}
        >
          <div
            className={`bg-white w-full max-w-md p-6 rounded-lg shadow-lg transform transition-all duration-300 ease-out ${
              isClosing ? "animate-slideUp" : "animate-slideDown"
            }`}
          >
            <h2 className="text-xl font-semibold mb-4">
              {isEditing ? "Edit User" : "Add User"}
            </h2>
            <form onSubmit={isEditing ? handleUpdateUser : handleAddUser} className="space-y-3">
              <input
                type="text"
                name="employee_id"
                placeholder="Employee ID"
                value={form.employee_id}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={form.name}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required={!isEditing}
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
                <option>admin</option>
                <option>staff</option>
                <option>user</option>
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
                    isEditing
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-green-500 hover:bg-green-600"
                  }`}
                >
                  {isEditing ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
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
              <span className="font-semibold text-red-600">{userToDelete?.name}</span>?
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

export default ManageUsers;
