import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import "./styles/submitted-request.css";
import "./styles/submitted-payment-request.css";
import "./styles/submitted-leave-application.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted Leave Applications" },
  { id: "new-request", label: "New Leave Application" },
];

// --- MODIFIED ---
const formatDate = (value) => {
  if (!value) return ""; // Was "-", now ""
  // Check if value is already just a date 'YYYY-MM-DD'
  if (typeof value === "string" && value.length === 10 && value.includes("-")) {
    const parts = value.split("-");
    if (parts.length === 3) {
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          // Corrected typo here
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const normalized = String(value).replace(" ", "T").replace(/\//g, "-");
    const fallback = new Date(normalized);
    if (Number.isNaN(fallback.getTime())) {
      return value;
    }
    return fallback.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
// --- END MODIFICATION ---

const displayText = (value, fallback = "-") => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const stringValue = typeof value === "string" ? value.trim() : String(value);
  return stringValue ? stringValue : fallback;
};

// --- NEW HELPER FUNCTION ---
// Helper function to convert a string to Proper Case
const toProperCase = (str) => {
  if (!str) return "";
  return str
    .toLowerCase() // Make the whole string lowercase
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize the first letter of each word
};
// --- END NEW HELPER ---

function SubmittedLeaveApplication({
  onLogout,
  currentUserId,
  showAll = false,
}) {
  const navigate = useNavigate();
  const storedUser = useMemo(
    () => JSON.parse(sessionStorage.getItem("user") || "{}"),
    [],
  );

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCode, setSelectedCode] = useState("");
  const cardRef = useRef(null);

  const effectiveUserId = showAll
    ? null
    : currentUserId || storedUser.id || null;
  const effectiveRole = storedUser.role || "";

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (effectiveRole) {
          params.append("role", effectiveRole);
        }
        if (effectiveUserId) {
          params.append("userId", effectiveUserId);
        }

        const query = params.toString();
        const response = await fetch(
          `${API_BASE_URL}/api/leave_requests${query ? `?${query}` : ""}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch leave application requests.");
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : [];

        // --- FIXED: Filter by requester_name ---
        const filtered = effectiveUserId
          ? list.filter(
              (request) =>
                String(request.requester_name).toLowerCase() ===
                String(storedUser.name).toLowerCase(),
            )
          : list;
        // --- END FIX ---

        setRequests(filtered);
        setSelectedCode((prev) => {
          if (prev && filtered.some((request) => request.form_code === prev)) {
            return prev;
          }
          return "";
        });
      } catch (err) {
        console.error("Error fetching leave application requests.", err);
        setError(err.message || "Unable to load leave application requests.");
        setRequests([]);
        setSelectedCode("");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [effectiveRole, effectiveUserId, showAll, storedUser.name]);

  const selectedRequest = requests.find(
    (request) => request.form_code === selectedCode,
  );

  // --- MODIFIED: Use Leave Application fields ---
  const requesterNameValue = displayText(selectedRequest?.requester_name, "");
  const requestDateValue = formatDate(selectedRequest?.request_date);
  const requesterSignatureValue = selectedRequest?.signature;

  const endorsedByValue = displayText(selectedRequest?.endorsed_by, "");
  // const endorsedDateValue = formatDate(selectedRequest?.endorsed_at);
  // Assuming no endorser signature in API
  // const endorsedSignatureValue = selectedRequest?.endorsed_signature;

  const approvedByValue = displayText(selectedRequest?.approved_by, "");
  // const approvedDateValue = formatDate(selectedRequest?.approved_at);
  // Assuming no approver signature in API
  // const approvedSignatureValue = selectedRequest?.approved_signature;
  // --- END MODIFICATION ---

  const handleSelectChange = (event) => {
    setSelectedCode(event.target.value);
  };

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") {
      navigate("/forms/hr-leave-application");
    }
  };

  const handleResolvedLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    sessionStorage.removeItem("user");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading submitted leave applications...</span>
      </div>
    );
  }

  const renderBody = () => {
    if (error) {
      return <p className="pr-error-message">{error}</p>;
    }

    if (requests.length === 0) {
      return <p>No submitted leave applications found.</p>;
    }

    return (
      <>
        <div className="dropdown-section" style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="itsRequestSelect">Select Reference No: </label>
          <select
            id="itsRequestSelect"
            value={selectedCode}
            onChange={handleSelectChange}
            className="pr-input"
          >
            <option value="" disabled>
              -- Choose Reference Number --
            </option>
            {/* --- Using toProperCase helper --- */}
            {requests.map((request) => (
              <option key={request.form_code} value={request.form_code}>
                {request.form_code} (Type:{" "}
                {toProperCase(request.leave_type)})
              </option>
            ))}
          </select>
        </div>

        {selectedRequest && (
          // --- NEW: Added Fragment to wrap card + status ---
          <>
            <div className="laf-record-request" ref={cardRef}>
              <header className="request-header submitted-leave-header">
                <div className="header-brand">
                  <img
                    src={rfgLogo}
                    alt="Ribshack Food Group"
                    className="header-logo"
                  />
                </div>
                <div className="header-request-code">
                  <i className="request-code">{selectedRequest.form_code}</i>
                </div>
              </header>

              {/* --- MODIFICATION: Replaced laf-grid-top with a single table --- */}
              <div className="laf-box" style={{ marginBottom: "0.2in" }}>
                <div className="laf-box-header">REQUESTOR DETAILS</div>
                  <table className="laf-table">
                    <tbody>
                      <tr>
                        <th>Name</th>
                        <td>{displayText(selectedRequest.requester_name)}</td>
                        <th>Date Filed</th>
                        <td>{formatDate(selectedRequest.request_date)}</td>
                      </tr>
                      <tr>
                        <th>Employee ID</th>
                        <td>{displayText(selectedRequest.employee_id)}</td>
                        <th>Branch</th>
                        <td>{displayText(selectedRequest.branch)}</td>
                      </tr>
                      <tr>
                        <th>Position</th>
                        <td>{displayText(selectedRequest.position)}</td>
                        <th>Department</th>
                        <td>{displayText(selectedRequest.department)}</td>
                      </tr>
                    </tbody>
                  </table>
              </div>
              {/* --- END MODIFICATION --- */}

              {/* Leave Details Box */}
              <div className="laf-leave-details">
                <div className="laf-leave-grid">
                  <div>
                    <strong>Leave Type</strong>
                    <p style={{ paddingLeft: "1rem" }}>
                      {toProperCase(selectedRequest.leave_type)}
                    </p>
                  </div>
                  <div>
                    <strong>Leave Date(s)</strong>
                    <table className="laf-table-nested">
                      <tbody>
                        <tr>
                          <th>Start</th>
                          <td>{formatDate(selectedRequest.leave_start)}</td>
                        </tr>
                        <tr>
                          <th>End</th>
                          <td>{formatDate(selectedRequest.leave_end)}</td>
                        </tr>
                        <tr>
                          <th>Hours</th>
                          <td>{displayText(selectedRequest.leave_hours)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="laf-purpose-line">
                  <strong>Remarks/Purpose:</strong>
                  <p>{displayText(selectedRequest.purpose)}</p>
                </div>
              </div>

              {/* HR Box */}
              <div className="laf-box laf-hr-box">
                <div className="laf-box-header">FOR HR</div>
                <div className="laf-box-content">
                  <div className="laf-hr-grid">
                    <div className="laf-hr-remarks">
                      <strong>Remarks:</strong>
                      <p>{displayText(selectedRequest.hr_notes, "")}</p>
                    </div>
                    <div>
                      <strong>Date Received:</strong>
                      {/* No data for this in API, leaving blank */}
                      <p style={{ borderBottom: "1px solid #55555535" }}>&nbsp;</p>
                    </div>
                  </div>
                  <div className="laf-available-leaves">
                    <strong>Available Leave Days:</strong>
                    {/* These fields aren't in the API data, so showing blanks per image */}
                    <p>_________ Vacation Leave </p>
                    <p>_________ Sick Leave</p>
                    <p>_________ Emergency Leave</p>
                  </div>
                </div>
              </div>

              {/* Signature Section */}
              <div className="laf-sig-section">
                <table className="laf-sig-table">
                  <tbody>
                    <tr>
                      <th>Requested by:</th>
                      <td>{requesterNameValue}</td>
                    </tr>
                    <tr>
                      <th>Endorsed by:</th>
                      <td>{endorsedByValue}</td>
                    </tr>
                    <tr>
                      <th>Approved by (HR):</th>
                      <td>{approvedByValue}</td>
                    </tr>
                  </tbody>
                </table>
                <table className="laf-sig-table">
                  <tbody>
                    <tr>
                      <th>Signature:</th>
                      <td className="sig-cell">
                        {requesterSignatureValue ? (
                          <img
                            src={`${API_BASE_URL}/uploads/signatures/${requesterSignatureValue}`}
                            alt="Signature"
                            className="signature-img"
                          />
                        ) : null}
                      </td>
                    </tr>
                    <tr>
                      <th>Signature:</th>
                      <td className="sig-cell">
                        {/* No endorser sig in data */}
                      </td>
                    </tr>
                    <tr>
                      <th>Signature:</th>
                      <td className="sig-cell">
                        {/* No approver sig in data */}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* --- MODIFIED: STATUS INDICATOR --- */}
              {/* This now uses the exact JSX and classnames from SubmittedPaymentRequests.jsx */}
              {(selectedRequest.status || selectedRequest.decline_reason) && (
                <div
                  className={`floating-decline-reason ${selectedRequest.status?.toLowerCase()}`}
                >
                  <div className="floating-decline-content">
                    {selectedRequest.status && (
                      <p className="status-text">
                        <strong>Status:</strong> {selectedRequest.status}
                      </p>
                    )}
                    {selectedRequest.decline_reason && (
                      <>
                        <strong>Declined Reason:</strong>
                        <p>{selectedRequest.decline_reason}</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* --- END STATUS INDICATOR --- */}
            </div>
          </>
          // --- END NEW FRAGMENT ---
        )}
      </>
    );
  };
  // --- END REPLACEMENT ---

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2
            onClick={() => navigate("/forms-list")}
            style={{ cursor: "pointer", color: "#007bff" }}
          >
            Leave Application
          </h2>
          <span>Submitted</span>
        </div>

        <nav className="pr-sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === "submitted" ? "is-active" : ""}
              onClick={() => handleNavigate(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="pr-sidebar-footer">
          <span className="pr-sidebar-meta">
            Review your leave application submissions.
          </span>
          <button
            type= "button"
            className="pr-sidebar-logout"
            onClick={handleResolvedLogout}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Submitted Leave Applications</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view the request details.
            </p>
          </div>

          {selectedRequest && (
            <button onClick={() => window.print()} className="print-btn">
              🖨️ Print
            </button>
          )}
        </header>

        <div className="submitted-requests-container">{renderBody()}</div>
      </main>
    </div>
  );
}

export default SubmittedLeaveApplication;