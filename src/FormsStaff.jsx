import { useState } from "react";
import { useNavigate } from "react-router-dom";

function FormsStaff({ onLogout }) {
  const [selectedForm, setSelectedForm] = useState("");
  const navigate = useNavigate();

  const forms = [
    "Purchase Request",
    "Revolving Fund",
    "Cash Advance Request",
    "Cash Advance Liquidation",
    "CA Receipt Form",
    "Reimbursement Form",
    "Payment Request Form",
    "Maintenance or Repair",
    "c/o HR Overtime Approval",
    "c/o HR Leave Application",
    "Interbranch Transfer Slip",
    "Credit Card Acknowledgement Receipt",
  ];

  const handleGo = () => {
    if (!selectedForm) {
      alert("Please select a form first.");
      return;
    }

    const route = selectedForm
      .toLowerCase()
      .replace(/[\s/]+/g, "-")
      .replace(/[^\w-]/g, "");

    navigate(`/forms/${route}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          📋 Staff Forms
        </h1>

        <label
          htmlFor="formSelect"
          className="block text-gray-700 mb-2 text-sm font-medium"
        >
          Select a Form:
        </label>
        <select
          id="formSelect"
          value={selectedForm}
          onChange={(e) => setSelectedForm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">-- Choose a form --</option>
          {forms.map((form, index) => (
            <option key={index} value={form}>
              {form}
            </option>
          ))}
        </select>

        <button
          onClick={handleGo}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-all"
        >
          Go
        </button>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => navigate("/approved-requests")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
          >
            ✅ Check Approved Requests
          </button>
        </div>
      </div>
    </div>
  );
}

export default FormsStaff;
