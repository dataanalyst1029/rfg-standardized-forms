import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/FormsHub.css";

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

    const route = selectedForm
      .toLowerCase()
      .replace(/[\s/]+/g, "-")
      .replace(/[^\w-]/g, "");

    navigate(`/forms/${route}`);
  };

  return (
    <div className="forms-hub">
      <div className="forms-card">
        <header className="forms-header">
          <h1 className="forms-title">Forms library</h1>
          <p className="forms-subtitle">
            Pick a standardized form to start a new request.
          </p>
        </header>

        <div className="forms-field">
          <label htmlFor="formSelect" className="forms-label">
            Select a form
          </label>
          <select
            id="formSelect"
            value={selectedForm}
            onChange={(event) => setSelectedForm(event.target.value)}
            className="forms-select"
          >
            <option value="">-- Choose a form --</option>
            {forms.map((form) => (
              <option key={form} value={form}>
                {form}
              </option>
            ))}
          </select>
        </div>

        <div className="forms-actions">
          <button type="button" className="forms-button forms-button--primary" onClick={handleGo}>
            Open form
          </button>
          <button type="button" className="forms-button forms-button--muted" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default FormsList;
