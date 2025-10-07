import { useState, useEffect } from "react";

function ManageUsersAccess() {
  const [accessList, setAccessList] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [form, setForm] = useState({
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

  // When user selects a name, auto-fill fields based on selected user
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
    } else {
      setForm({
        user_id: "",
        employee_id: "",
        name: "",
        email: "",
        access_forms: "",
        role: "",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/user_access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to add user access");

      await fetchAccessData();
      closeModalAnimated();
    } catch (err) {
      console.error("Error adding user access:", err);
      alert("Error adding user access record");
    }
  };

  const openModal = () => setIsModalOpen(true);

  const closeModalAnimated = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
      setForm({
        user_id: "",
        employee_id: "",
        name: "",
        email: "",
        access_forms: "",
        role: "",
      });
    }, 300);
  };

  /* ------------------------ RENDER ------------------------ */
  if (loading) return <p>Loading user access data...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Manage Users Access</h2>
        <button
          onClick={openModal}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add User Access
        </button>
      </div>

      <p className="text-gray-600 mb-4">
        Displays assigned access forms and roles for each user.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="p-2 border text-center">Employee ID</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Access Forms</th>
              <th className="p-2 border text-center">Role</th>
            </tr>
          </thead>
          <tbody>
            {accessList.map((user) => (
              <tr key={user.id} className="hover:bg-gray-100">
                <td className="p-2 border text-center">{user.employee_id}</td>
                <td className="p-2 border">{user.name}</td>
                <td className="p-2 border">{user.email}</td>
                <td className="p-2 border">{user.access_forms}</td>
                <td className="p-2 border text-center capitalize">
                  {user.role}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Access Modal */}
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
            <h2 className="text-xl font-semibold mb-4">Add User Access</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name Dropdown */}
              <select
                name="name"
                value={form.user_id}
                onChange={handleUserSelect}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select User</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>

              {/* Auto-filled Fields */}
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

              {/* Access Forms */}
              <textarea
                name="access_forms"
                value={form.access_forms}
                onChange={handleChange}
                placeholder="Access Forms (e.g., Form A, Form B)"
                className="w-full border p-2 rounded"
                rows="2"
              />

              {/* Role */}
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
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsersAccess;
