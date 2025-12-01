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
  requested_days: 1
};

const NAV_SECTIONS = [
  { id: "pr-main", label: "New Leave Application" },
  { id: "submitted", label: "Leave Request Reports" }
];

function LeaveApplication({ onLogout }) {
  const [formData, setFormData] = useState(initialFormData);
  const [availableDays, setAvailableDays] = useState(0);
  const [requestedDays, setRequestedDays] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({});
  const [message, setMessage] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
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
          employee_id: data.employee_id || "",
          name: data.name || "",
          branch: data.branch || "",
          department: data.department || "",
          position: data.position || "",
          requested_by: data.name || "",
          requested_signature: data.signature || ""
        }));
      })
      .catch((err) => console.error("Error fetching user:", err));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/leave_application/next-code`)
      .then((res) => res.json())
      .then((data) => {
        if (data.nextCode) {
          setFormData((prev) => ({
            ...prev,
            laf_request_code: data.nextCode
          }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/leave_types`)
      .then((res) => res.json())
      .then((data) => setLeaveTypes(data));
  }, []);

  const calculateDays = (from, to) => {
    const diff =
      Math.floor(
        (new Date(to).getTime() - new Date(from).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    return diff > 0 ? diff : 1;
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;

    // ⭐ SKIP REMAINING DAYS CHECK WHEN "Others"
    if (name === "leave_type") {
      if (value === "Others") {
        setAvailableDays(999); // optional placeholder
        setFormData((prev) => ({ ...prev, leave_type: value }));
        return;
      }

      const selected = leaveTypes.find((lt) => lt.leave_type === value);

      if (selected) {
        fetch(
          `${API_BASE_URL}/api/user_leaves/${formData.user_id}/${selected.leave_type}`
        )
          .then((res) => res.json())
          .then((bal) => {
            setAvailableDays(bal.leave_days || 0);
          });
      }

      setFormData((prev) => ({ ...prev, leave_type: value }));
      return;
    }

    if (name === "leave_date_from" || name === "leave_date_to") {
      const updated = {
        ...formData,
        [name]: value
      };

      const newDays = calculateDays(
        updated.leave_date_from,
        updated.leave_date_to
      );

      setRequestedDays(newDays);
      setFormData(updated);
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (formData.leave_type !== "Others") {
      if (requestedDays > availableDays) {
        setMessage({
          type: "error",
          text: `You only have ${availableDays} days remaining for this leave type.`
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/leave_application`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          requested_days: requestedDays
        })
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to submit leave application");

      setMessage({
        type: "success",
        text: "Leave application submitted successfully!"
      });

      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
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
          <h2
            onClick={() => navigate("/forms-list")}
            style={{ cursor: "pointer", color: "#007bff" }}
          >
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
              onClick={() => {
                if (section.id === "submitted")
                  navigate("/submitted-hr-leave-application");
              }}
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

      {/* -------- MAIN CONTENT -------- */}

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
            <span className="pr-label">{formData.laf_request_code}</span>

            <span className="car-reference-label">Request date</span>
            <span className="pr-label">
              {new Date(formData.request_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </span>
          </div>
        </header>

        {/* -------- FORM -------- */}

        <form onSubmit={handleSubmit} className="cash-receipt-form">
          <section className="car-form-section">
            <h2 className="pr-section-title">Requestor Details</h2>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label">Name</label>
                <input value={userData.name} className="pr-input" readOnly />
                <input type="hidden" name="user_id" value={formData.user_id} />
              </div>

              <div className="pr-field">
                <label className="pr-label">Employee ID</label>
                <input value={userData.employee_id} className="pr-input" readOnly />
              </div>
            </div>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label">Branch</label>
                <input value={userData.branch} className="pr-input" readOnly />
              </div>

              <div className="pr-field">
                <label className="pr-label">Department</label>
                <input value={userData.department} className="pr-input" readOnly />
              </div>
            </div>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label">Position</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>
            </div>
          </section>

          {/* -------- LEAVE DATE -------- */}

          <section className="car-form-section">
            <label className="pr-label">Leave Date</label>

            <div className="pr-grid-two">
              <div className="pr-field">
                <input
                  type="date"
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
                  name="leave_date_to"
                  value={formData.leave_date_to}
                  min={formData.leave_date_from}
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>
            </div>

            {/* ⭐ You may also hide this section for Others */}
            <p style={{ fontSize: "14px", marginTop: "8px" }}>
              <strong>Requested Days:</strong> {requestedDays} <br />
              <strong>Remaining Balance:</strong>{" "}
              {formData.leave_type === "Others" ? "N/A" : availableDays}
            </p>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label">Leave Type</label>

                <select
                  name="leave_type"
                  value={formData.leave_type}
                  onChange={handleChange}
                  className="pr-input"
                  required
                >
                  <option value="">-- Select Leave Type --</option>

                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.leave_type}>
                      {lt.leave_type}
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
                    value={formData.specify_other_leave_type}
                    onChange={handleChange}
                    className="pr-input"
                    required
                  />
                </div>
              )}
            </div>
          </section>

          <section className="car-form-section">
            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label">Requested by:</label>
                <input value={userData.name} className="car-input" readOnly />
              </div>

              <div className="pr-field receive-signature">
                <label className="pr-label">Signature</label>
                <input value={userData.signature || ""} className="car-input received-signature" readOnly />

                {userData.signature ? (
                  <img
                    src={`${API_BASE_URL}/uploads/signatures/${userData.signature}`}
                    alt="Signature"
                    className="img-sign"
                  />
                ) : (
                  <p className="img-sign-prf empty-sign"></p>
                )}
              </div>
            </div>
          </section>

          <section className="car-form-section">
            <div style={{ border: "1px solid #ccc", borderRadius: "15px" }}>
              <ul>
                <li><strong>Vacation Leave:</strong> Must be filed 7 days before leave date.</li>
                <li><strong>Sick Leave:</strong> Must be filed within 3 days with medical certificate.</li>
                <li><strong>Emergency Leave:</strong> Must be filed within 3 days.</li>
                <li><strong>Maternity/Paternity Leave:</strong> Must be filed within 7 days.</li>
                <li><strong>Bereavement Leave:</strong> Must be filed within 7 days.</li>
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
