import { useState } from "react";
import { useNavigate } from "react-router-dom";

function FormsList({ onLogout }) {
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

    // Convert to URL-friendly format (e.g. "Purchase Request" → "purchase-request")
    const route = selectedForm
      .toLowerCase()
      .replace(/[\s/]+/g, "-")
      .replace(/[^\w-]/g, "");

    navigate(`/forms/${route}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          📋 Forms List
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
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded-lg transition-all"
        >
          Go
        </button>

        <button
          onClick={onLogout}
          className="w-full mt-4 bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 rounded-lg transition-all"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default FormsList;
