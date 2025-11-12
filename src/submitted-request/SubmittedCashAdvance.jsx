import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-request.css";
import "./styles/submitted-cash-advance.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "new-request", label: "New Cash Advance Budget Request" },
  { id: "submitted", label: "Cash Advance Budget Request Reports" },
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

  const storedId = sessionStorage.getItem("id");
  const [userData, setUserData] = useState({ name: "", signature: "" });

  const [receiveInputs, setReceiveInputs] = useState({
    received_by: "",
    received_signature: "",
  });

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cash_advance_request`);
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
      (req) => req.ca_request_code === selectedRequestCode
    );

    if (!selected) {
      setItems([]);
      return;
    }

    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await fetch(
          `${API_BASE_URL}/api/cash_advance_request_item?request_id=${selected.id}`
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
    if (sectionId === "new-request") navigate("/forms/cash-advance-budget-request-form");
  };

  const handleSelectChange = (e) => {
    setSelectedRequestCode(e.target.value);
  };

  const handleReceive = async (request) => {
    try {
      if (!request?.id) {
        alert("Missing request ID. Cannot update status.");
        console.error("Missing request ID:", request);
        return;
      }

      const confirmReceive = window.confirm(
        `Mark ${request.ca_request_code} as Received?`
      );
      if (!confirmReceive) return;

      // ✅ Log what we're about to send
      console.log("Updating cash advance budget request:", request.id);

      // ✅ Get current user details (with fallback)
      const userRes = await fetch(`${API_BASE_URL}/api/users/${currentUserId}`);
      if (!userRes.ok) throw new Error("Failed to fetch user data");
      const userData = await userRes.json();

      const payload = {
        status: "Received",
        received_by: userData.name || receiveInputs.received_by,
        received_signature: userData.signature || receiveInputs.received_signature,
      };

      // ✅ Update request on backend
      const res = await fetch(`${API_BASE_URL}/api/cash_advance_request/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // ✅ Safely handle non-JSON responses
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

      alert(`Cash Advance Budget Request ${request.ca_request_code} marked as Received ✅`);

      // ✅ Update UI instantly
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id ? { ...r, ...payload } : r
        )
      );
    } catch (err) {
      console.error("Error receiving cash advance budget request:", err);
      alert("Error updating status. Check console for details.");
    }
  };

  const selectedRequest = requests.find(
    (req) => req.ca_request_code === selectedRequestCode
  );

  if (loading)
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>Loading submitted cash advance budget requests…</span>
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
            Cash Advance Budget Request
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
            Review your submitted cash advance budget requests.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Cash Advance Budget Request Reports</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view details.
            </p>
          </div>

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
                      key={req.ca_request_code}
                      value={req.ca_request_code}
                    >
                      {req.ca_request_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequest && (
                <button className="print-btn" onClick={() => window.print()}>
                  🖨️ Print
                </button>
              )}

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
                        <i className="request-code">{selectedRequest.ca_request_code}</i>
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
                         <tr>
                          <th style={{color: '#fff'}}>-</th>
                          <th style={{color: '#fff'}}>-</th>
                          <th style={{color: '#fff'}}>-</th>
                          <th style={{color: '#fff'}}>-</th>
                        </tr>
                        <tr>
                          <th>Nature of Activity</th>
                          <td>{selectedRequest.nature_activity}</td>
                          <th>Inclusive date(s)</th>
                          <td>{`${new Date(selectedRequest.inclusive_date_from).toLocaleDateString()} - ${new Date(selectedRequest.inclusive_date_to).toLocaleDateString()}`}</td>
                        </tr>
                        <tr>
                          <th>Purpose</th>
                          <td colSpan={3}>{selectedRequest.purpose}</td>
                        </tr>
                      </table>
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
                              <th className="text-center">DESCRIPTION</th>
                              <th className="text-center">AMOUNT</th>
                              <th className="text-center">EXPENSE CATEGORY</th>
                              <th className="text-center">STORE / BRANCH</th>
                              <th>REMARKS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td className="text-center">{item.description}</td>
                                <td className="text-center">{item.amount}</td>
                                <td className="text-center">{item.exp_cat}</td>
                                <td className="text-center">{item.store_branch}</td>
                                <td>{item.remarks}</td>
                              </tr>
                            ))}
                            <tr>
                              <td className="text-center">Grand Total</td>
                              <td className="text-center">{selectedRequest.total_amount
                                      ? Number(selectedRequest.total_amount).toLocaleString("en-PH", {
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

                    <div className="table pr-items-table-wrapper">
                      <p hidden>ID: {selectedRequest.id}</p>
                      <table>
                        <tr>
                          <th><small>Requested by</small></th>
                          <td><small><input className="prf-input" value={selectedRequest.requested_by}/></small></td>
                          <th><small>Signature</small></th>
                          <td className="receive-signature"><small><input className="prf-input requests-signature" style={{border: "transparent", color: "transparent"}} value={selectedRequest.request_signature} readOnly required/></small>
                            {selectedRequest.request_signature ? (
                            <img
                                src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.request_signature}`}
                                alt="Signature"
                                className="img-sign-prf"
                            />
                            ) : (
                            <div className="img-sign-prf empty-sign"></div>
                            )}
                          </td>
                        </tr>
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

                        {(selectedRequest.status === "Received" || selectedRequest.status === "Completed") && (
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
                        )}
                        <tr>
                          <th style={{color: '#fff', borderColor: 'transparent'}}>-</th>
                          <th style={{color: '#fff', borderColor: 'transparent'}}>-</th>
                          <th style={{color: '#fff', borderColor: 'transparent'}}>-</th>
                          <th style={{color: '#fff', borderColor: 'transparent'}}>-</th>
                        </tr>
                        <tr>
                          <th colSpan={4} style={{textAlign: "center", background: "#1a1b1bff", color: "#adadadff"}}>ACCOUNTING DEPARTMENT USE ONLY</th>
                        </tr>
                        <tr>
                          <td colSpan={2}><em>Released through</em></td>
                          <td colSpan={2}><em>**If check issuance</em></td>
                        </tr>
                        <tr>
                          <td><small>Check**</small></td>
                          <td><small><input type="checkbox" className="prf-input" checked = {!!selectedRequest.check} onChange={(e) => setSelectedRequest({...selectedRequest,check: e.target.checked,})}/></small></td>

                          <td><small>Check No.</small></td>
                          <td><small><input type="text" className="prf-input" value={selectedRequest.check_no} readOnly/></small></td>
                        </tr>

                        <tr>
                          <td><small>Petty Cash Voucher</small></td>
                          <td><small><input type="checkbox" className="prf-input" checked = {!!selectedRequest.voucher_petty_cash} onChange={(e) => setSelectedRequest({...selectedRequest,voucher_petty_cash: e.target.checked,})}/></small></td>
                          <td><small>Bank G/L Code</small></td>
                          <td><small><input type="text" className="prf-input" value={selectedRequest.bank_gl_code} readOnly/></small></td>
                        </tr>
                        
                      </table>
                    </div>

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
                  {selectedRequest.status === "Approved" && (
                    <button
                      className="floating-receive-btn"
                      onClick={() => handleReceive({ ...selectedRequest })}
                      disabled={selectedRequest.status === "Received"}
                    >
                      {selectedRequest.status === "Received" ? "✅ Received" : "Receive"}
                    </button>
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

export default SubmittedPurchaseRequests;
