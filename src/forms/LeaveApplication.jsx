import { useEffect, useState } from "react";
import "./styles/LeaveApplication.css";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";

const today = new Date().toISOString().split("T")[0];

const initialFormData = {
  laf_request_code: "",
  request_date: today,
  user_id: "",
  employee_id: "",
  name: "",
  branch: "",
  department: "",
  position: "",
  leave_type: "",
  leave_date_from: today, 
  leave_date_to: today, 
  specify_other_leave_type: "",
  requested_by: "",
  requested_signature: "",
};


const NAV_SECTIONS = [
  { id: "pr-main", label: "New Leave Application" },
  { id: "submitted", label: "View Submitted Requests" },
];

function LeaveApplication({ onLogout }) {
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({});
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

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
          received_by: data.name || "",
          received_signature: data.signature || "",
        }));
      })
      .catch((err) => console.error("Error fetching user data:", err));
  }, []);

  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/leave_application/next-code`);
        const data = await res.json();
        if (data.nextCode)
          setFormData((prev) => ({ ...prev, laf_request_code: data.nextCode }));
      } catch (error) {
        console.error("Error getting next CAR code:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNextCode();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/leave_application`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit receipt");

      setMessage({ type: "success", text: "Leave application submitted successfully!" });
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

  const [leaveTypes, setLeaveTypes] = useState([]);

    useEffect(() => {
      fetch(`${API_BASE_URL}/api/leave_types`)
        .then((res) => res.json())
        .then((data) => setLeaveTypes(data))
        .catch((err) => console.error("Error fetching leave types:", err));
    }, []);

  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      navigate("/submitted-hr-leave-application"); 
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
        <span>Loading Leave Application Form...</span>
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
          <h2 onClick={() => navigate("/forms-list")} style={{ cursor: "pointer", color: "#007bff" }}>
            Leave Application Form
          </h2>
          <span>Standardized Form</span>
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
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Leave Application Form</h1>
            <p className="pr-topbar-meta">
              File a leave request and track endorsements through HR.
            </p>
          </div>

          <div className="car-reference-card">
            <span className="car-reference-label">Reference code</span>
            <span className="pr-label">
              {formData.laf_request_code || "—"}
            </span>
            <span className="car-reference-label">Request date</span>
            <span className="pr-label">
              {new Date(formData.request_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="cash-receipt-form">
          <section className="car-form-section">
            <h2 className="pr-section-title">Requestor Details</h2>
            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  value={userData.name}
                  onChange={handleChange}
                  className="pr-input"
                  readOnly
                  required
                />
                <input
                  type="hidden"
                  id="requestById"
                  name="user_id"
                  value={formData.user_id} 
                  className="pr-input"
                  readOnly
                />
              </div>
                

              <div className="pr-field">
                <label className="pr-label" htmlFor="employeeID">
                  Employee ID
                </label>
                <input
                  id="employeeID"
                  name="employee_id"
                  value={userData.employee_id}
                  className="pr-input"
                  readOnly
                  required
                />
              </div>
            </div>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label">Branch</label>
                <input
                  id="branch"
                  name="branch"
                  value={userData.branch}
                  onChange={handleChange}
                  className="pr-input"
                  readOnly
                  required
                />
              </div>
              <div className="pr-field">
                <label className="pr-label">Department</label>
                <input
                  id="department"
                  name="department"
                  value={userData.department}
                  onChange={handleChange}
                  className="pr-input"
                  readOnly
                  required
                />
              </div>
            </div>
            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label">Position</label>
                <input
                  id="position"
                  name="position"
                  value={userData.position}
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>
              <div className="pr-field">
              </div>
            </div>
          </section>

          <section className="car-form-section">
            <label className="pr-label">Leave Date</label>
            <div className="pr-grid-two">
              <div className="pr-field">
                <input
                  type="date"
                  id="leave_date_from"
                  name="leave_date_from"
                  value={formData.leave_date_from}
                  min={today}
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>
              <div className="pr-field">
                <input
                  type="date"
                  id="leave_date_to"
                  name="leave_date_to"
                  value={formData.leave_date_to}
                  min={formData.leave_date_from} 
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>
            </div>
            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label">Leave Type (please select one below)</label>
                <select
                  name="leave_type"
                  value={formData.leave_type || ""}
                  onChange={handleChange}
                  className="pr-input"
                  required
                >
                  <option value="" disabled>-- Select Leave Type --</option>

                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.leave_type}>
                      {lt.leave_type} ({lt.leave_days} days)
                    </option>
                  ))}

                  <option value="Others">Others (Specify)</option>
                </select>
              </div>

              {formData.leave_type === "Others" && (
                <div className="pr-field">
                  <label className="pr-label">Specify Other Leave Type</label>
                  <input
                    type="text"
                    name="specify_other_leave_type"
                    value={formData.specify_other_leave_type || ""}
                    onChange={handleChange}
                    className="pr-input"
                    required
                  />
                </div>
              )}
            </div>
          </section>

          <section className="car-form-section" id="signature">
              <div className="pr-grid-two">
                <div className="pr-field">
                  <label className="pr-label">Requested by:</label>
                  <input type="text" name="requested_by" className="car-input" value={userData.name || ""} required readOnly/>
                </div>

                <div className="pr-field receive-signature">
                  <label className="pr-label">Signature</label>
                  <input type="text" name="requested_signature" className="car-input received-signature" value={userData.signature || ""} readOnly />
                  {userData.signature ? (
                    <img
                      src={`${API_BASE_URL}/uploads/signatures/${userData.signature}`}
                      alt="Signature"
                      className="img-sign"/>
                      ) : (
                          <p className="img-sign-prf empty-sign"></p>
                    )}
                </div>
              </div>
          </section>

          <section className="car-form-section" id="signature">
            <div style={{border: '1px solid #e6e6e6ff', borderRadius: '15px'}}>
              <ul>
                <li><strong>Vacation Leave:</strong> Must be filed seven (7) days before the planned leave</li>
                <li><strong>Sick Leave:</strong> Inform immediate head. Must be filed within three (3) days after leave date. Medical certificate must be attached.</li>
                <li><strong>Emergency Leave:</strong> Inform immediate head. Must be filed within three (3) days after leave date. </li>
                <li><strong>Maternity or Paternity Leave:</strong> Must be filed within seven (7) days after leave date. Birth certificate must be attached.</li>
                <li><strong>Bereavement Leave:</strong> Must be filed within seven (7) days after leave date. Death certificate must be attached. </li>
              </ul>
            </div>
          </section>

          <div className="pr-form-actions">
            <button type="submit" className="pr-submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Leave Application"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default LeaveApplication;
