import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-overtime.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "new-request", label: "New Overtime Request" },
  { id: "submitted", label: "Overtime Request Reports" },
];

function SubmittedOvertimeRequest({ onLogout, currentUserId, showAll = false }) {
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

  function formatTimeManila(timeString) {
    if (!timeString) return "";

    // Parse raw HH:MM:SS without assuming UTC
    const [h, m, s] = timeString.split(":").map(Number);

    const date = new Date();
    date.setHours(h, m, s || 0);

    // Convert and format in Manila time
    return date.toLocaleTimeString("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }


  const storedId = sessionStorage.getItem("id");
  const [userData, setUserData] = useState({ name: "", signature: "" });

  const [receiveInputs, setReceiveInputs] = useState({
    received_by: "",
    received_signature: "",
  });

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/overtime_approval_request`);
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
      (req) => req.overtime_request_code === selectedRequestCode
    );

    if (!selected) {
      setItems([]);
      return;
    }

    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await fetch(
          `${API_BASE_URL}/api/overtime_approval_request_item?request_id=${selected.id}`
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
    if (sectionId === "new-request") navigate("/forms/hr-overtime-approval");
  };

  const handleSelectChange = (e) => {
    setSelectedRequestCode(e.target.value);
  };

  const selectedRequest = requests.find(
    (req) => req.overtime_request_code === selectedRequestCode
  );

  if (loading)
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>Loading submitted overtime requests…</span>
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
        `Mark ${request.overtime_request_code} as Received?`
      );
      if (!confirmReceive) return;

      console.log("Updating overtime request:", request.id);

      const userRes = await fetch(`${API_BASE_URL}/api/users/${currentUserId}`);
      if (!userRes.ok) throw new Error("Failed to fetch user data");
      const userData = await userRes.json();

      const payload = {
        status: "Received",
        received_by: userData.name || receiveInputs.received_by,
        received_signature: userData.signature || receiveInputs.received_signature,
      };

      const res = await fetch(`${API_BASE_URL}/api/overtime_approval_request/${request.id}`, {
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

      alert(`Overtime Request ${request.overtime_request_code} marked as Received ✅`);

      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id ? { ...r, ...payload } : r
        )
      );
    } catch (err) {
      console.error("Error receiving purchase:", err);
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
            title="Back to Forms Library"
          >
            Overtime Request
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
          <span className="pr-sidebar-meta">
            View your submitted overtime requests.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Submitted Overtime Requests</h1>
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
                      key={req.overtime_request_code}
                      value={req.overtime_request_code}
                    >
                      {req.overtime_request_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequest && (
                <div
                  className="submitted-oar-request-card"
                  ref={cardRef}
                  style={{ marginTop: "1rem" }} >

                  <div class="record-request">
                    <header className="request-header">
                      <div class="header-brand">
                        <img src={rfgLogo} alt="Ribshack Food Group" className="header-logo" />
                      </div>
                      <div className="header-request-code">
                        <i className="request-code">{selectedRequest.overtime_request_code}</i>
                      </div>
                    </header>

                    <div className="table">
                      <p hidden>ID: {selectedRequest.id}</p>
                      <table>
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
                          <th colSpan={4}><small>Cut-odd Period</small></th>
                        </tr>
                        <tr>
                            <th><small>From</small></th>
                            <td><small>{formatDate(selectedRequest.cut_off_from)}</small></td>
                            <th><small>To</small></th>
                            <td><small>{formatDate(selectedRequest.cut_off_to)}</small></td>
                        </tr>
                      </table>
                    </div>
                    <div>
                      {loadingItems ? (
                        <p>Loading items…</p>
                        ) : items.length === 0 ? (
                          <p>No items found for this request.</p>
                        ) : (
                          <table className="p-items-table">
                          <thead>
                            <tr>
                              <th className="text-left" style={{background: 'transparent'}}><small>Overtime Hours Rendered</small></th>
                            </tr>
                            <tr>
                              <th><small>OT Date</small></th>
                              <th><small>From</small></th>
                              <th><small>To</small></th>
                              <th><small>Hours</small></th>
                              <th className="text-left"><small>Purpose(s)</small></th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td className="text-center"><small>{formatDate(item.ot_date)}</small></td>
                                <td className="text-center"><small>{formatTimeManila(item.time_from)}</small></td>
                                <td className="text-center"><small>{formatTimeManila(item.time_to)}</small></td>
                                <td className="text-center"><small>{item.hours}</small></td>
                                <td><small>{item.purpose}</small></td>
                              </tr>
                            ))}
                            <tr>
                              <th colSpan={3} style={{border: '1px solid #e0e0e0ff', color: '#959595ff'}}><small>Total</small></th>
                              <th style={{border: '1px solid #e0e0e0ff', color: '#959595ff'}}><small>{selectedRequest.total_hours}</small></th>
                              <th style={{border: '1px solid #e0e0e0ff', color: '#959595ff'}}></th>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                    <div className="table pr-items-table-wrapper">
                      <p hidden>ID: {selectedRequest.id}</p>
                      <table>
                        <tr>
                          <th style={{color: 'transparent', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent'}}>-</th>
                          <th style={{color: 'transparent', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent'}}>-</th>
                          <th style={{color: 'transparent', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent'}}>-</th>
                          <th style={{color: 'transparent', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent'}}>-</th>
                        </tr>
                        <tr>
                          <th><small>Requested by</small></th>
                          <td><small>{selectedRequest.requested_by}</small></td>
                          <th><small>Signature</small></th>
                          <td style={{borderBottom: '0px', borderLeft: '0px', borderRight: '0px', borderTop: '0px'}} className="receive-signature"><small style={{border: "transparent", color: "transparent"}}>{selectedRequest.requested_signature}</small>
                            {selectedRequest.requested_signature ? (
                            <img
                                src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.requested_signature}`}
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
                            <td><small>{selectedRequest.approved_by}</small></td>
                            <th><small>Signature</small></th>
                            <td style={{borderBottom: '0px', borderLeft: '0px', borderRight: '0px'}} className="receive-signature"><small style={{border: "transparent", color: "transparent"}}>{selectedRequest.approved_signature}</small>
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
                        {(selectedRequest.status === "Received") && (
                          <tr>
                            <th><small>Received by</small></th>
                            <td><small>{selectedRequest.received_by}</small></td>
                            <th><small>Signature</small></th>
                            <td style={{borderBottom: '0px', borderLeft: '0px', borderRight: '0px'}} className="receive-signature"><small style={{border: "transparent", color: "transparent"}}>{selectedRequest.received_signature}</small>
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

export default SubmittedOvertimeRequest;
