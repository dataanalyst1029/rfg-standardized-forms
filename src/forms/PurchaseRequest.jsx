import { useState, useEffect } from "react";

function PurchaseRequest({ onLogout }) {
  const [formData, setFormData] = useState({
    purchase_request_code: "",
    request_date: new Date().toISOString().split("T")[0],
    requested_by: "",
    contact_number: "",
    branch: "",
    department: "",
    address: "",
    purpose: "",
  });

  const [items, setItems] = useState([{ quantity: "", purchase_item: "" }]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/purchase_request/next-code");
        const data = await res.json();
        if (data.nextCode) {
          setFormData((prev) => ({
            ...prev,
            purchase_request_code: data.nextCode,
          }));
        } else {
          alert("⚠️ Could not get next purchase request code!");
        }
      } catch (err) {
        console.error("Error fetching next code:", err);
        alert("❌ Failed to load next reference number");
      } finally {
        setLoading(false);
      }
    };

    fetchNextCode();
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) {
      setFormData((prev) => ({
        ...prev,
        requested_by: storedName,
      }));
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, e) => {
    const newItems = [...items];
    newItems[index][e.target.name] = e.target.value;
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { quantity: "", purchase_item: "" }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.purchase_request_code) {
      alert("⚠️ Reference number not loaded yet!");
      return;
    }

    const payload = {
      purchase_request_code: formData.purchase_request_code,
      date_applied: formData.request_date,
      requested_by: formData.requested_by,
      contact_number: formData.contact_number,
      branch: formData.branch,
      department: formData.department,
      address: formData.address,
      purpose: formData.purpose,
      items,
    };

    try {
      const res = await fetch("http://localhost:5000/api/purchase_request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`✅ Purchase Request (${formData.purchase_request_code}) submitted successfully!`);
        window.history.back();
      } else {
        alert(`❌ Failed to submit: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error submitting purchase request:", err);
      alert("❌ Error submitting purchase request");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading Purchase Request Form...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* ✅ Sidebar */}
      <aside className="w-64 bg-gray-800 shadow-md fixed top-0 left-0 h-full flex flex-col justify-between">
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white mb-6">
            🧾 Purchase Request
          </h2>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-left"
          >
            ← Back to Forms
          </button>

          <button
            type="button"
            onClick={() => (window.location.href = "/approved-requests")}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-left"
          >
            ✅ Approved Requests
          </button>
        </div>

        <div className="p-6 border-t">
          <button
            type="button"
            onClick={onLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ✅ Main Content (Form) */}
      <main className="flex-1 ml-64 p-8">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-6 text-gray-800 text-center">
            🧾 Purchase Request Form
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reference & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reference Number
                </label>
                <input
                  type="text"
                  name="purchase_request_code"
                  value={formData.purchase_request_code}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date Applied
                </label>
                <input
                  type="date"
                  name="request_date"
                  value={formData.request_date}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
                  required
                />
              </div>
            </div>

            {/* Requested By & Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Requested By
                </label>
                <input
                  type="text"
                  name="requested_by"
                  value={formData.requested_by}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Number
                </label>
                <input
                  type="text"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
                  required
                />
              </div>
            </div>

            {/* Branch & Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Branch
                </label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
                />
              </div>
            </div>

            {/* Address & Purpose */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Purpose
              </label>
              <textarea
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                rows="3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
              />
            </div>

            {/* Items Table */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mt-4 mb-2">
                🛒 Items
              </h2>

              <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="border px-3 py-2 text-left">Quantity</th>
                      <th className="border px-3 py-2 text-left">Purchase Item</th>
                      <th className="border px-3 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((purchase_item, index) => (
                      <tr key={index}>
                        <td className="border px-3 py-2">
                          <input
                            type="number"
                            name="quantity"
                            min="1"
                            value={purchase_item.quantity}
                            onChange={(e) => handleItemChange(index, e)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1"
                            required
                          />
                        </td>
                        <td className="border px-3 py-2">
                          <input
                            type="text"
                            name="purchase_item"
                            value={purchase_item.purchase_item}
                            onChange={(e) => handleItemChange(index, e)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1"
                            required
                          />
                        </td>
                        <td className="border px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
                          >
                            ✖
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={addItemRow}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                >
                  ➕ Add Item
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-between">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default PurchaseRequest;
