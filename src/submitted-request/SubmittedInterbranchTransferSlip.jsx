import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import "./styles/submitted-interbranch-transfer.css";
// import "./styles/submitted-request.css";
// import "./styles/submitted-cash-advance.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted Transfers" },
  { id: "new-request", label: "New Interbranch Transfer" },
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

function SubmittedInterbranchTransferSlip({
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
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
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
          `${API_BASE_URL}/api/interbranch_transfer_slip${query ? `?${query}` : ""}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch submitted transfer slips.");
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : [];

        const filtered = effectiveUserId
          ? list.filter(
              (request) =>
                String(request.prepared_by).toLowerCase() ===
                String(storedUser.name).toLowerCase(),
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
        console.error("Error fetching transfer slips", err);
        setError(err.message || "Unable to load submitted transfer slips.");
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
    // Fetch items from the dedicated endpoint
    const fetchItems = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/interbranch_transfer_slip_items?request_id=${selected.id}`,
        );
        if (!res.ok) throw new Error("Failed to fetch items");
        const itemData = await res.json();
        setItems(Array.isArray(itemData) ? itemData : []);
      } catch (itemError) {
        console.error("Error fetching items:", itemError);
        setItems([]); // Set empty on error
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, [selectedCode, requests]);

  const selectedRequest = requests.find(
    (request) => request.form_code === selectedCode,
  );

  const hasItems = items.length > 0 && items[0] && items[0].id;
  const displayItems = hasItems
    ? items
    : Array.from({ length: 5 }, (_, index) => ({
        id: `placeholder-${index}`,
        __placeholder: true,
      }));

  // --- MODIFIED: Changed fallbacks from text to "" ---
  const preparedByValue = displayText(selectedRequest?.prepared_by, ""); // Was "N/A"
  const preparedDateValue = formatDate(selectedRequest?.prepared_date);
  const preparedSignatureValue = selectedRequest?.prepared_signature;

  const approvedByValue = displayText(
    selectedRequest?.approved_by,
    "", // Was "Awaiting approval"
  );
  const approvedDateValue = formatDate(selectedRequest?.approved_date);
  const approvedSignatureValue = selectedRequest?.approved_signature;

  const dispatchedByValue = displayText(
    selectedRequest?.dispatched_by,
    "", // Was "Pending dispatch"
  );
  const dispatchedDateValue = formatDate(selectedRequest?.dispatched_date);
  const dispatchedSignatureValue = selectedRequest?.dispatched_signature;

  const receivedByValue = displayText(
    selectedRequest?.received_by,
    "", // Was "Pending acknowledgement"
  );
  const receivedDateValue = formatDate(selectedRequest?.received_date);
  const receivedSignatureValue = selectedRequest?.received_signature;
  // --- END MODIFICATION ---

  const handleSelectChange = (event) => {
    setSelectedCode(event.target.value);
  };

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") {
      navigate("/forms/interbranch-transfer-slip");
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

  const handleReceive = async (request) => {
    try {
      if (!request?.id) {
        alert("Missing request ID. Cannot update status.");
        console.error("Missing request ID:", request);
        return;
      }

      const confirmReceive = window.confirm(
        `Mark ${request.form_code} as Received?`,
      );
      if (!confirmReceive) return;

      console.log("Updating transfer slip:", request.id);

      // Get current user details to sign as the receiver
      const userRes = await fetch(
        `${API_BASE_URL}/api/users/${effectiveUserId}`,
      );
      if (!userRes.ok) throw new Error("Failed to fetch user data");
      const userData = await userRes.json();

      const payload = {
        status: "Received",
        received_by: userData.name,
        received_signature: userData.signature,
        received_date: new Date().toISOString(), // Set received date to now
      };

      // Update request on backend
      const res = await fetch(
        `${API_BASE_URL}/api/interbranch_transfer_slip/${request.id}`,
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

      alert(`Transfer Slip ${request.form_code} marked as Received ✅`);

      // Update UI instantly
      setRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, ...payload } : r)),
      );
    } catch (err) {
      console.error("Error receiving transfer slip:", err);
      alert("Error updating status. Check console for details.");
    }
  };
  // --- END FEATURE ---

  // --- FEATURE: Added loading spinner (matches Payment Request) ---
    if (loading) {
      // Assumes .loading-container and .spinner styles are available globally
      // (from submitted-request.css or similar)
      return (
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading submitted transfer slips…</span>
        </div>
      );
    }
    // --- END FEATURE ---

  const renderBody = () => {
    if (error) {
      return <p className="pr-error-message">{error}</p>;
    }

    if (requests.length === 0) {
      return <p>No submitted interbranch transfer slips found.</p>;
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
                {request.form_code} (From: {request.from_branch} | To:{" "}
                {request.to_branch})
              </option>
            ))}
          </select>
        </div>

        {selectedRequest && (
          <div className="submitted-its-request-card" ref={cardRef}>

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

            <div className="its-grid-two" style={{ marginTop: "1rem" }}>
              <div className="its-col-left">
                <table className="its-info-table">
                  <tbody>
                    <tr>
                      <th>Date transferred</th>
                      <td>{formatDate(selectedRequest.date_transferred)}</td>
                    </tr>
                    <tr>
                      <th>FROM (Branch Name)</th>
                      <td>{displayText(selectedRequest.from_branch)}</td>
                    </tr>
                    <tr>
                      <th>Address</th>
                      <td>{displayText(selectedRequest.from_address)}</td>
                    </tr>
                    <tr>
                      <th>Area Operations Controller</th>
                      <td>
                        {displayText(
                          selectedRequest.from_area_ops_controller,
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="its-col-right">
                <table className="its-info-table">
                  <tbody>
                    <tr>
                      <th>Date received</th>
                      <td>{formatDate(selectedRequest.date_received)}</td>
                    </tr>
                    <tr>
                      <th>TO (Branch Name)</th>
                      <td>{displayText(selectedRequest.to_branch)}</td>
                    </tr>
                    <tr>
                      <th>Address</th>
                      <td>{displayText(selectedRequest.to_address)}</td>
                    </tr>
                    <tr>
                      <th>Area Operations Controller</th>
                      <td>
                        {displayText(selectedRequest.to_area_ops_controller)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className="its-transport-header"
              style={{ marginTop: "1.5rem" }}
            >
              TRANSFER DETAILS
            </div>
            {/* --- MODIFIED: Added loading state for items --- */}
            {loadingItems ? (
              <p style={{ textAlign: "center", padding: "1rem" }}>
                Loading items...
              </p>
            ) : (
              <table className="its-items-table" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>Item Code</th>
                    <th>Item Description</th>
                    <th className="text-center">Qty</th>
                    <th>Unit of Measure</th>
                    <th>Remarks</th>
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
                            : displayText(item.item_code, "")}
                        </td>
                        <td>
                          {isPlaceholder
                            ? "\u00a0"
                            : displayText(item.item_description, "")}
                        </td>
                        <td className="text-center">
                          {isPlaceholder
                            ? "\u00a0"
                            : displayText(item.qty, "")}
                        </td>
                        <td>
                          {isPlaceholder
                            ? "\u00a0"
                            : displayText(item.unit_measure, "")}
                        </td>
                        <td>
                          {isPlaceholder
                            ? "\u00a0"
                            : displayText(item.remarks, "")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {/* --- END MODIFICATION --- */}

            <p className="its-footnote">
              *Kindly indicate in the above table the item codes, description,
              quantity, and units of shortage/overage items
            </p>

            <div className="its-grid-two">
              <div
                className="its-transport-header"
                style={{ gridColumn: "1 / -1" }}
              >
                Mode of transport
              </div>
              <div className="its-col-left">
                <table className="its-info-table">
                  <tbody>
                    <tr>
                      <th>
                        [
                        {selectedRequest.dispatch_method === "Company Vehicle"
                          ? "X"
                          : " "}
                        ] Company Vehicle <br />
                        [
                        {selectedRequest.dispatch_method === "Courier"
                          ? "X"
                          : " "}
                        ] Courier <br />
                        [
                        {selectedRequest.dispatch_method ===
                        "Third-party transport"
                          ? "X"
                          : " "}
                        ] Third-party transport <br />
                        [
                        {selectedRequest.dispatch_method !==
                          "Company Vehicle" &&
                        selectedRequest.dispatch_method !== "Courier" &&
                        selectedRequest.dispatch_method !==
                          "Third-party transport"
                          ? "X"
                          : " "}
                        ] Other:{" "}
                        {selectedRequest.dispatch_method !==
                          "Company Vehicle" &&
                        selectedRequest.dispatch_method !== "Courier" &&
                        selectedRequest.dispatch_method !==
                          "Third-party transport"
                          ? displayText(selectedRequest.dispatch_method)
                          : "____"}
                      </th>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="its-col-right">
                <table className="its-transport-table">
                  <tbody>
                    <tr>
                      <th>Vehicle No</th>
                      <td>{displayText(selectedRequest.vehicle_no)}</td>
                    </tr>
                    <tr>
                      <th>Driver Name</th>
                      <td>{displayText(selectedRequest.driver_name)}</td>
                    </tr>
                    <tr>
                      <th>Driver Contact No</th>
                      <td>{displayText(selectedRequest.driver_contact)}</td>
                    </tr>
                    <tr>
                      <th>Expected Delivery Date</th>
                      <td>{formatDate(selectedRequest.expected_date)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <table className="its-sig-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Signature</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Prepared by</th>
                  <td>{preparedByValue}</td>
                  <td className="sig-box">
                    {preparedSignatureValue ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${preparedSignatureValue}`}
                        alt="Prepared signature"
                        className="signature-img"
                      />
                    ) : null}
                  </td>
                  <td>{preparedDateValue}</td>
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
                  <td>{approvedDateValue}</td>
                </tr>
                <tr>
                  <th>Dispatched by</th>
                  <td>{dispatchedByValue}</td>
                  <td className="sig-box">
                    {dispatchedSignatureValue ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${dispatchedSignatureValue}`}
                        alt="Dispatched signature"
                        className="signature-img"
                      />
                    ) : null}
                  </td>
                  <td>{dispatchedDateValue}</td>
                </tr>
                <tr>
                  <th>Received by</th>
                  <td>{receivedByValue}</td>
                  <td className="sig-box" style={{ width: "30%" }}>
                    {receivedSignatureValue ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${receivedSignatureValue}`}
                        alt="Received signature"
                        className="signature-img"
                      />
                    ) : null}
                  </td>
                  <td style={{ width: "20%" }}>{receivedDateValue}</td>
                </tr>
              </tbody>
            </table>

            <div className="its-receiving-section">
              <div className="its-receiving-header">
                RECEIVING BRANCH USE ONLY
              </div>
              <div className="its-receiving-content">
                <div className="its-receiving-col">
                  <p>
                    Is there a shortage in the items delivered? <br />
                    Yes [ {selectedRequest?.is_shortage ? "X" : " "} ]
                  </p>
                  <div className="reason">
                    If yes, please specify reason: <br />
                    {displayText(selectedRequest?.short_reason, "")}
                  </div>
                </div>
                <div className="its-receiving-col">
                  <p>
                    Is there an overage in the items delivered? <br />
                    Yes [ {selectedRequest?.is_overage ? "X" : " "} ]
                  </p>
                  <div className="reason">
                    If yes, please specify reason: <br />
                    {displayText(selectedRequest?.over_reason, "")}
                  </div>
                </div>
              </div>
            </div>

            {/* --- FEATURE: Added Status Display (matches Payment Request) --- */}
            {/* This assumes your API provides 'status' and 'declined_reason' fields */}
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
                onClick={() => handleReceive({ ...selectedRequest })}
                disabled={selectedRequest.status === "Received"}
              >
                {selectedRequest.status === "Received" ? "✅ Received" : "Receive"}
              </button>
            )}
            {/* --- END FEATURE --- */}
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
            Interbranch Transfer
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
            Review your transfer slip submissions.
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
            <h1>Submitted Interbranch Transfer Slips</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view the request details.
            </p>
          </div>

          {selectedRequest && (
            // --- MODIFIED: onClick now uses the simplified print function ---
            <button onClick={handlePrint} className="print-btn">
              🖨️ Print
            </button>
            // --- END MODIFICATION ---
          )}
        </header>

        <div className="submitted-requests-container">{renderBody()}</div>
      </main>
    </div>
  );
}

export default SubmittedInterbranchTransferSlip;