import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-reimburse.css";


const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted Reimbursement" },
  { id: "new-request", label: "New Reimbursement" },
];

function SubmittedReimbursement({ onLogout, currentUserId, showAll = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestCode, setSelectedRequestCode] = useState("");
  const cardRef = useRef(null);
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
        const res = await fetch(`${API_BASE_URL}/api/reimbursement`);
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
    if (sectionId === "new-request") navigate("/forms/reimbursement-form");
  };

  const handleSelectChange = (e) => {
    setSelectedRequestCode(e.target.value);
  };

  const selectedRequest = requests.find(
    (req) => req.rb_request_code === selectedRequestCode
  );

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading submitted reimbursement…</span>
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
            Reimbursement
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
            Review your submitted reimbursement.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Submitted Reimbursement</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view details.
            </p>
          </div>

          {selectedRequest && (
            <button className="print-rb-btn" onClick={() => window.print()}>
            🖨️ Print
            </button>
          )}
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
                  className="pr-input"
                >
                  <option value="" disabled>
                    -- Choose Reference Number --
                  </option>
                  {requests.map((req) => (
                    <option key={req.rb_request_code} value={req.rb_request_code}>
                      {req.rb_request_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequest && (
                <div
                  className="submitted-rb-request-card"
                  ref={cardRef}
                  style={{ marginTop: "1rem" }}
                >
                    {/* <div className="rb-reference-card">
                        <span className="rb-reference-value">
                            <strong>{selectedRequest.rb_request_code}</strong>
                        </span>
                        <span>
                            <strong>{formatDate(selectedRequest.request_date)}</strong>
                        </span>
                        <p hidden>ID: {selectedRequest.id}</p>
                    </div> */}

                    <section className="car-form-section" id="details">
                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Reference No.</label>
                                <input value={selectedRequest.rb_request_code} className="car-input" readOnly />
                            </div>
                            <div className="pr-field">
                                <label>Date Request</label>
                                <input value={formatDate(selectedRequest.request_date)} className="car-input" readOnly />
                            </div>
                        </div>
                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Cash Advance Liquidation No.</label>
                                <input value={selectedRequest.cal_no} className="car-input" readOnly />
                            </div>
                            <div className="pr-field">
                                <label>Cash Advance No.</label>
                                <input value={selectedRequest.ca_no} className="car-input" readOnly />
                            </div>
                        </div>
                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Employee ID</label>
                                <input value={selectedRequest.employee_id} className="car-input" readOnly />
                            </div>
                            <div className="pr-field">
                                <label>Name</label>
                                <input value={selectedRequest.name} className="car-input" readOnly />
                            </div>
                        </div>
                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Branch</label>
                                <input value={selectedRequest.branch} className="car-input" readOnly />
                            </div>
                            <div className="pr-field">
                                <label>Department</label>
                                <input value={selectedRequest.department} className="car-input" readOnly />
                            </div>
                        </div>
                    </section>

                    <section className="car-form-section" id="details">
                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>BPI Account No.</label>
                                <input value={selectedRequest.bpi_acc_no} className="car-input" readOnly />
                            </div>
                            <div className="pr-field">
                                <label>Total Reimbursable Amount</label>
                                <input value={selectedRequest.total_rb_amount} className="car-input" readOnly />
                            </div>
                        </div>
                    </section>

                    <section className="car-form-section" style={{marginBottom: "5rem"}} id="details">
                      <div className="pr-grid-two">
                        <div className="pr-field">
                            <label>Requested by</label>
                            <input
                            value={selectedRequest.requested_by}
                            className="car-input"
                            readOnly
                            />
                        </div>
                        <div className="pr-field receive-signature">
                            <label>Signature</label>
                            <input
                            value={selectedRequest.request_signature}
                            className="car-input received-signature"
                            readOnly
                            />
                            {selectedRequest.request_signature ? (
                            <img
                                src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.request_signature}`}
                                alt="Signature"
                                className="img-sign"
                            />
                            ) : (
                            <div className="img-sign empty-sign"></div>
                            )}
                        </div>
                      </div>
                      <div className="pr-grid-two">
                        <div className="pr-field">
                            <label>Approved by</label>
                            <input
                            value={selectedRequest.approved_by}
                            className="car-input"
                            readOnly
                            />
                        </div>
                        <div className="pr-field receive-signature">
                            <label>Signature</label>
                            <input
                            value={selectedRequest.approve_signature}
                            className="car-input received-signature"
                            readOnly
                            />
                            {selectedRequest.approve_signature ? (
                            <img
                                src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.approve_signature}`}
                                alt="Signature"
                                className="img-sign"
                            />
                            ) : (
                            <div className="img-sign empty-sign"></div>
                            )}
                        </div>
                      </div>
                    </section>
                    {(selectedRequest.status || selectedRequest.declined_reason) && (
                      <div className={`floating-decline-reason ${selectedRequest.status?.toLowerCase()}`}>
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
          )}
        </div>
      </main>
    </div>
  );
}

export default SubmittedReimbursement;
