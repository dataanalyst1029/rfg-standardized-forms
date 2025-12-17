import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-revolving-fund.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "new-request", label: "New Revolving Fund" },
  { id: "submitted", label: "Revolving Fund Reports" },
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
        const res = await fetch(`${API_BASE_URL}/api/revolving_fund_request`);
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
      (req) => req.revolving_request_code === selectedRequestCode
    );

    if (!selected) {
      setItems([]);
      return;
    }

    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await fetch(
          `${API_BASE_URL}/api/revolving_fund_request_items?request_id=${selected.id}`
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
    if (sectionId === "new-request") navigate("/forms/revolving-fund");
  };

  const handleSelectChange = (e) => {
    setSelectedRequestCode(e.target.value);
  };

  const selectedRequest = requests.find(
    (req) => req.revolving_request_code === selectedRequestCode
  );

  if (loading)
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>Loading submitted revolving fund requests…</span>
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
            Revolving Fund Request
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
            Review your submitted revolving fund requests.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Revolving Fund Reports</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view details.
            </p>
          </div>
        </header>

        {selectedRequest && (
          <button className="print-btn" onClick={() => window.print()}>
            🖨️ Print
          </button>
        )}

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
                  <option value="" disabled>-- Choose Reference Number --</option>
                  {requests.map((req) => (
                    <option
                      key={req.revolving_request_code}
                      value={req.revolving_request_code}
                    >
                      {req.revolving_request_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequest && (
                <div
                  className="submitted-rf-request-card"
                  ref={cardRef}
                  style={{ marginTop: "1rem" }} >

                  <div class="record-request">
                    <header className="request-header">
                      <div class="header-brand">
                        <img src={rfgLogo} alt="Ribshack Food Group" className="header-logo" />
                      </div>
                      <div className="header-request-code">
                        <i className="request-code">{selectedRequest.revolving_request_code}</i>
                      </div>
                    </header>

                    <div className="table">
                      <p hidden>ID: {selectedRequest.id}</p>
                      <table>
                        <tr>
                          <th>Date Request</th>
                          <td>{formatDate(selectedRequest.date_request)}</td>
                        </tr>
                        <tr>
                          <th>Employee ID</th>
                          <td>{selectedRequest.employee_id}</td>
                          <th>Custodian</th>
                          <td>{selectedRequest.custodian}</td>
                        </tr>
                        <tr>
                          <th>Branch</th>
                          <td>{selectedRequest.branch}</td>
                          <th>Department</th>
                          <td>{selectedRequest.department}</td>
                        </tr>
                      </table>
                    </div>
                    <div className="replenish">
                      <p>
                        <b>Amount for Replenishment:</b>{" "}
                        <i>
                          {selectedRequest.replenish_amount
                            ? Number(selectedRequest.replenish_amount).toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "0.00"}
                        </i>
                      </p>
                    </div>
                    <div className="table pr-items-table-wrapper">
                      {/* <h3>Requested Items</h3> */}
                      {loadingItems ? (
                        <p>Loading items…</p>
                      ) : items.length === 0 ? (
                        <p>No items found for this request.</p>
                      ) : (
                        <table className="rfrf-items-table">
                          <thead>
                            <tr>
                              <th className="text-left">Date</th>
                              <th className="text-center">Voucher No.</th>
                              <th className="text-center">OR Ref. No.</th>
                              <th className="text-center">Amount</th>
                              <th className="text-left">Exp. Category</th>
                              <th className="text-center">GL Account	</th>
                              <th className="text-left">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td className="text-left">
                                  <small>{new Date(item.replenish_date).toLocaleDateString()}</small>
                                </td>
                                <td><small>{item.voucher_no}</small></td>
                                <td><small>{item.or_ref_no}</small></td>
                                <td><small>
                                  {item.amount
                                    ? Number(item.amount).toLocaleString("en-PH", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : ""}
                                    </small>
                                </td>
                                <td className="text-left"><small>{item.exp_cat}</small></td>
                                <td><small>{item.gl_account}</small></td>
                                <td className="text-left"><small>{item.remarks}</small></td>
                              </tr>
                            ))}
                            <tr>
                              <td colSpan={3} className="text-center"><small>Total</small></td>
                              <td>
                                <small>
                                  {selectedRequest.total
                                    ? Number(selectedRequest.total).toLocaleString("en-PH", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : "0.00"}
                                  </small>
                              </td>
                              <td colSpan={3}></td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>

                    <div style={{marginTop: '0%', marginBottom: '0%'}} className="replenishment-cash-onhand">
                      <label htmlFor="revolving-fund-amount">
                        <p>Petty Cash/Revolving Fund Amount</p>
                        <input
                          id="revolving-fund-amount"
                          type="text"
                          value={selectedRequest.revolving_amount
                            ? Number(selectedRequest.revolving_amount).toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "0.00"}
                          className="replenish-input"
                          placeholder="Enter revolving fund amount"
                          required
                        />
                      </label>


                      <label htmlFor="total-expense">
                        <p>Less: Total Expenses per vouchers</p>
                        <input
                          id="total-expense"
                          type="text"
                          value={selectedRequest.total_exp
                            ? Number(selectedRequest.total_exp).toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "0.00"}
                          readOnly
                          className="replenish-input"
                        />
                      </label>

                      <label htmlFor="cash-onhand">
                        <p>Cash on Hand</p>
                        <input
                          id="cash-onhand"
                          type="text"
                          value={selectedRequest.cash_onhand
                            ? Number(selectedRequest.cash_onhand).toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "0.00"}
                          readOnly
                          className="replenish-input"
                        />
                      </label>
                    </div>

                    <div className="table">
                      <p hidden>ID: {selectedRequest.id}</p>
                      <table>
                        <tr>
                          <th><small>Submitted by</small></th>
                          <td><small>{selectedRequest.submitted_by}</small></td>
                          <th><small>Signature</small></th>
                          <td className="receive-signature">
                            <small>
                              <input
                                className="prf-input requests-signature"
                                style={{border: "transparent", color: "transparent"}}
                                value={selectedRequest.submitter_signature}
                                readOnly
                                required
                              />
                            </small>
                            {selectedRequest.submitter_signature ? (
                            <img
                                src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.submitter_signature}`}
                                alt="Signature"
                                className="img-sign-prf"
                            />
                            ) : (
                            <div className="img-sign-prf empty-sign"></div>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <th><small>Approved by</small></th>
                          <td><small>{selectedRequest.approved_by}</small></td>
                          <th><small>Signature</small></th>
                          <td className="receive-signature"><small><input className="prf-input requests-signature" style={{border: "transparent", color: "transparent"}} value={selectedRequest.approver_signature} readOnly required/></small>
                            {selectedRequest.approver_signature ? (
                            <img
                                src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.approver_signature}`}
                                alt="Signature"
                                className="img-sign-prf"
                            />
                            ) : (
                            <div className="img-sign-prf empty-sign"></div>
                            )}
                          </td>
                        </tr>
                      </table>
                    </div>
                    {/* <div className="signature-section">
                      <div className="signature-format">
                        <div className="submitter-signature">
                          <label htmlFor="submitted-by">
                            <span className="s-name">{selectedRequest.submitted_by}</span>
                            <span className="s-by">Submitted by</span>
                          </label>
                        </div>
                        <div className="submitter-signature">
                          <label htmlFor="submitted-signature">
                            <span className="sub-sign">{selectedRequest.submitter_signature}</span>
                            {selectedRequest.submitter_signature ? (
                              <img
                              src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.submitter_signature}`}
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
                            <span className="sub-sign">{selectedRequest.approver_signature}</span>
                            {selectedRequest.approver_signature ? (
                              <img
                              src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.approver_signature}`}
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
