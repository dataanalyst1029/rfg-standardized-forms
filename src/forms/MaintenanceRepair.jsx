import { useEffect, useState } from "react";
import "./styles/Reimbursement.css";
// import "./styles/CashAdvanceRequest.css";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";

const initialFormData = {
  mrr_request_code: "",
  request_date: new Date().toISOString().split("T")[0],
  user_id: "",
  employee_id: "",
  name: "",
  branch: "",
  department: "",
  date_needed: new Date().toISOString().split("T")[0],
  work_description: "",
  asset_tag: "",
  requested_by: "",
  request_signature: "",
};

const NAV_SECTIONS = [
  { id: "mrr-main", label: "New Maintenance / Repair Request" },
  { id: "submitted", label: "Maintenance / Repair Reports" },
];

function MaintenanceRepair({ onLogout }) {
  const [formData, setFormData] = useState(initialFormData);
  // const [cashAdvanceRequests, setCashAdvanceRequests] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({});
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  // useEffect(() => {
  //   const fetchCashAdvanceRequests = async () => {
  //     try {
  //       const calRes = await fetch(`${API_BASE_URL}/api/cash_advance_liquidation`);
  //       const calData = await calRes.json();

  //       const rbRes = await fetch(`${API_BASE_URL}/api/reimbursement`);
  //       const rbData = await rbRes.json();

  //       const availableCALs = calData.filter((cal) => {
  //         const matchingRb = rbData.find(
  //           (rb) => rb.cal_no === cal.cal_request_code
  //         );
  //         return !matchingRb || !matchingRb.status;
  //       });

  //       setCashAdvanceRequests(availableCALs);
  //     } catch (err) {
  //       console.error("Error fetching reimbursement data:", err);
  //     }
  //   };

  //   fetchCashAdvanceRequests();
  // }, []);


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
          employee_id: data.employee_id || "",
          name: data.name || "",
          branch: data.branch || "",
          department: data.department || "",
        }));
      })
      .catch((err) => console.error("Error fetching user data:", err));
  }, []);

  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/maintenance_repair_request/next-code`);
        const data = await res.json();
        if (data.nextCode)
          setFormData((prev) => ({ ...prev, mrr_request_code: data.nextCode }));
      } catch (error) {
        console.error("Error getting next MRR code:", error);
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


  // const handleCashAdvanceSelect = async (e) => {
  //   const value = e.target.value;
  //   setFormData((prev) => ({ ...prev, cal_no: value }));
  //   if (!value) return;

  //   try {
  //     const res = await fetch(`${API_BASE_URL}/api/cash_advance_liquidation/${value}`);
  //     if (!res.ok) throw new Error("Failed to fetch reimbursement data");
  //     const data = await res.json();

  //     setFormData((prev) => ({
  //       ...prev,
  //       ca_no: data.cash_advance_no || "",
  //       employee_id: data.employee_id || "",
  //       name: data.name || "",
  //       branch: data.branch || "",
  //       department: data.department || "",
  //       total_rb_amount: data.rb_amount || "",
  //     }));
  //   } catch (error) {
  //     console.error("Error fetching reimbursement:", error);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/maintenance_repair_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit request");

      setMessage({ type: "success", text: "Maintenance / Repair submitted successfully!" });
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
      navigate("/submitted-maintenance-or-repair"); 
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
        <span>Loading Maintenance / Repair Request...</span>
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
            Maintenance / Repair Request
          </h2>
          <span>Standardized form</span>
        </div>

        <nav className="pr-sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === "mrr-main" ? "is-active" : ""}
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
            <h1>Maintenance / Repair Request</h1>
            <p className="pr-topbar-meta">
              Centralize maintenance concerns, repair instructions, and follow-up actions in one form.
            </p>
          </div>

          <div className="pr-reference-card">
            <span className="pr-reference-label">Reference code</span>
            <span className="pr-reference-value">
              {formData.mrr_request_code || "—"}
            </span>
            <span className="pr-reference-label">Request date</span>
            <span className="pr-reference-value">
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
              <h2 className="pr-items-title">Requestor Details</h2>
              <div className="pr-grid-two">
                  <div className="pr-field">
                      <label className="pr-label">Employee ID</label>
                      <input
                        type="text"
                        id="employeeId"
                        name="employee_id"
                        value={formData.employee_id}
                        onChange={handleChange}
                        className="pr-input"
                        placeholder="Employee ID"
                        readOnly
                        required
                      />
                      <input
                        type="hidden"
                        id="userId"
                        name="user_id"
                        value={formData.user_id} 
                        className="pr-input"
                        placeholder="User ID"
                        readOnly
                      />
                  </div>
                  <div className="pr-field">
                      <label className="pr-label">Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="pr-input"
                        placeholder="Name"
                        readOnly
                        required
                      />
                  </div>
              </div>
              <div className="pr-grid-two">
                <div className="pr-field">
                    <label className="pr-label">Branch</label>
                    <input
                      type="text"
                      id="branch"
                      name="branch"
                      value={formData.branch}
                      onChange={handleChange}
                      className="pr-input"
                      placeholder="Branch"
                      readOnly
                      required
                    />
                </div>
                <div className="pr-field">
                    <label className="pr-label">Department</label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="pr-input"
                      placeholder="Department"
                      readOnly
                      required
                    />
                </div>
              </div>
              <div className="pr-grid-two">
                <div className="pr-field">
                    <label className="pr-label">Date Needed</label>
                    <input
                      type="date"
                      id="branch"
                      name="date_needed"
                      value={formData.date_needed}
                      onChange={handleChange}
                      className="pr-input"
                      placeholder="Employee ID"
                      required
                    />
                </div>
                <div className="pr-field">
                </div>
              </div>
            </section>

            <section className="pr-form-section" id="details">
              <div className="pr-grid-two">
                <div className="pr-field">
                  <label className="pr-label">Description of Work Required</label>
                  <textarea
                    id="workDescription"
                    name="work_description"
                    value={formData.work_description}
                    onChange={handleChange}
                    className="pr-textarea"
                    placeholder="Work Description"
                    rows={4}
                    required
                  />
                </div>
              </div>
              <div className="pr-grid-two">
                <div className="pr-field">
                    <label className="pr-label">Asset Tag/Code (if applicable)</label>
                    <input
                      type="text"
                      id="assetTag"
                      name="asset_tag"
                      value={formData.asset_tag}
                      onChange={handleChange}
                      className="pr-input"
                      placeholder="Asset Tag / Code"
                    />
                </div>
                {/* <div className="pr-field">
                </div> */}
              </div>
            </section>


            <section className="pr-form-section" id="signature">
              <div className="pr-grid-two">
                <div className="pr-field">
                  <label className="pr-label">Request by:</label>
                  <input type="text" name="requested_by" className="pr-input" value={userData.name || ""} required readOnly/>
                </div>

                <div className="pr-field receive-signature">
                  <label className="pr-label">Signature</label>
                  <input type="text" name="request_signature" className="pr-input received-signature" value={userData.signature || ""} readOnly />
                  {userData.signature ? (
                    <img
                      src={`${API_BASE_URL}/uploads/signatures/${userData.signature}`}
                      alt="Signature"
                      className="img-sign"/>
                      ) : (
                          <p>No signature available</p>
                    )}
                </div>
              </div>
            </section>

            <div className="pr-form-actions">
              <button type="submit" className="pr-submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Maintenance / Repair Request"}
              </button>
            </div>
        </form>
      </main>
    </div>
  );
}

export default MaintenanceRepair;
