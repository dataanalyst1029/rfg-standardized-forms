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

  // ✅ Handle text input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Handle purchase_item field change
  const handleItemChange = (index, e) => {
    const newItems = [...items];
    newItems[index][e.target.name] = e.target.value;
    setItems(newItems);
  };

  // ✅ Add new purchase_item row
  const addItemRow = () => {
    setItems([...items, { quantity: "", purchase_item: "" }]);
  };

  // ✅ Remove purchase_item row
  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // ✅ Submit to backend
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

  // ✅ Loading screen while fetching PR code
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading Purchase Request Form...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h1 className="text-2xl font-semibold mb-6 text-gray-800 text-center">
          🧾 Purchase Request Form
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* --- Basic Info --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-left">
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
            <div className="text-left">
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

          {/* --- Other Fields --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700">
                Requested By
              </label>
              <input
                type="text"
                name="requested_by"
                value={formData.requested_by}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
                required
              />
            </div>
            <div className="text-left">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-left">
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
            <div className="text-left">
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

          <div className="text-left">
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

          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700">
              Purpose
            </label>
            <textarea
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
              rows="3"
            ></textarea>
          </div>

          {/* --- Items Section --- */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2">
              🛒 Items
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300 rounded-lg mb-4">
                <thead className="bg-gray-100">
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

            <button
              type="button"
              onClick={addItemRow}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
            >
              ➕ Add Item
            </button>
          </div>

          {/* --- Submit Buttons --- */}
          <div className="flex justify-between mt-6 sticky bottom-0 bg-white py-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
            >
              ← Back
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PurchaseRequest;
