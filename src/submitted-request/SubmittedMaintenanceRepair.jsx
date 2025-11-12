import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import "./styles/submitted-request.css";
import "./styles/submitted-payment-request.css";
// This CSS file will now be a copy of the interbranch one
import "./styles/submitted-maintenance-repair.css"; 
import rfgLogo from "../assets/rfg_logo.png"; // <-- Added logo import

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted Requests" },
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

// --- MODIFICATION: Reverted function to default, will add "" in calls ---
const displayText = (value, fallback = "-") => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const stringValue = typeof value === "string" ? value.trim() : String(value);
  return stringValue ? stringValue : fallback;
};
// --- END MODIFICATION ---

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
          `${API_BASE_URL}/api/maintenance_requests${query ? `?${query}` : ""}`,
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch submitted maintenance/repair requests.",
          );
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : [];

        const filtered = effectiveUserId
          ? list.filter(
              (request) =>
                String(request.employee_id).toLowerCase() ===
                String(storedUser.employee_id).toLowerCase(),
            )
          : list;

        setRequests(filtered);

        setSelectedCode((prev) => {
          if (prev && filtered.some((request) => request.form_code === prev)) {
            return prev;
          }
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
    storedUser.employee_id,
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
    window.print();
  };
  
  const handleAccomplish = async (request) => {
    try {
      if (!request?.id) {
        alert("Missing request ID. Cannot update status.");
        console.error("Missing request ID:", request);
        return;
      }

      const confirmAccomplish = window.confirm(
        `Mark ${request.form_code} as Accomplished?`,
      );
      if (!confirmAccomplish) return;

      console.log("Updating maintenance request:", request.id);

      const userRes = await fetch(
        `${API_BASE_URL}/api/users/${effectiveUserId}`,
      );
      if (!userRes.ok) throw new Error("Failed to fetch user data");
      const userData = await userRes.json();

      const payload = {
        status: "Accomplished",
        accomplished_by: userData.name,
        accomplished_signature: userData.signature,
        date_completed: new Date().toISOString(),
        performed_by: userData.name, 
      };

      const res = await fetch(
        `${API_BASE_URL}/api/maintenance_requests/${request.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      let data = {};
      try {
        data = await res.json();
      } catch {
        console.warn("Non-JSON response from backend");
      }

      if (!res.ok) {
        console.error("Backend response error:", data);
        alert(`Failed to update status: ${data.error || "Unknown error"}`);
        return;
      }

      alert(`Maintenance Request ${request.form_code} marked as Accomplished ✅`);

      setRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, ...payload } : r)),
      );
    } catch (err) {
      console.error("Error accomplishing maintenance request:", err);
      alert("Error updating status. Check console for details.");
    }
  };

  if (loading) {
      return (
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading submitted maintenance/repair requests…</span>
        </div>
      );
    }

  const renderBody = () => {


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
          <label htmlFor="mrfRequestSelect">Select Reference No: </label>
          <select
            id="mrfRequestSelect"
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
          // --- STYLING: Using ITS classes ---
          <div className="mrf-record-request" ref={cardRef}>
            <header className="mrf-request-header">
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

            {/* --- Requestor Details (using ITS table layout) --- */}
            <div 
              className="mrf-transport-header"
              style={{ marginTop: "1rem" }}
            >
              Requestor Details
            </div>
            <div className="mrf-grid-two">
              <div className="mrf-col-left">
                <table className="mrf-info-table">
                  <tbody>
                    {/* --- MODIFICATION: Added "" fallback --- */}
                    <tr>
                      <th>Name</th>
                      <td>{displayText(selectedRequest.requester_name, "")}</td>
                    </tr>
                    <tr>
                      <th>Employee ID</th>
                      <td>{displayText(selectedRequest.employee_id, "")}</td>
                    </tr>
                    <tr>
                      <th>Branch / Department</th>
                      <td>
                        {displayText(selectedRequest.branch, "")} /{" "}
                        {displayText(selectedRequest.department, "")}
                      </td>
                    </tr>
                    {/* --- END MODIFICATION --- */}
                  </tbody>
                </table>
              </div>
              <div className="mrf-col-right">
                <table className="mrf-info-table">
                  <tbody>
                    {/* --- MODIFICATION: Added "" fallback --- */}
                    <tr>
                      <th>Date</th>
                      <td>{formatDate(selectedRequest.request_date)}</td>
                    </tr>
                    <tr>
                      <th>Date Needed</th>
                      <td>{formatDate(selectedRequest.date_needed)}</td>
                    </tr>
                    <tr>
                      <th>Asset Tag/Code</th>
                      <td>{displayText(selectedRequest.asset_tag, "")}</td>
                    </tr>
                    {/* --- END MODIFICATION --- */}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- Description of Work (using new block style) --- */}
            <div className="mrf-transport-header">
              Description of Work Required
            </div>
            <div className="mrf-field-block">
              {/* --- MODIFICATION: Added "" fallback --- */}
              <p>{displayText(selectedRequest.work_description, "")}</p>
              {/* --- END MODIFICATION --- */}
            </div>
            
            {/* --- Completion Info (using ITS table layout) --- */}
            <div className="mrf-transport-header">Completion Information</div>
            <div className="mrf-grid-two">
              <div className="mrf-col-left">
                <table className="mrf-info-table">
                  <tbody>
                    {/* --- MODIFICATION: Added "" fallback --- */}
                    <tr>
                      <th>Performed By</th>
                      <td>{displayText(selectedRequest.performed_by, "")}</td>
                    </tr>
                    {/* --- END MODIFICATION --- */}
                  </tbody>
                </table>
              </div>
              <div className="mrf-col-right">
                <table className="mrf-info-table">
                  <tbody>
                    <tr>
                      <th>Date Completed</th>
                      <td>{formatDate(selectedRequest.date_completed)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mrf-transport-header">
              Completion Remarks
            </div>
            <div className="mrf-field-block">
              {/* --- MODIFICATION: Added "" fallback --- */}
              <p>{displayText(selectedRequest.completion_remarks, "")}</p>
              {/* --- END MODIFICATION --- */}
            </div>


            {/* --- Signature Table (using ITS sig table layout) --- */}
            <table className="mrf-sig-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Signature</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {/* --- MODIFICATION: Added "" fallback --- */}
                <tr>
                  <th>Requested by</th>
                  <td>{displayText(selectedRequest.requester_name, "")}</td>
                  <td className="sig-box">
                    {selectedRequest.signature ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.signature}`}
                        alt="Requester signature"
                        className="signature-img"
                      />
                    ) : null}
                  </td>
                  <td>{formatDate(selectedRequest.request_date)}</td>
                </tr>
                <tr>
                  <th>Approved by</th>
                  <td>{displayText(selectedRequest.approved_by, "")}</td>
                  <td className="sig-box">
                    {selectedRequest.approved_signature ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.approved_signature}`}
                        alt="Approved signature"
                        className="signature-img"
                      />
                    ) : null}
                  </td>
                  <td>{formatDate(selectedRequest.approved_date)}</td>
                </tr>
                <tr>
                  <th>Accomplished by</th>
                  <td>{displayText(selectedRequest.accomplished_by, "")}</td>
                  <td className="sig-box">
                    {selectedRequest.accomplished_signature ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.accomplished_signature}`}
                        alt="Accomplished signature"
                        className="signature-img"
                      />
                    ) : null}
                  </td>
                  <td>{formatDate(selectedRequest.date_completed)}</td>
                </tr>
                {/* --- END MODIFICATION --- */}
              </tbody>
            </table>
            
            {/* --- Status & Action Button Logic (from previous step) --- */}
            {(selectedRequest.status || selectedRequest.declined_reason) && (
              <div
                className={`floating-decline-reason ${selectedRequest.status?.toLowerCase()}`}
              >
                <div className="floating-decline-content">
                  {selectedRequest.status && (
                    <p className="status-text">
                      <strong>Status:</strong> {selectedRequest.status}
                    </p>
                  )}
                  {selectedRequest.declined_reason && (
                    <>
                      <strong>Declined Reason:</strong>
                      <p>{selectedRequest.declined_reason}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {selectedRequest.status === "Approved" && (
              <button
                className="floating-receive-btn" 
                onClick={() => handleAccomplish({ ...selectedRequest })}
                disabled={selectedRequest.status === "Accomplished"}
              >
                {selectedRequest.status === "Accomplished"
                  ? "✅ Accomplished"
                  : "Mark as Accomplished"}
              </button>
            )}
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