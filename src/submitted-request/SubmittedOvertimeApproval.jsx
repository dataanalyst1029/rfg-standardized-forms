// [ FILENAME: SubmittedOvertimeApproval.jsx ]

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";

import "./styles/submitted-interbranch-transfer.css"; 
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted Applications" },
  { id: "new-request", label: "New Overtime Application" },
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

function SubmittedOvertimeApproval({
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
  const [items, setItems] = useState([]); // This will store the 'entries'
  const [loadingItems, setLoadingItems] = useState(false);

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
          `${API_BASE_URL}/api/overtime_requests${
            query ? `?${query}` : ""
          }`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch submitted overtime applications.");
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : [];

        const filtered = effectiveUserId
          ? list.filter(
              (request) =>
                String(request.requester_name).toLowerCase() ===
                String(storedUser.name).toLowerCase(),
            )
          : list;

        setRequests(filtered);
        setSelectedCode((prev) => {
          if (prev && filtered.some((request) => request.form_code === prev)) {
            return prev;
          }
          return filtered.length > 0 ? filtered[0].form_code : "";
        });
      } catch (err) {
        console.error("Error fetching overtime applications", err);
        setError(err.message || "Unable to load submitted overtime applications.");
        setRequests([]);
        setSelectedCode("");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [effectiveRole, effectiveUserId, showAll, storedUser.name]);

  useEffect(() => {
    const selected = requests.find(
      (request) => request.form_code === selectedCode,
    );

    if (!selected || !selectedCode) {
      setItems([]);
      return;
    }

    setLoadingItems(true);
    const fetchItems = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/overtime_entries?request_id=${selected.id}`,
        );
        if (!res.ok) throw new Error("Failed to fetch overtime entries");
        const itemData = await res.json();
        setItems(Array.isArray(itemData) ? itemData : []);
      } catch (itemError) {
        console.error("Error fetching items:", itemError);
        setItems([]);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, [selectedCode, requests]);

  const selectedRequest = requests.find(
    (request) => request.form_code === selectedCode,
  );

  const hasItems = items.length > 0;
  const displayItems = hasItems
    ? items
    : Array.from({ length: 5 }, (_, index) => ({
        id: `placeholder-${index}`,
        __placeholder: true,
      }));

  // Signature values for Overtime
  const requesterName = displayText(selectedRequest?.requester_name, "");
  const requesterSignature = selectedRequest?.signature;

  // These fields are for the "Approved by" row
  const approvedByValue = displayText(selectedRequest?.approved_by, "");
  const approvedSignatureValue = selectedRequest?.approved_sig;

  const handleSelectChange = (event) => {
    setSelectedCode(event.target.value);
  };

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") {
      navigate("/forms/hr-overtime-approval");
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading submitted overtime applications…</span>
      </div>
    );
  }

  const renderBody = () => {
    if (error) {
      return <p className="pr-error-message">{error}</p>;
    }

    if (requests.length === 0) {
      return <p>No submitted overtime approval requests found.</p>;
    }

    return (
      <>
        <div className="dropdown-section" style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="oarRequestSelect">Select Reference No: </label>
          <select
            id="oarRequestSelect"
            value={selectedCode}
            onChange={handleSelectChange}
            className="pr-input"
          >
            <option value="" disabled>
              -- Choose Reference Number --
            </option>
            {requests.map((request) => (
              <option key={request.form_code} value={request.form_code}>
                {request.form_code} ({request.requester_name} | {request.branch})
              </option>
            ))}
          </select>
        </div>

        {selectedRequest && (
          <div className="its-request-card">
            <header className="request-header">
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

            <div className="its-grid-two">
              <div>
                <table className="its-info-table" style={{ borderTop: 'none', borderRight: 'none' }}>
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
                      <th>Date Requested</th>
                      <td>{formatDate(selectedRequest.request_date)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <table className="its-info-table" style={{ borderTop: 'none' }}>
                  <tbody>
                    <tr>
                      <th>Branch</th>
                      <td>{displayText(selectedRequest.branch)}</td>
                    </tr>
                    <tr>
                      <th>Department</th>
                      <td>{displayText(selectedRequest.department)}</td>
                    </tr>
                    <tr>
                      <th>Signature</th>
                      <td className="sig-box">
                        <img
                            src={`${API_BASE_URL}/uploads/signatures/${storedUser.signature}`}
                            alt="Prepared signature"
                            className="signature-img"
                        />   
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* [CHANGE 1] Removed style={{ marginTop: "1.5rem" }} */}
            <div
              className="its-transport-header"
            >
              OVERTIME ENTRIES
            </div>
            
            {loadingItems ? (
              <p style={{ textAlign: "center", padding: "1rem" }}>
                Loading items...
              </p>
            ) : (
              <table className="its-items-table" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time From</th>
                    <th>Time To</th>
                    <th>Purpose / Task</th>
                    <th className="text-center">Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item) => {
                    const isPlaceholder = Boolean(item.__placeholder);
                    return (
                      <tr key={item.id}>
                        <td>
                          {isPlaceholder
                            ? "\u00a0"
                            : formatDate(item.ot_date)}
                        </td>
                        <td>
                          {isPlaceholder
                            ? "\u00a0"
                            : displayText(item.time_from, "")}
                        </td>
                        <td>
                          {isPlaceholder
                            ? "\u00a0"
                            : displayText(item.time_to, "")}
                        </td>
                        <td>
                          {isPlaceholder
                            ? "\u00a0"
                            : displayText(item.purpose, "")}
                        </td>
                        <td className="text-center">
                          {isPlaceholder
                            ? "\u00a0"
                            : displayText(item.hours, "")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {hasItems && (
                  <tfoot className="oar-items-table"> 
                    <tr>
                      <th colSpan="4" style={{ textAlign: "right", paddingRight: "10px" }}>
                        Total Approved Hours:
                      </th>
                      <th className="text-center">
                        {displayText(selectedRequest.total_hours, '0.00')}
                      </th>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
            
            {/* [CHANGE 2] Signature table updated */}
            <table className="its-sig-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Signature</th>
                  {/* <th>Date</th> <-- REMOVED */}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Requested by</th>
                  <td>{requesterName}</td>
                  <td className="sig-box">
                    {requesterSignature ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${requesterSignature}`}
                        alt="Requester signature"
                        className="signature-img"
                      />
                    ) : null}
                  </td>
                  {/* <td>{requesterDate}</td> <-- REMOVED */}
                </tr>
                <tr>
                  <th>Approved by</th>
                  <td>{approvedByValue}</td>
                  <td className="sig-box">
                    {approvedSignatureValue ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${approvedSignatureValue}`}
                        alt="Approved signature"
                        className="signature-img"
                      />
                    ) : null}
                  </td>
                  {/* <td>{approvedDateValue}</td> <-- REMOVED */}
                </tr>
              </tbody>
            </table>

            {/* Status Display */}
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
          </div>
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
            Overtime Approval
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
            Review your overtime applications.
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
            <h1>Submitted Overtime Approval Requests</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view the application details.
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

export default SubmittedOvertimeApproval;