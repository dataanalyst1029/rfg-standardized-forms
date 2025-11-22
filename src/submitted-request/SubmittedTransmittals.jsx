import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import "./styles/submitted-request.css";
import "./styles/submitted-transmittals.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "new", label: "New Transmittal" },
  { id: "submitted", label: "Submitted Transmittals" },
];

const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function SubmittedTransmittals({ onLogout, currentUserId, showAll = false }) {
  const navigate = useNavigate();
  const storedUser = useMemo(() => JSON.parse(sessionStorage.getItem("user") || "{}"), []);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCode, setSelectedCode] = useState("");
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const effectiveUserId = showAll ? null : currentUserId || storedUser.id || null;
  const effectiveRole = storedUser.role || "";

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (effectiveRole) params.append("role", effectiveRole);
        if (effectiveUserId) params.append("userId", effectiveUserId);

        const response = await fetch(
          `${API_BASE_URL}/api/transmittals${params.toString() ? `?${params.toString()}` : ""}`,
        );
        if (!response.ok) {
          throw new Error("Failed to load submitted transmittals.");
        }
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        setRequests(list);
        setSelectedCode((prev) => {
          if (prev && list.some((request) => request.form_code === prev)) return prev;
          return list[0]?.form_code || "";
        });
      } catch (err) {
        console.error("Error loading transmittals:", err);
        setError(err.message || "Unable to load transmittals.");
        setRequests([]);
        setSelectedCode("");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [effectiveRole, effectiveUserId, showAll]);

  useEffect(() => {
    const selected = requests.find((entry) => entry.form_code === selectedCode);
    if (!selected || !selected.id) {
      setItems([]);
      return;
    }

    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/transmittals/items?request_id=${selected.id}`,
        );
        if (!response.ok) {
          throw new Error("Failed to load transmittal items.");
        }
        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading transmittal items:", err);
        setItems([]);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, [requests, selectedCode]);

  const selectedRequest = requests.find((entry) => entry.form_code === selectedCode);

  const handleNavigate = (sectionId) => {
    if (sectionId === "new") {
      navigate("/forms/transmittal-form");
    }
    setIsMobileMenuOpen(false);
  };

  const handleSelectChange = (event) => {
    setSelectedCode(event.target.value);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading submitted transmittals...</span>
      </div>
    );
  }

  return (
    <div className="pr-layout submitted-transmittals-layout">
      {isMobileView && (
        <button
          type="button"
          className="burger-btn"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          ☰
        </button>
      )}

      <aside
        className={`pr-sidebar ${isMobileView ? (isMobileMenuOpen ? "open" : "closed") : ""}`}
      >
        <div className="pr-sidebar-header">
          <h2
            onClick={() => navigate("/forms-list")}
            style={{ cursor: "pointer", color: "#007bff" }}
            title="Back to Forms Library"
          >
            Transmittal Form
          </h2>
          <span className="pr-subtitle">Standardized form</span>
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
          <span className="pr-sidebar-meta">Review your submitted transmittals.</span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Submitted Transmittals</h1>
            <p className="pr-topbar-meta">Select a transmittal code to view its details.</p>
          </div>
        </header>

        <div className="submitted-requests-container transmittal-submissions">
          {error && <p className="error-message">{error}</p>}
          {!requests.length ? (
            <p>No submitted transmittals found.</p>
          ) : (
            <>
              <div className="dropdown-section">
                <label htmlFor="transmittalSelect">Select transmittal code:</label>
                <select
                  id="transmittalSelect"
                  className="pr-input transmittal-select"
                  value={selectedCode}
                  onChange={handleSelectChange}
                >
                  <option value="" disabled>
                    -- Choose reference number --
                  </option>
                  {requests.map((entry) => (
                    <option key={entry.form_code} value={entry.form_code}>
                      {entry.form_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequest && (
                <><div className="transmittal-record-wrapper">
                    <div className="transmittal-record">
                      <header className="transmittal-record__header">
                        <div className="transmittal-record__branding">
                          <img src={rfgLogo} alt="RFG logo" />
                        </div>
                        <p className="transmittal-record__code">{selectedRequest.form_code}</p>
                      </header>
                      <p className="transmittal-record__route">
                        {selectedRequest.origin_branch || "—"} → {selectedRequest.destination_branch || "—"}
                      </p>

                      <div className="transmittal-record__meta-grid">
                        <div>
                          <p className="label">Purpose</p>
                          <p>{selectedRequest.purpose || "—"}</p>
                        </div>
                        <div>
                          <p className="label">Prepared on</p>
                          <p>{formatDate(selectedRequest.transmittal_date)}</p>
                        </div>
                        <div>
                          <p className="label">Sender</p>
                          <p>{selectedRequest.sender_name || "—"}</p>
                        </div>
                        <div>
                          <p className="label">Recipient</p>
                          <p>{selectedRequest.recipient_name || "—"}</p>
                        </div>
                        <div>
                          <p className="label">Origin branch</p>
                          <p>{selectedRequest.origin_branch || "—"}</p>
                        </div>
                        <div>
                          <p className="label">Destination branch</p>
                          <p>{selectedRequest.destination_branch || "—"}</p>
                        </div>
                        <div>
                          <p className="label">Delivery mode</p>
                          <p>{selectedRequest.delivery_mode || "—"}</p>
                        </div>
                        <div>
                          <p className="label">Tracking #</p>
                          <p>{selectedRequest.tracking_no || "—"}</p>
                        </div>
                        <div>
                          <p className="label">Condition</p>
                          <p>{selectedRequest.condition_status || "—"}</p>
                        </div>
                      </div>

                      <div className="transmittal-record__table-wrapper">
                        <table className="transmittal-record__table">
                          <thead>
                            <tr>
                              <th>Reference #</th>
                              <th>Description</th>
                              <th>Qty</th>
                              <th>Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loadingItems ? (
                              <tr>
                                <td colSpan={4}>Loading items...</td>
                              </tr>
                            ) : items.length ? (
                              items.map((item) => (
                                <tr key={item.id}>
                                  <td>{item.reference_no || "—"}</td>
                                  <td>{item.description || "—"}</td>
                                  <td>{item.quantity ?? "—"}</td>
                                  <td>{item.remarks || "—"}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4}>No items recorded.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="transmittal-record__notes">
                        <p className="label">Notes / discrepancies</p>
                        <p>{selectedRequest.notes || "—"}</p>
                      </div>

                      <div className="transmittal-record__signatures">
                        <table>
                          <tbody>
                            <tr>
                              <th>Submitted by</th>
                              <td>{selectedRequest.sender_name || "—"}</td>
                              <th>Signature</th>
                              <td>
                                {selectedRequest.sender_signature ? (
                                  <img
                                    src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.sender_signature}`}
                                    alt="Submitted signature" />
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                            <tr>
                              <th>Received by</th>
                              <td>{selectedRequest.received_by || "—"}</td>
                              <th>Signature</th>
                              <td>
                                {selectedRequest.received_signature ? (
                                  <img
                                    src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.received_signature}`}
                                    alt="Received signature" />
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="transmittal-record__received-date">
                          <p className="label">Date received</p>
                          <p>{formatDate(selectedRequest.received_date)}</p>
                        </div>
                      </div>
                    </div>
                  </div><div
                    className={`floating-decline-reason ${(selectedRequest.status || "pending").toLowerCase()}`}
                  >
                      <div className="floating-decline-content">
                        <strong>Status:</strong>
                        <p>{selectedRequest.status || "Pending"}</p>
                      </div>
                    </div></>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default SubmittedTransmittals;
