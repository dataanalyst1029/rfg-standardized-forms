import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import "./styles/submitted-request.css";
import "./styles/submitted-payment-request.css";
import "./styles/submitted-leave-application.css";

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

  // --- 1. REPLACED handlePrint FUNCTION ---
  // (No change to this function, it still needs to inject
  //  its own styles for the popup window)
  const handlePrint = () => {
    if (!cardRef.current) {
      return;
    }
    const printContents = cardRef.current.outerHTML;
    const printWindow = window.open("", "", "width=1000,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Leave Application - ${
            selectedRequest?.form_code || ""
          }</title>
          <style>
            /* --- ALL NEW STYLES FOR LAF LAYOUT --- */
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0.25in; 
              font-size: 10pt;
              background: #fff;
              color: #000;
            }
            .laf-card { 
              border: 1px solid #000; 
              padding: 0.25in; 
              margin: 0 auto; 
              max-width: 8in; 
            }
            .laf-header { 
              display: flex; 
              justify-content: center; /* Center title */
              align-items: flex-start; 
              position: relative; /* For doc num */
              border-bottom: 2px solid #000;
              padding-bottom: 0.1in;
              margin-bottom: 0.2in;
            }
            .laf-header-title { 
              font-size: 1.5rem; 
              font-weight: bold; 
              text-align: center;
              margin: 0;
            }
            .laf-header-doc-num { 
              position: absolute;
              top: 0;
              right: 0;
              font-weight: bold;
              font-size: 1.1rem;
            }
            
            .laf-grid-top {
              display: grid;
              grid-template-columns: 2fr 1.2fr;
              gap: 0.2in;
              width: 100%;
              margin-bottom: 0.2in;
            }
            
            .laf-box {
              border: 2px solid #000;
            }
            
            .laf-box-header {
              background: #000;
              color: #fff;
              padding: 4px 8px;
              font-weight: bold;
              font-size: 1.1rem;
            }

            .laf-box-content {
              padding: 8px;
            }

            .laf-table {
              width: 100%;
              border-collapse: collapse;
            }
            .laf-table th, .laf-table td {
              padding: 4px;
              border: 1px solid #999;
              vertical-align: top;
            }
            .laf-table th {
              text-align: left;
              width: 30%;
              font-weight: bold;
            }
            
            /* Box for Date Filed / Branch */
            .laf-table-inline {
              width: 100%;
              border-collapse: collapse;
            }
            .laf-table-inline th, .laf-table-inline td {
              border: 1px solid #000;
              padding: 6px 8px;
            }
            .laf-table-inline th {
              font-weight: bold;
              width: 40%;
            }

            /* Main Leave Details Box */
            .laf-leave-details {
              border: 2px solid #000;
              padding: 0.15in;
              margin-bottom: 0.2in;
            }
            .laf-leave-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0.2in;
            }
            .laf-leave-grid strong {
              font-size: 1.1rem;
              text-decoration: underline;
            }
            .laf-table-nested {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }
            .laf-table-nested th, .laf-table-nested td {
              border: 1px solid #999;
              padding: 4px;
              text-align: left;
            }
            .laf-table-nested th { width: 30%; font-weight: bold; }

            .laf-purpose-line {
              margin-top: 0.2in;
            }
            .laf-purpose-line strong {
              font-size: 1.1rem;
            }
            .laf-purpose-line p {
              min-height: 2.5rem;
              border-bottom: 1px solid #999;
              padding: 4px 0;
              margin: 0;
            }

            /* HR Box */
            .laf-hr-box {
              margin-bottom: 0.2in;
            }
            .laf-hr-grid {
              display: grid;
              grid-template-columns: 2fr 1fr;
              gap: 0.2in;
            }
            .laf-hr-remarks p {
              min-height: 4rem;
              border-bottom: 1px solid #999;
              margin: 0;
            }
            .laf-available-leaves {
              margin-top: 0.15in;
            }
            .laf-available-leaves p {
              margin: 4px 0;
              padding-left: 1rem;
            }

            /* Signature Section */
            .laf-sig-section {
              display: grid;
              grid-template-columns: 1.5fr 2fr;
              gap: 0.2in;
              margin-top: 0.1in;
            }
            .laf-sig-table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #000;
            }
            .laf-sig-table th, .laf-sig-table td {
              border: 1px solid #000;
              padding: 6px 8px;
              height: 2.5rem; /* Set height for sig boxes */
            }
            .laf-sig-table th {
              text-align: left;
              font-weight: bold;
              width: 40%;
            }
            .sig-cell {
              text-align: center;
              vertical-align: middle;
            }
            .signature-img {
              max-width: 120px;
              height: auto;
              margin: 0 auto;
              display: block;
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);

    // Need a timeout to allow styles to load before printing
    setTimeout(() => {
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }, 1000);
  };
  // --- END REPLACEMENT ---

  // --- 2. REPLACED renderBody FUNCTION ---
  // (No change to this function, it will now
  //  pick up the styles from the imported CSS file)
  const renderBody = () => {
    if (loading) {
      return <p>Loading submitted leave applications...</p>;
    }

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
          // --- NEW JSX LAYOUT MATCHING THE IMAGE ---
          <div className="laf-card" ref={cardRef}>
            {/* Header */}
            <header className="laf-header">
              <h1 className="laf-header-title">LEAVE APPLICATION FORM</h1>
              {/* --- MODIFICATION HERE: Show full form_code --- */}
              <div className="laf-header-doc-num">
                {selectedRequest.form_code}
              </div>
              {/* --- END MODIFICATION --- */}
            </header>

            {/* Top Grid: Requestor + Date Filed */}
            <div className="laf-grid-top">
              {/* Box 1: Requestor Details */}
              <div className="laf-box">
                <div className="laf-box-header">Requestor Details</div>
                <div className="laf-box-content">
                  <table className="laf-table">
                    <tbody>
                      <tr>
                        <th>Name</th>
                        <td>{displayText(selectedRequest.requester_name)}</td>
                      </tr>
                      <tr>
                        <th>Employee ID</th>
                        <td>{displayText(selectedRequest.employee_id)}</td>
                      </tr>
                      <tr>
                        <th>Position</th>
                        <td>{displayText(selectedRequest.position)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Box 2: Date Filed / Branch */}
              <div>
                <table className="laf-table-inline">
                  <tbody>
                    <tr>
                      <th>Date Filed</th>
                      <td>{formatDate(selectedRequest.request_date)}</td>
                    </tr>
                    <tr>
                      <th>Branch / Dept</th>
                      <td>
                        {displayText(selectedRequest.branch)} /{" "}
                        {displayText(selectedRequest.department)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

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
                <strong>Others (Purpose):</strong>
                <p>{displayText(selectedRequest.purpose)}</p>
              </div>
            </div>

            {/* HR Box */}
            <div className="laf-box laf-hr-box">
              <div className="laf-box-header">For HR</div>
              <div className="laf-box-content">
                <div className="laf-hr-grid">
                  <div className="laf-hr-remarks">
                    <strong>Remarks:</strong>
                    <p>{displayText(selectedRequest.hr_notes, "")}</p>
                  </div>
                  <div>
                    <strong>Date Received:</strong>
                    {/* No data for this in API, leaving blank */}
                    <p style={{ borderBottom: "1px solid #999" }}>&nbsp;</p>
                  </div>
                </div>
                <div className="laf-available-leaves">
                  <strong>Available Leave Days:</strong>
                  {/* These fields aren't in the API data, so showing blanks per image */}
                  <p>Vacation Leave: _________</p>
                  <p>Sick Leave: _________</p>
                  <p>Emergency Leave: _________</p>
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
          </div>
          // --- END NEW JSX LAYOUT ---
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
            type="button"
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
            {/* --- FIXED: Title --- */}
            <h1>Submitted Leave Applications</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view the request details.
            </p>
            {/* --- END FIX --- */}
          </div>

          {selectedRequest && (
            <button onClick={handlePrint} className="print-btn">
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