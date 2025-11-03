import { useEffect, useState } from "react";
import "./styles/Reimbursement.css";
// import "./styles/CashAdvanceRequest.css";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";

const initialFormData = {
  rb_request_code: "",
  request_date: new Date().toISOString().split("T")[0],
  user_id: "",
  cal_no: "",
  ca_no: "",
  employee_id: "",
  name: "",
  branch: "",
  department: "",
  bpi_acc_no: "",
  total_rb_amount: "",
  requested_by: "",
  request_signature: "",
};

const NAV_SECTIONS = [
  { id: "pr-main", label: "New Reimbursement" },
  { id: "submitted", label: "View Submitted Requests" },
];

function Reimbursement({ onLogout }) {
  const [formData, setFormData] = useState(initialFormData);
  const [cashAdvanceRequests, setCashAdvanceRequests] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({});
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCashAdvanceRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cash_advance_liquidation`);
        const data = await res.json();
        setCashAdvanceRequests(data);
      } catch (err) {
        console.error("Error fetching reimbursement:", err);
      }
    };
    fetchCashAdvanceRequests();
  }, []);

  useEffect(() => {
    const storedId = sessionStorage.getItem("id");
    if (!storedId) return;
    fetch(`${API_BASE_URL}/users/${storedId}`)
      .then((res) => res.json())
      .then((data) => {
        setUserData(data);
        setFormData((prev) => ({
          ...prev,
          user_id: storedId,
          requested_by: data.name || "",
          request_signature: data.signature || "",
        }));
      })
      .catch((err) => console.error("Error fetching user data:", err));
  }, []);

  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/reimbursement/next-code`);
        const data = await res.json();
        if (data.nextCode)
          setFormData((prev) => ({ ...prev, rb_request_code: data.nextCode }));
      } catch (error) {
        console.error("Error getting next CAR code:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNextCode();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };


  const handleCashAdvanceSelect = async (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, cal_no: value }));
    if (!value) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/cash_advance_liquidation/${value}`);
      if (!res.ok) throw new Error("Failed to fetch reimbursement data");
      const data = await res.json();

      setFormData((prev) => ({
        ...prev,
        ca_no: data.cash_advance_no || "",
        employee_id: data.employee_id || "",
        name: data.name || "",
        branch: data.branch || "",
        department: data.department || "",
        total_rb_amount: data.rb_amount || "",
      }));
    } catch (error) {
      console.error("Error fetching reimbursement:", error);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/reimbursement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit receipt");

      setMessage({ type: "success", text: "Reimbursement submitted successfully!" });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      navigate("/submitted-reimbursement"); 
    } else {
      setActiveSection(sectionId);
      const element = document.getElementById(sectionId);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading Reimbursement Form...</span>
      </div>
    );

  return (
    <div className="pr-layout">
      {message && (
        <div className="message-modal-overlay">
          <div className={`message-modal-content ${message.type}`}>
            {message.text}
          </div>
        </div>
      )}

      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2 
            onClick={() => navigate("/forms-list")} 
            style={{ cursor: "pointer", color: "#007bff" }}
            title="Back to Forms Library"
          >
            Reimbursement
          </h2>
          <span>Standardized form</span>
        </div>

        <nav className="pr-sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === "pr-main" ? "is-active" : ""}
              onClick={() => handleNavigate(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="pr-sidebar-footer">
          <span className="pr-sidebar-meta">
            Remember to review line items before submitting.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Reimbursement Form</h1>
          </div>

          <div className="pr-reference-card">
            <span className="pr-reference-label">Reference code</span>
            <span className="pr-reference-value">
              {formData.rb_request_code || "—"}
            </span>
            <span className="pr-reference-label">Request date</span>
            <span>
              {new Date(formData.request_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="cash-receipt-form">
            <section className="pr-form-section" id="details">
                <div className="pr-grid-two">
                    <div className="pr-field">
                        <label>Cash Advance Liquidation No.</label>
                        <select
                        name="cal_no"
                        className="pr-input"
                        value={formData.cal_no || ""}
                        onChange={handleCashAdvanceSelect}
                        required
                        >
                        <option value="" disabled>Select CAL No.</option>
                        {cashAdvanceRequests.map((req, index) => (
                            <option key={index} value={req.cal_request_code}>
                            {req.cal_request_code}
                            </option>
                        ))}
                        </select>
                    </div>
                    <div className="pr-field">
                        <div className="pr-field">
                            <label>Cash Advance No.</label>
                            <input
                            type="text"
                            name="ca_no"
                            value={formData.ca_no || ""}
                            onChange={handleChange}
                            className="pr-input"
                            required
                            />
                        </div>
                    </div>
                </div>
                <div className="pr-grid-two">
                    <div className="pr-field">
                        <label>Employee ID</label>
                        <input
                        type="text"
                        name="employee_id"
                        value={formData.employee_id || ""}
                        onChange={handleChange}
                        className="pr-input"
                        required
                        />
                    </div>
                    <div className="pr-field">
                        <label>Name</label>
                        <input
                        type="text"
                        name="name"
                        value={formData.name || ""}
                        onChange={handleChange}
                        className="pr-input"
                        required
                        />
                    </div>
                </div>
                <div className="pr-grid-two">
                    <div className="pr-field">
                        <label>Branch</label>
                        <input
                        type="text"
                        name="branch"
                        value={formData.branch || ""}
                        onChange={handleChange}
                        className="pr-input"
                        required
                        />
                    </div>
                    <div className="pr-field">
                        <label>Department</label>
                        <input
                        type="text"
                        name="department"
                        value={formData.department || ""}
                        onChange={handleChange}
                        className="pr-input"
                        required
                        />
                    </div>
                </div>
            </section>

            <section className="pr-form-section" id="details">
                <div className="pr-grid-two">
                    <div className="pr-field">
                        <label>BPI Account No.</label>
                        <input
                        type="text"
                        name="bpi_acc_no"
                        value={formData.bpi_acc_no || ""}
                        onChange={handleChange}
                        className="pr-input"
                        required
                        />
                    </div>
                    <div className="pr-field">
                       
                    </div>
                </div>
                <div className="pr-grid-two">
                    <div className="pr-field">
                        <label>Total Reimbursable Amount</label>
                        <input
                        type="text"
                        name="total_rb_amount"
                        value={formData.total_rb_amount || ""}
                        onChange={handleChange}
                        className="pr-input"
                        required
                        />
                    </div>
                    <div className="pr-field">
                       
                    </div>
                </div>
            </section>


            <section className="rfr-form-section" id="signature">
              <div className="signature-details">
                <label htmlFor="receive-by">
                  <input type="text" name="requested_by" value={userData.name || ""} />
                  <p>Request by:</p>
                </label>
                <label htmlFor="receive-by" class="signature-by">
                  {userData.signature ? (
                  <img
                    src={`${API_BASE_URL}/uploads/signatures/${userData.signature}`}
                    alt="Signature"
                    className="car-signature-img"/>
                    ) : (
                        <p>No signature available</p>
                  )}
                  <input type="text" name="submitter_signature" value={userData.signature || ""} readOnly />
                  <p>Signature:</p>

                </label>
              </div>
            </section>

            <div className="pr-form-actions">
              <button type="submit" className="pr-submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Reimbursement Form"}
              </button>
            </div>
        </form>
      </main>
    </div>
  );
}

export default Reimbursement;
