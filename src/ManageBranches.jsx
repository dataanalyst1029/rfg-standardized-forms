import { useState } from "react";

function ManageBranches() {
  const [branches, setBranches] = useState([
    { id: 1, name: "Head Office", location: "Manila" },
    { id: 2, name: "Cebu Branch", location: "Cebu City" },
  ]);

  const [newBranch, setNewBranch] = useState({ name: "", location: "" });
  const [editing, setEditing] = useState(null);

  const handleAdd = () => {
    if (!newBranch.name || !newBranch.location) return;
    setBranches([
      ...branches,
      { id: Date.now(), name: newBranch.name, location: newBranch.location },
    ]);
    setNewBranch({ name: "", location: "" });
  };

  const handleDelete = (id) => {
    setBranches(branches.filter((b) => b.id !== id));
  };

  const handleEdit = (branch) => {
    setEditing(branch);
    setNewBranch({ name: branch.name, location: branch.location });
  };

  const handleUpdate = () => {
    setBranches(
      branches.map((b) =>
        b.id === editing.id ? { ...b, ...newBranch } : b
      )
    );
    setEditing(null);
    setNewBranch({ name: "", location: "" });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">🏢 Manage Branches</h2>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Branch Name"
          value={newBranch.name}
          onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
          className="border p-2 rounded w-full"
        />
        <input
          type="text"
          placeholder="Location"
          value={newBranch.location}
          onChange={(e) =>
            setNewBranch({ ...newBranch, location: e.target.value })
          }
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
            <th className="px-4 py-2 text-left border-b">Branch Name</th>
            <th className="px-4 py-2 text-left border-b">Location</th>
            <th className="px-4 py-2 border-b text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((branch) => (
            <tr key={branch.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border-b">{branch.name}</td>
              <td className="px-4 py-2 border-b">{branch.location}</td>
              <td className="px-4 py-2 border-b text-center space-x-2">
                <button
                  onClick={() => handleEdit(branch)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(branch.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {branches.length === 0 && (
            <tr>
              <td colSpan="3" className="text-center py-4 text-gray-500">
                No branches found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ManageBranches;
