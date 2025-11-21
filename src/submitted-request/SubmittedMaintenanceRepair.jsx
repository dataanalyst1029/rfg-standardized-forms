import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-maintenance-repair.css";
// import "./styles/submitted-payment-request.css";
// import "./styles/submitted-request.css";
// import "./styles/submitted-cash-advance.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "new-request", label: "New Maintenance / Repair Request" },
  { id: "submitted", label: "Maintenance / Repair Request Reports" },
];

function SubmittedMaintenanceRepair({ onLogout, currentUserId, showAll = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestCode, setSelectedRequestCode] = useState("");
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isFloatingVisible, setIsFloatingVisible] = useState(true);

  useEffect(() => {
    setIsFloatingVisible(true);
  }, [selectedRequestCode]);

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
        const res = await fetch(`${API_BASE_URL}/api/maintenance_repair_request`);
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
    if (!storedId) return;

    fetch(`${API_BASE_URL}/users/${storedId}`)
      .then((res) => res.json())
      .then((data) => {
        setUserData(data);
        setReceiveInputs({
          received_by: data.name || "",
          received_signature: data.signature || "",
        });
      })
      .catch((err) => console.error("Error fetching user data:", err));
  }, [storedId]);


  useEffect(() => {
    const selected = requests.find(
      (req) => req.mrr_request_code === selectedRequestCode
    );

    if (!selected) {
      setItems([]);
      return;
    }

    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await fetch(
          `${API_BASE_URL}/api/payment_request_item?request_id=${selected.id}`
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
    if (sectionId === "new-request") navigate("/forms/maintenance-or-repair");
  };

  const handleSelectChange = (e) => {
    setSelectedRequestCode(e.target.value);
  };

  const selectedRequest = requests.find(
    (req) => req.mrr_request_code === selectedRequestCode
  );

  if (loading)
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>Loading submitted maintenance / repair request…</span>
    </div>
  );

  const handleReceive = async (request) => {
    try {
      if (!request?.id) {
        alert("Missing request ID. Cannot update status.");
        console.error("Missing request ID:", request);
        return;
      }

      const confirmReceive = window.confirm(
        `Mark ${request.mrr_request_code} as Received?`
      );
      if (!confirmReceive) return;

      console.log("Updating maintenance / repair request:", request.id);

      const userRes = await fetch(`${API_BASE_URL}/api/users/${currentUserId}`);
      if (!userRes.ok) throw new Error("Failed to fetch user data");
      const userData = await userRes.json();

      const payload = {
        status: "Received",
        received_by: userData.name || receiveInputs.received_by,
        received_signature: userData.signature || receiveInputs.received_signature,
      };

      const res = await fetch(`${API_BASE_URL}/api/maintenance_repair_request/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

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

      alert(`Maintenance / Repair Request ${request.mrr_request_code} marked as Received ✅`);

      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id ? { ...r, ...payload } : r
        )
      );
    } catch (err) {
      console.error("Error receiving payment:", err);
      alert("Error updating status. Check console for details.");
    }
  };




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
            Maintenance / Repair Request
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
            Review your submitted maintenance / repair request.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Maintenance / Repair Reports</h1>
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
                      key={req.mrr_request_code}
                      value={req.mrr_request_code}
                    >
                      {req.mrr_request_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequest && (
                <div
                  className="submitted-mrr-request-card"
                  ref={cardRef}
                  style={{ marginTop: "1rem" }} >

                  <div class="record-request">
                    <header className="request-header">
                      <div class="header-brand">
                        <img src={rfgLogo} alt="Ribshack Food Group" className="header-logo" />
                      </div>
                      <div className="header-request-code">
                        <i className="request-code">{selectedRequest.mrr_request_code}</i>
                      </div>
                    </header>

                    <div className="table">
                      <p hidden>ID: {selectedRequest.id}</p>
                      <table>
                        <tr>
                          <th style={{background: '#000', color: '#fff'}}><small>Requestor Details</small></th>
                        </tr>
                        <tr>
                          <th><small>Date Request</small></th>
                          <td><small>{formatDate(selectedRequest.request_date)}</small></td>
                        </tr>
                        <tr>
                          <th><small>Employee ID</small></th>
                          <td><small>{selectedRequest.employee_id}</small></td>
                          <th><small>Name</small></th>
                          <td><small>{selectedRequest.name}</small></td>
                        </tr>
                        <tr>
                          <th><small>Branch</small></th>
                          <td><small>{selectedRequest.branch}</small></td>
                          <th><small>Department</small></th>
                          <td><small>{selectedRequest.department}</small></td>
                        </tr>
                        <tr>
                          <th><small>Date Needed</small></th>
                          <td><small>{formatDate(selectedRequest.date_needed)}</small></td>
                        </tr>
                        <tr>
                          <th style={{color: '#fff', border: '#fff'}}>-</th>
                          <th style={{color: '#fff', border: '#fff'}}>-</th>
                          <th style={{color: '#fff', border: '#fff'}}>-</th>
                          <th style={{color: '#fff', border: '#fff'}}>-</th>
                        </tr>
                        <tr>
                            <th colSpan={4}><small>Description of Work Required</small></th>
                            
                        </tr>
                        <tr>
                            <td colSpan={4} style={{height: '3rem', verticalAlign: 'top', paddingLeft: '1rem'}}><small>{selectedRequest.work_description || '-'}</small></td>
                        </tr>
                        <tr>
                          <th><small>Asset Tag/Code (if applicable)</small></th>
                          <td colSpan={4}><small>{selectedRequest.asset_tag}</small></td>
                        </tr>
                        <tr>
                          <th style={{color: '#fff', border: '#fff'}}>-</th>
                          <th style={{color: '#fff', border: '#fff'}}>-</th>
                          <th style={{color: '#fff', border: '#fff'}}>-</th>
                          <th style={{color: '#fff', border: '#fff'}}>-</th>
                        </tr>
                        <tr>
                          <th style={{background: '#000', color: '#fff'}}><small>Completion Information</small></th>
                        </tr>
                        <tr>
                          <th><small>Performed by</small></th>
                          <td><small>{selectedRequest.performed_by}</small></td>
                          <th><small>Date Completed</small></th>
                          <td><small>{formatDate(selectedRequest.date_completed)}</small></td>
                        </tr>
                        <tr>
                          <th><small>Remarks</small></th>
                        </tr>
                        <tr>
                          <td colSpan={4} style={{height: '3rem', verticalAlign: 'top', paddingLeft: '1rem'}}><small>{selectedRequest.remarks || '-'}</small></td>
                        </tr>
                        <tr>
                          <th style={{color: '#fff', border: '#fff'}}>-</th>
                          <th style={{color: '#fff', border: '#fff'}}>-</th>
                          <th style={{color: '#fff', border: '#fff'}}>-</th>
                          <th style={{color: '#fff', border: '#fff'}}>-</th>
                        </tr>
                        <tr>
                          <th><small>Requested by</small></th>
                          <td><small>{selectedRequest.requested_by}</small></td>
                          <th><small>Signature</small></th>
                          <td className="receive-signature" style={{borderBottom: '0px', borderLeft: '0px', borderRight: '0px'}}><small style={{color: 'transparent', borderBlockEnd: '0px'}}>{selectedRequest.request_signature}</small>
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
                        {(selectedRequest.approved_by || selectedRequest.approved_signature) && (
                          <tr>
                            <th><small>Approved by</small></th>
                            <td><small>{selectedRequest.approved_by}</small></td>
                            <th><small>Signature</small></th>
                            <td className="receive-signature" style={{borderBottom: '0px', borderLeft: '0px', borderRight: '0px'}}><small style={{color: 'transparent', borderBlockEnd: '0px'}}>{selectedRequest.approved_signature}</small>
                              {selectedRequest.approved_signature ? (
                              <img
                                  src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.approved_signature}`}
                                  alt="Signature"
                                  className="img-sign-prf"
                              />
                              ) : (
                              <div className="img-sign-prf empty-sign"></div>
                              )}
                            </td>
                          </tr>
                        )}
                        {(selectedRequest.accomplished_by || selectedRequest.accomplished_signature) && (
                          <tr>
                            <th><small>Accomplished by</small></th>
                            <td><small>{selectedRequest.accomplished_by}</small></td>
                            <th><small>Signature</small></th>
                            <td className="receive-signature" style={{borderBottom: '0px', borderLeft: '0px', borderRight: '0px'}}><small style={{color: 'transparent', borderBlockEnd: '0px'}}>{selectedRequest.accomplished_signature}</small>
                              {selectedRequest.accomplished_signature ? (
                              <img
                                  src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.accomplished_signature}`}
                                  alt="Signature"
                                  className="img-sign-prf"
                              />
                              ) : (
                              <div className="img-sign-prf empty-sign"></div>
                              )}
                            </td>
                          </tr>
                        )}
                      </table>
                    </div>

                    {(selectedRequest.status || selectedRequest.declined_reason) && isFloatingVisible && (
                      <div className={`floating-decline-reason ${selectedRequest.status?.toLowerCase()}`}>
                        <button
                            onClick={() => setIsFloatingVisible(false)}
                            style={{
                              position: "absolute",
                              top: "0px",
                              right: "3px",
                              border: "none",
                              background: "transparent",
                              fontSize: "18px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              color: "#6d6d6dff"
                            }}
                            aria-label="Close"
                          >
                            ×
                          </button>
                        <div className="floating-decline-content" style={{ position: "relative" }}>
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

export default SubmittedMaintenanceRepair;
