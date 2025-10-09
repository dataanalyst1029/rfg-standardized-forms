import { useState } from "react";

function ManageDepartments() {
  const [departments, setDepartments] = useState([
    { id: 1, name: "Human Resources", branch: "Head Office" },
    { id: 2, name: "IT Department", branch: "Cebu Branch" },
  ]);

  const [newDept, setNewDept] = useState({ name: "", branch: "" });
  const [editing, setEditing] = useState(null);

  const handleAdd = () => {
    if (!newDept.name || !newDept.branch) return;
    setDepartments([
      ...departments,
      { id: Date.now(), name: newDept.name, branch: newDept.branch },
    ]);
    setNewDept({ name: "", branch: "" });
  };

  const handleDelete = (id) => {
    setDepartments(departments.filter((d) => d.id !== id));
  };

  const handleEdit = (dept) => {
    setEditing(dept);
    setNewDept({ name: dept.name, branch: dept.branch });
  };

  const handleUpdate = () => {
    setDepartments(
      departments.map((d) =>
        d.id === editing.id ? { ...d, ...newDept } : d
      )
    );
    setEditing(null);
    setNewDept({ name: "", branch: "" });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">🏬 Manage Departments</h2>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Department Name"
          value={newDept.name}
          onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
          className="border p-2 rounded w-full"
        />
        <input
          type="text"
          placeholder="Branch"
          value={newDept.branch}
          onChange={(e) => setNewDept({ ...newDept, branch: e.target.value })}
          className="border p-2 rounded w-full"
        />
        {editing ? (
          <button
            onClick={handleUpdate}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Update
          </button>
        ) : (
          <button
            onClick={handleAdd}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Add
          </button>
        )}
      </div>

      <table className="min-w-full border border-gray-300 rounded-lg">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 text-left border-b">Department Name</th>
            <th className="px-4 py-2 text-left border-b">Branch</th>
            <th className="px-4 py-2 border-b text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border-b">{dept.name}</td>
              <td className="px-4 py-2 border-b">{dept.branch}</td>
              <td className="px-4 py-2 border-b text-center space-x-2">
                <button
                  onClick={() => handleEdit(dept)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {departments.length === 0 && (
            <tr>
              <td colSpan="3" className="text-center py-4 text-gray-500">
                No departments found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ManageDepartments;
