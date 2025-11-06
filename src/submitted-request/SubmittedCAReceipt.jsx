import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-ca-receipt.css";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted CA Receipt" },
  { id: "new-request", label: "New CA Receipt" },
];

function SubmittedCAReceipt({ onLogout, currentUserId, showAll = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestCode, setSelectedRequestCode] = useState("");
  const navigate = useNavigate();

  const formatDate = (dateValue) => {
    if (!dateValue) return "—";
    const normalized = dateValue.replace(" ", "T").replace(/\//g, "-");
    const parsedDate = new Date(normalized);
    if (isNaN(parsedDate)) return dateValue;
    return parsedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/ca_receipt`);
        if (!res.ok) throw new Error("Failed to fetch submitted requests");
        const data = await res.json();

        const hydrated = data.map((req) => ({
          ...req,
          submitted_by: req.user_id,
        }));

        if (showAll) {
          setRequests(hydrated);
        } else {
          const userRequests = hydrated.filter(
            (req) => Number(req.submitted_by) === Number(currentUserId)
          );
          setRequests(userRequests);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [currentUserId, showAll]);

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") navigate("/forms/ca-receipt-form");
  };

  const handleSelectChange = (e) => {
    setSelectedRequestCode(e.target.value);
  };

  const selectedRequest = requests.find(
    (req) => req.car_request_code === selectedRequestCode
  );

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading submitted cash advance receipt…</span>
      </div>
    );

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2
            onClick={() => navigate("/forms-list")}
            style={{ cursor: "pointer", color: "#007bff" }}
          >
            Cash Advance Receipt
          </h2>
          <span>Standardized form</span>
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
            Review your submitted CA receipt
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="car-main">
        <header className="pr-topbar">
          <div>
            <h1>Submitted Cash Advance Receipt</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view details.
            </p>
          </div>
        </header>

        <div className="submitted-ca-requests-container">

          {requests.length === 0 ? (
            <p>No submitted requests found.</p>
          ) : (
            <>
              <div className="dropdown-section">
                <label htmlFor="requestSelect">Select Reference No: </label>
                <select
                  id="requestSelect"
                  value={selectedRequestCode}
                  onChange={handleSelectChange}
                  className="car-input"
                >
                  <option value="" disabled>
                    -- Choose Reference Number --
                  </option>
                  {requests.map((req) => (
                    <option key={req.car_request_code} value={req.car_request_code}>
                      {req.car_request_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequest && (
                <>
                    <button className="print-btn" onClick={() => window.print()}>
                    🖨️ Print
                    </button>
                    <div
                    className="submitted-ca-request-card"
                    style={{ marginTop: "1rem" }}
                    >
                    <section className="car-form-section" id="details">
                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Reference No.</label>
                                <input
                                value={selectedRequest.car_request_code}
                                className="car-input"
                                readOnly
                                />
                            </div>
                            <div className="pr-field">
                                <label>Date Request</label>
                                <input
                                value={formatDate(selectedRequest.request_date)}
                                className="car-input"
                                readOnly
                                />
                            </div>
                        </div>

                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Cash Advance No.</label>
                                <input
                                value={selectedRequest.cash_advance_no}
                                className="car-input"
                                readOnly
                                />
                            </div>
                            <div className="pr-field">

                            </div>
                        </div>

                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Employee ID</label>
                                <input
                                value={selectedRequest.employee_id}
                                className="car-input"
                                readOnly
                                />
                            </div>
                            <div className="pr-field">
                                <label>Name</label>
                                <input
                                value={selectedRequest.name}
                                className="car-input"
                                readOnly
                                />
                            </div>
                        </div>

                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Received From</label>
                                <input
                                value={selectedRequest.received_from}
                                className="car-input"
                                readOnly
                                />
                            </div>
                            <div className="pr-field">

                            </div>
                        </div>

                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Amount (in PHP)</label>
                                <input
                                value={selectedRequest.php_amount}
                                className="car-input"
                                readOnly
                                />
                            </div>
                            <div className="pr-field">
                                <label>Amount (in Words)</label>
                                <input
                                value={selectedRequest.php_word}
                                className="car-input"
                                readOnly
                                />
                            </div>
                        </div>

                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Received by</label>
                                <input
                                value={selectedRequest.received_by}
                                className="car-input"
                                readOnly
                                />
                            </div>
                            <div className="pr-field receive-signature">
                                <label>Signature</label>
                                <input
                                value={selectedRequest.received_signature}
                                className="car-input received-signature"
                                readOnly
                                />
                                {selectedRequest.received_signature ? (
                                <img
                                    src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.received_signature}`}
                                    alt="Signature"
                                    className="img-sign"
                                />
                                ) : (
                                <div className="img-sign empty-sign"></div>
                                )}
                            </div>
                        </div>
                    </section>

                    {(selectedRequest.status ||
                        selectedRequest.declined_reason) && (
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
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default SubmittedCAReceipt;
