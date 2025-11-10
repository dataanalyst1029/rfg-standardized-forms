import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import "./styles/submitted-request.css";
import "./styles/submitted-payment-request.css";
import "./styles/submitted-maintenance-repair.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted Requests" }, // Updated label
  { id: "new-request", label: "New Maintenance/Repair Request" },
];

const formatDate = (value) => {
  if (!value) return "";
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

const displayText = (value, fallback = "-") => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const stringValue = typeof value === "string" ? value.trim() : String(value);
  return stringValue ? stringValue : fallback;
};

function SubmittedMaintenanceRepair({
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

  // This useEffect fetches the data
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
          params.append("userId", effectiveUserId); // This is the ID
        }

        const query = params.toString();
        const response = await fetch(
          `${API_BASE_URL}/api/maintenance_requests${query ? `?${query}` : ""}`,
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch submitted maintenance/repair requests.",
          );
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : [];

        // This filter logic is now correct, comparing employee_id
        const filtered = effectiveUserId
          ? list.filter(
              (request) =>
                String(request.employee_id).toLowerCase() ===
                String(storedUser.employee_id).toLowerCase(),
            )
          : list;

        setRequests(filtered);

        // --- MODIFICATION ---
        // We will no longer auto-select the first item.
        // We only persist the selection if it's still in the list,
        // otherwise, we reset to "" to force the user to choose.
        setSelectedCode((prev) => {
          if (prev && filtered.some((request) => request.form_code === prev)) {
            return prev;
          }
          // Default to empty string instead of the first item
          return "";
        });
      } catch (err) {
        console.error("Error fetching maintenance/repair requests", err);
        setError(
          err.message || "Unable to load submitted maintenance/repair requests.",
        );
        setRequests([]);
        setSelectedCode("");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [
    effectiveRole,
    effectiveUserId,
    showAll,
    storedUser.employee_id, // Switched from storedUser.name
  ]);

  const selectedRequest = requests.find(
    (request) => request.form_code === selectedCode,
  );

  const handleSelectChange = (event) => {
    setSelectedCode(event.target.value);
  };

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") {
      navigate("/forms/maintenance-or-repair");
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

  const handlePrint = () => {
    if (!cardRef.current) {
      return;
    }
    const printContents = cardRef.current.outerHTML;
    const printWindow = window.open("", "", "width=1000,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Maintenance/Repair Form - ${
            selectedRequest?.form_code || ""
          }</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0.25in; 
              font-size: 10pt;
            }
            .pay-print-card { 
              border: 1px solid #000; 
              padding: 0.25in; 
              margin: 0 auto; 
              max-width: 8in; 
              background: #fff;
              color: #000;
            }
            .pay-header { 
              display: flex; 
              justify-content: flex-end; /* Aligns code to the right */
              align-items: flex-start; 
              padding-bottom: 0.5rem; 
            }
            .pay-form-code { 
              font-weight: bold; 
              font-size: 1.1rem; 
              border: 1px solid #000;
              padding: 5px 10px;
            }
            .pay-header-title { 
              font-size: 1.5rem; 
              font-weight: bold; 
              text-align: center;
              width: 100%;
              padding-bottom: 0.25in;
              margin-top: 0;
            }
            
            /* NEW MRF STYLES */
            .mrf-section-header {
              background: #000;
              color: #fff;
              font-weight: bold;
              padding: 6px 10px;
              font-size: 1rem;
              margin-top: 0.25in;
              margin-bottom: 0.15in;
            }
            .mrf-grid-two {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0.5in;
              width: 100%;
            }
            .mrf-field-inline {
              display: flex;
              align-items: center;
              margin-bottom: 10px;
            }
            .mrf-field-inline label {
              font-weight: bold;
              padding-right: 10px;
              width: 150px; /* Fixed width for alignment */
              flex-shrink: 0;
            }
            .mrf-value-box {
              border: 1px solid #000;
              width: 100%;
              min-height: 24px;
              padding: 5px 8px;
              background: #fff; /* Ensure it's white for printing */
            }
            .mrf-field-block {
              margin-top: 0.25in;
            }
            .mrf-field-block .mrf-value-box {
              min-height: 6rem;
            }
            .mrf-field-block.small .mrf-value-box {
              min-height: 2rem;
            }
            .mrf-field-block label {
              font-weight: bold;
              display: block;
              margin-bottom: 5px;
            }
            
            .mrf-completion-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0.5in;
              align-items: center;
              margin-top: 0.15in;
            }
            
            .mrf-sig-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 0.25in;
              border: 1px solid #000;
            }
            .mrf-sig-table th, .mrf-sig-table td {
              border: 1px solid #000;
              padding: 6px 10px;
              text-align: left;
              height: 2.5rem;
              vertical-align: top;
            }
            .mrf-sig-table th {
              font-weight: bold;
              width: 150px;
            }
            .mrf-sig-table td {
              text-align: center;
              vertical-align: middle;
            }

            .signature-img {
              max-width: 120px;
              height: auto;
              margin: 0 auto;
              display: block;
            }
            .mrf-sig-container {
              display: grid;
              grid-template-columns: 1.2fr 1fr;
              gap: 0.5in;
              margin-top: 0.25in;
            }
            .mrf-sig-box {
              border: 1px solid #000;
              height: 4rem;
              text-align: center;
              vertical-align: middle;
            }
            .mrf-sig-table-left th {
              width: 120px;
              padding: 8px;
            }
            .mrf-sig-table-left td {
              padding: 8px;
              text-align: left;
              vertical-align: middle;
            }
             .mrf-sig-table-right th {
              width: 80px;
              padding: 8px;
            }
            .mrf-sig-table-right td {
              padding: 8px;
              height: 2.5rem;
              text-align: center;
              vertical-align: middle;
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);

    setTimeout(() => {
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }, 1000);
  };

  const renderBody = () => {
    if (loading) {
      return <p>Loading submitted maintenance/repair requests...</p>;
    }

    if (error) {
      return <p className="pr-error-message">{error}</p>;
    }

    if (requests.length === 0) {
      return (
        <p>
          No submitted maintenance/repair requests found for your account.
        </p>
      );
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
            {requests.map((request) => (
              <option key={request.form_code} value={request.form_code}>
                {request.form_code}
              </option>
            ))}
          </select>
        </div>

        {selectedRequest ? (
          <div className="pay-print-card" ref={cardRef}>
            <header className="pay-header">
              <div className="pay-form-code">
                {selectedRequest.form_code}
              </div>
            </header>

            <h1 className="pay-header-title">MAINTENANCE/REPAIR FORM</h1>

            {/* --- Requestor Details --- */}
            <div className="mrf-section-header">Requestor Details</div>
            <div className="mrf-grid-two">
              <div className="mrf-col-left">
                <div className="mrf-field-inline">
                  <label>Name</label>
                  <div className="mrf-value-box">
                    {displayText(selectedRequest.requester_name)}
                  </div>
                </div>
                <div className="mrf-field-inline">
                  <label>Employee ID</label>
                  <div className="mrf-value-box">
                    {displayText(selectedRequest.employee_id)}
                  </div>
                </div>
                <div className="mrf-field-inline">
                  <label>Branch / Dept</label>
                  <div className="mrf-value-box">
                    {displayText(selectedRequest.branch)} /{" "}
                    {displayText(selectedRequest.department)}
                  </div>
                </div>
              </div>

              <div className="mrf-col-right">
                <div className="mrf-field-inline">
                  <label>Date</label>
                  <div className="mrf-value-box">
                    {formatDate(selectedRequest.request_date)}
                  </div>
                </div>
                <div className="mrf-field-inline">
                  <label>Signature</label>
                  <div
                    className="mrf-value-box"
                    style={{ textAlign: "center" }}
                  >
                    {selectedRequest.signature ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.signature}`}
                        alt="Requester signature"
                        className="signature-img"
                      />
                    ) : (
                      "N/A"
                    )}
                  </div>
                </div>
                <div className="mrf-field-inline">
                  <label>Date Needed</label>
                  <div className="mrf-value-box">
                    {formatDate(selectedRequest.date_needed)}
                  </div>
                </div>
              </div>
            </div>

            {/* --- Description of Work --- */}
            <div className="mrf-field-block">
              <label className="mrf-section-header">
                Description of Work Required
              </label>
              <div className="mrf-value-box">
                {displayText(selectedRequest.work_description, "")}
              </div>
            </div>

            {/* --- Asset Tag --- */}
            <div className="mrf-field-block small">
              <label>Asset Tag/Code (if applicable)</label>
              <div className="mrf-value-box">
                {displayText(selectedRequest.asset_tag, "")}
              </div>
            </div>

            {/* --- Completion Info --- */}
            <div className="mrf-section-header">Completion Information</div>
            <div className="mrf-completion-grid">
              <div className="mrf-field-inline">
                <label>Performed By</label>
                <div className="mrf-value-box">
                  {displayText(selectedRequest.performed_by, "")}
                </div>
              </div>
              <div className="mrf-field-inline">
                <label>Date Completed</label>
                <div className="mrf-value-box">
                  {formatDate(selectedRequest.date_completed)}
                </div>
              </div>
            </div>
            <div className="mrf-field-block">
              <label>Remarks</label>
              <div className="mrf-value-box">
                {displayText(selectedRequest.completion_remarks, "")}
              </div>
            </div>

            {/* --- Signature Tables --- */}
            <div className="mrf-sig-container">
              <table className="mrf-sig-table mrf-sig-table-left">
                <tbody>
                  <tr>
                    <th>Requested by</th>
                    <td>
                      {displayText(selectedRequest.requester_name, "")}
                    </td>
                  </tr>
                  <tr>
                    <th>Approved by</th>
                    <td>{displayText(selectedRequest.approved_by, "")}</td>
                  </tr>
                  <tr>
                    <th>Accomplished by</th>
                    <td>
                      {displayText(selectedRequest.accomplished_by, "")}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="mrf-sig-table mrf-sig-table-right">
                <tbody>
                  <tr>
                    <th>Signature</th>
                    <td>
                      {/* Requester sig already shown above, 
                                but duplicating here to match image's table layout */
                      selectedRequest.signature ? (
                        <img
                          src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.signature}`}
                          alt="Requester signature"
                          className="signature-img"
                        />
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Signature</th>
                    <td>
                      {/* Assuming 'approved_signature' field exists */
                      selectedRequest.approved_signature ? (
                        <img
                          src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.approved_signature}`}
                          alt="Approved signature"
                          className="signature-img"
                        />
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Signature</th>
                    <td>
                      {/* Assuming 'accomplished_signature' field exists */
                      selectedRequest.accomplished_signature ? (
                        <img
                          src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.accomplished_signature}`}
                          alt="Accomplished signature"
                          className="signature-img"
                        />
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          ""
        )}
      </>
    );
  };

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2
            onClick={() => navigate("/forms-list")}
            style={{ cursor: "pointer", color: "#007bff" }}
          >
            Maintenance/Repair
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
            Review your form submissions.
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
            <h1>Submitted Maintenance/Repair Requests</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view the request details.
            </p>
          </div>

          {/* This logic was already correct and will work with the changes */}
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

export default SubmittedMaintenanceRepair;