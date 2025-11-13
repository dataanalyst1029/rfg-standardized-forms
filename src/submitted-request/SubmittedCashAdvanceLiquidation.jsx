import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-request.css";
import "./styles/submitted-cash-advance.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "new-request", label: "New cash advance liquidation" },
  { id: "submitted", label: "Cash Advance Liquidation Reports" },
];

function SubmittedPurchaseRequests({ onLogout, currentUserId, showAll = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestCode, setSelectedRequestCode] = useState("");
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        const res = await fetch(`${API_BASE_URL}/api/cash_advance_liquidation`);
        if (!res.ok) throw new Error("Failed to fetch submitted requests");
        const data = await res.json();

        const hydrated = data.map((req) => ({
          ...req,
          user_id: req.user_id,
        }));

        if (showAll) {
          setRequests(hydrated);
        } else {
          const userRequests = hydrated.filter(
            (req) => Number(req.user_id) === Number(currentUserId)
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

  useEffect(() => {
    const selected = requests.find(
      (req) => req.cal_request_code === selectedRequestCode
    );

    if (!selected) {
      setItems([]);
      return;
    }

    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await fetch(
          `${API_BASE_URL}/api/cash_advance_liquidation_items?request_id=${selected.id}`
        );
        if (!res.ok) throw new Error("Failed to fetch items");

        const data = await res.json();
        setItems(data);
      } catch (err) {
        console.error("Error fetching items:", err);
        setItems([]);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, [selectedRequestCode, requests]);

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") navigate("/forms/cash-advance-liquidation-form");
  };

  const handleSelectChange = (e) => {
    setSelectedRequestCode(e.target.value);
  };

  const selectedRequest = requests.find(
    (req) => req.cal_request_code === selectedRequestCode
  );

  if (loading)
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>Loading submitted cash advance liquidation…</span>
    </div>
  );

  return (
    <div className="pr-layout">
      {isMobileView && (
        <button
          className="burger-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          ☰
        </button>
      )}
      <aside className={`pr-sidebar ${isMobileView ? (isMobileMenuOpen ? "open" : "closed") : ""}`}>
        <div className="pr-sidebar-header">
          <h2
            onClick={() => navigate("/forms-list")}
            style={{ cursor: "pointer", color: "#007bff" }}
          >
            Cash Advance Liquidation
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
            Review your submitted cash advance liquidation.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Cash Advance Liquidation Reports</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view details.
            </p>
          </div>

          {selectedRequest && (
            <button className="print-btn" onClick={() => window.print()}>
              🖨️ Print
            </button>
          )}
        </header>

        <div className="submitted-requests-container">
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
                  <option value="" disabled>-- Choose Reference Number --</option>
                  {requests.map((req) => (
                    <option
                      key={req.cal_request_code}
                      value={req.cal_request_code}
                    >
                      {req.cal_request_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequest && (
                <div
                  className="submitted-ca-request-card"
                  ref={cardRef}
                  style={{ marginTop: "1rem" }} >

                  <div class="record-request">
                    <header className="request-header">
                      <div class="header-brand">
                        <img src={rfgLogo} alt="Ribshack Food Group" className="header-logo" />
                      </div>
                      <div className="header-request-code">
                        <i className="request-code">{selectedRequest.cal_request_code}</i>
                      </div>
                    </header>

                    <div className="table">
                      <p hidden>ID: {selectedRequest.id}</p>
                      <table>
                        <tr>
                          <th>Date Request</th>
                          <td>{formatDate(selectedRequest.request_date)}</td>
                        </tr>
                        <tr>
                          <th>Employee ID</th>
                          <td>{selectedRequest.employee_id}</td>
                          <th>Name</th>
                          <td>{selectedRequest.name}</td>
                        </tr>
                        <tr>
                          <th>Branch</th>
                          <td>{selectedRequest.branch}</td>
                          <th>Department</th>
                          <td>{selectedRequest.department}</td>
                        </tr>
                      </table>
                    </div>
                    <div class="replenish-amount">
                      <p>
                          <strong>Check / PCV No:</strong>{" "}
                          <em>{selectedRequest.check_pcv_no}</em>
                      </p>
                      <p>
                          <strong>Cut-off Date:</strong>{" "}
                          <em>{new Date(selectedRequest.cutoff_date).toLocaleDateString()}</em>
                      </p>
                      <p>
                          <strong>Nature of Activity:</strong>{" "}
                          <em>{selectedRequest.nature_activity}</em>
                      </p>
                      <p>
                          <strong>Inclusive date(s):</strong>{" "}
                          <em>{new Date(selectedRequest.inclusive_date_from).toLocaleDateString()} - {new Date(selectedRequest.inclusive_date_to).toLocaleDateString()}</em>
                      </p>
                    </div>
                    <div className="table pr-items-table-wrapper">
                      {loadingItems ? (
                        <p>Loading items…</p>
                      ) : items.length === 0 ? (
                        <p>No items found for this request.</p>
                      ) : (
                        <table className="rfrf-items-table">
                          <thead>
                            <tr>
                              <th className="text-center">Date of Transaction</th>
                              <th className="text-center">Description</th>
                              <th className="text-center">OR No.</th>
                              <th className="text-center">Amount</th>
                              <th className="text-center">Expense Charges</th>
                              <th className="text-center">Store/Branch</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td className="text-center">{new Date(item.transaction_date).toLocaleDateString()}</td>
                                <td className="text-center">{item.description}</td>
                                <td className="text-center">{item.or_no}</td>
                                <td className="text-center">{item.amount
                                  ? Number(item.amount).toLocaleString("en-PH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                  })
                                  : "0.00"}
                                </td>
                                <td className="text-center">{item.exp_charges}</td>
                                <td className="text-center">{item.store_branch}</td>
                              </tr>
                            ))}
                            <tr>
                              <td className="text-center" colSpan={3}><strong>Total Expenses</strong></td>
                              <td className="text-center">{selectedRequest.total_expense
                                      ? Number(selectedRequest.total_expense).toLocaleString("en-PH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                  })
                                  : "0.00"}
                              </td>
                              <td colSpan={3}></td>
                            </tr>
                          </tbody>

                        </table>
                      )}
                    </div>

                    <div>
                      <h2 className="pr-section-title">Expenses Breakdown</h2>
                        <table className="rfrf-items-table">
                          <thead>
                            <tr>
                              <th className="text-center">Budgeted</th>
                              <th className="text-center">Actual</th>
                              <th className="text-center">Difference</th>
                            </tr>
                          </thead>
                          <tbody>
                              <tr>
                                <td className="text-center">{selectedRequest.budgeted
                                  ? Number(selectedRequest.budgeted).toLocaleString("en-PH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                  })
                                  : "0.00"}
                                </td>
                                <td className="text-center">{selectedRequest.actual
                                  ? Number(selectedRequest.actual).toLocaleString("en-PH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                  })
                                  : "0.00"}
                                </td>
                                <td className="text-center">{selectedRequest.difference
                                  ? Number(selectedRequest.difference).toLocaleString("en-PH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                  })
                                  : "0.00"}
                                </td>
                              </tr>
                          </tbody>
                        </table>
                    </div>

                    <div>
                      <div className="pr-flex-container">
                          <div className="pr-section">
                            <h2 className="pr-section-title">When Budgeted Exceeds Actual</h2>
                            <div>
                              <span>Deposit of Excess</span>
                              <input
                                value={selectedRequest.excess_deposit || ""}
                                readOnly
                              />
                            </div>
                            <div>
                              <span>Date</span>
                              <input
                                value={new Date(selectedRequest.date_excess).toLocaleDateString()}
                                readOnly
                              />
                            </div>
                            <div>
                              <span>Acknowledgement Receipt No.</span>
                              <input
                                value={selectedRequest.ack_rcpt_no || ""}
                                readOnly
                              />
                            </div>
                            <div>
                                <span>Amount</span>
                                <input
                                  value={selectedRequest.exceed_amount || ""}
                                  readOnly
                                />
                            </div>
                          </div>
                          <div className="pr-section" >
                              <h2 className="pr-section-title">When Actual Exceeds Budgeted</h2>
                              <div>
                                  <span>Reimbursable Amount</span>
                                  <input
                                  value={selectedRequest.rb_amount || ""}
                                  readOnly
                                  />
                              </div>
                            </div>
                      </div>
                    </div>
                    <div className="table pr-items-table-wrapper">
                      <p hidden>ID: {selectedRequest.id}</p>
                      <table>
                        <tr>
                          <th><small>Submitted by</small></th>
                          <td><small><input className="prf-input" value={selectedRequest.prepared_by}/></small></td>
                          <th><small>Signature</small></th>
                          <td className="receive-signature"><small><input className="prf-input requests-signature" style={{border: "transparent", color: "transparent"}} value={selectedRequest.prepared_signature} readOnly required/></small>
                            {selectedRequest.prepared_signature ? (
                            <img
                                src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.prepared_signature}`}
                                alt="Signature"
                                className="img-sign-prf"
                            />
                            ) : (
                            <div className="img-sign-prf empty-sign"></div>
                            )}
                          </td>
                        </tr>
                        {(selectedRequest.endorsed_by || selectedRequest.endorsed_signature) && (
                          <tr>
                            <th><small>Endorsed by</small></th>
                            <td><small><input type="text" className="prf-input" value={selectedRequest.endorsed_by}/></small></td>
                            <th><small>Signature</small></th>
                            <td className="receive-signature"><small><input className="prf-input requests-signature" style={{border: "transparent", color: "transparent"}} value={selectedRequest.endorsed_signature} readOnly required/></small>
                              {selectedRequest.endorsed_signature ? (
                              <img
                                  src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.endorsed_signature}`}
                                  alt="Signature"
                                  className="img-sign-prf"
                              />
                              ) : (
                              <div className="img-sign-prf empty-sign"></div>
                              )}
                            </td>
                          </tr>
                        )}

                        {(selectedRequest.approved_by || selectedRequest.approve_signature) && (
                          <tr>
                            <th><small>Approved by</small></th>
                            <td><small><input type="text" className="prf-input" value={selectedRequest.approved_by}/></small></td>
                            <th><small>Signature</small></th>
                            <td className="receive-signature"><small><input className="prf-input requests-signature" style={{border: "transparent", color: "transparent"}} value={selectedRequest.approve_signature} readOnly required/></small>
                              {selectedRequest.approve_signature ? (
                              <img
                                  src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.approve_signature}`}
                                  alt="Signature"
                                  className="img-sign-prf"
                              />
                              ) : (
                              <div className="img-sign-prf empty-sign"></div>
                              )}
                            </td>
                          </tr>
                        )}

                        {/* {(selectedRequest.status === "Received" || selectedRequest.status === "Completed") && (
                          <tr>
                            <th><small>Received by</small></th>
                            <td>
                              <input
                                type="text"
                                className="prf-input"
                                value={selectedRequest.received_by}
                                onChange={(e) =>
                                  setReceiveInputs({ ...receiveInputs, received_by: e.target.value })
                                }
                                required
                              />
                            </td>
                            <th><small>Signature</small></th>
                            <td className="receive-signature">
                              <input
                                type="text"
                                className="prf-input requests-signature"
                                style={{ border: "transparent", color: "black" }}
                                value={selectedRequest.received_signature}
                                onChange={(e) =>
                                  setReceiveInputs({ ...receiveInputs, received_signature: e.target.value })
                                }
                                readOnly
                                required
                              />
                              {selectedRequest.received_signature ? (
                                <img
                                  src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.received_signature}`}
                                  alt="Signature"
                                  className="img-sign-prf"
                                />
                              ) : (
                                <div className="img-sign-prf empty-sign"></div>
                              )}
                            </td>
                          </tr>
                        )} */}
                      </table>
                    </div>
                    {/* <div className="signature-section">
                      <div className="signature-format">
                        <div className="submitter-signature">
                          <label htmlFor="submitted-by">
                            <span className="s-name">{selectedRequest.prepared_by}</span>
                            <span className="s-by">Submitted by</span>
                          </label>
                        </div>
                        <div className="submitter-signature">
                          <label htmlFor="submitted-signature">
                            <span className="sub-sign">{selectedRequest.prepared_signature}</span>
                            {selectedRequest.prepared_signature ? (
                              <img
                              src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.prepared_signature}`}
                              alt="Signature"
                              className="img-sign"/>
                              ) : (
                                  <div className="img-sign empty-sign"></div>
                              )}
                            <span className="s-by">Signature</span>
                          </label>
                        </div>
                      </div>
                      <div class="signature-format">
                        <div className="submitter-signature">
                          <label htmlFor="submitted-by">
                            <span className="s-name">{selectedRequest.approved_by}</span>
                            <span className="s-by">Approved by</span>
                          </label>
                        </div>
                        <div className="submitter-signature">
                          <label htmlFor="submitted-signature">
                            <span className="sub-sign">{selectedRequest.approve_signature}</span>
                            {selectedRequest.approve_signature ? (
                              <img
                              src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.approve_signature}`}
                              alt="Signature"
                              className="img-sign"/>
                              ) : (
                                  <div className="img-sign empty-sign"></div>
                              )}
                            <span className="s-by">Signature</span>
                          </label>
                        </div>
                      </div>
                    </div> */}
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
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default SubmittedPurchaseRequests;
