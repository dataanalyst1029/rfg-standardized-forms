import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-overtime.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "new-request", label: "New Leave Application" },
  { id: "submitted", label: "Leave Request Reports" }
];

function SubmittedLeaveApplication({ onLogout, currentUserId, showAll = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestCode, setSelectedRequestCode] = useState("");
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isFloatingVisible, setIsFloatingVisible] = useState(true);

  const [leaveBalances, setLeaveBalances] = useState({
    "Vacation Leave": 0,
    "Sick Leave": 0,
    "Emergency Leave": 0,
  });

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

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") {
      navigate("/forms/hr-leave-application");
    }
  };

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/leave_application`);
        if (!res.ok) throw new Error("Failed to fetch submitted requests");
        const data = await res.json();

        const hydrated = data.map((req) => ({
          ...req,
          submitted_by: req.user_id,
        }));

        if (showAll) {
          setRequests(hydrated);
        } else {
          setRequests(
            hydrated.filter((req) => Number(req.submitted_by) === Number(currentUserId))
          );
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
    const storedId = sessionStorage.getItem("id");
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
  }, []);

  const selectedRequest = requests.find(
    (req) => req.laf_request_code === selectedRequestCode
  );

  useEffect(() => {
    if (!selectedRequest) return;

    const userId = selectedRequest.user_id || selectedRequest.employee_id;

    if (!userId) {
      console.warn("❌ No user ID found to load leave balances.");
      return;
    }

    const fetchBalances = async () => {
      const types = ["Vacation Leave", "Sick Leave", "Emergency Leave"];
      const result = {};

      for (const type of types) {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/user_leaves/${userId}/${encodeURIComponent(type)}`
          );
          const data = await res.json();
          result[type] = data.leave_days ?? 0;
        } catch (err) {
          console.error(`❌ Error loading ${type}:`, err);
          result[type] = 0;
        }
      }

      setLeaveBalances(result);
    };

    fetchBalances();
  }, [selectedRequest]);

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading submitted leave requests…</span>
      </div>
    );

  return (
    <div className="pr-layout">
      {isMobileView && (
        <button className="burger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          ☰
        </button>
      )}

      <aside className={`pr-sidebar ${isMobileMenuOpen ? "open" : ""}`}>
        <div className="pr-sidebar-header">
          <h2 onClick={() => navigate("/forms-list")} style={{ cursor: "pointer", color: "#007bff" }}>
            Leave Application Form
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
          <span className="pr-sidebar-meta">View your submitted leave requests.</span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Submitted Leave Application Requests</h1>
            <p className="pr-topbar-meta">Select a reference number to view details.</p>
          </div>

          {selectedRequest && (
            <button className="print-btn" onClick={() => window.print()}>
              🖨️ Print
            </button>
          )}
        </header>

        <div className="submitted-requests-container">
          <div className="dropdown-section">
            <label>Select Reference No: </label>
            <select className="pr-input" value={selectedRequestCode} onChange={(e) => setSelectedRequestCode(e.target.value)}>
              <option value="" disabled>
                -- Choose Reference Number --
              </option>
              {requests.map((req) => (
                <option key={req.laf_request_code} value={req.laf_request_code}>
                  {req.laf_request_code}
                </option>
              ))}
            </select>
          </div>

          {selectedRequest && (
            <div className="submitted-oar-request-card" ref={cardRef} style={{ marginTop: "1rem" }}>
              <div className="record-request">
                <header className="request-header">
                  <div className="header-brand">
                    <img src={rfgLogo} alt="Ribshack Food Group" className="header-logo" />
                  </div>
                  <div className="header-request-code">
                    <i className="request-code">{selectedRequest.laf_request_code}</i>
                  </div>
                </header>

                <div className="table">
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
                      <th><small>Position</small></th>
                      <td><small>{selectedRequest.position}</small></td>
                      <td></td>
                      <td></td>
                    </tr>
                    <tr>
                      <th style={{color: 'transparent', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent'}}>-</th>
                      <th style={{color: 'transparent', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent'}}>-</th>
                      <th style={{color: 'transparent', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent'}}>-</th>
                      <th style={{color: 'transparent', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent'}}>-</th>
                    </tr>
                    <tr>
                      <th><small>Leave Type</small></th>
                      <td><small>{selectedRequest.leave_type}</small></td>

                      {selectedRequest.leave_type === "Others" ? (
                        <>
                          <th><small>Specify Other Leave Type</small></th>
                          <td><small>{selectedRequest.specify_other_leave_type}</small></td>
                        </>
                      ) : (
                        <>
                          <td></td>
                          <td></td>
                        </>
                      )}
                    </tr>

                    <tr>
                      <th><small>Leave Date</small></th>
                      <td><small>
                          {formatDate(selectedRequest.leave_date_from)} -{" "}
                          {formatDate(selectedRequest.leave_date_to)}
                        </small>
                      </td>
                      <td></td>
                      <td></td>
                    </tr>

                    <tr>
                      <th><small>Remarks</small></th>
                      <td><small>{selectedRequest.remarks}</small></td>
                      <th><small>Date Received</small></th>
                      <td><small>{formatDate(selectedRequest.date_received)}</small></td>
                    </tr>

                    <tr>
                      <th colSpan={4}>
                        <small>Available Leave Days</small>
                      </th>
                    </tr>
                    <tr>
                      <td colSpan={4} style={{ padding: "10px", paddingLeft: "5%" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            textAlign: "center",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", width: "200px" }}>
                            <span><small>Vacation Leave:</small></span>
                            <span><small>{leaveBalances["Vacation Leave"]}</small></span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", width: "200px" }}>
                            <span><small>Sick Leave:</small></span>
                            <span><small>{leaveBalances["Sick Leave"]}</small></span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", width: "200px" }}>
                            <span><small>Emergency Leave:</small></span>
                            <span><small>{leaveBalances["Emergency Leave"]}</small></span>
                          </div>
                        </div>
                      </td>
                    </tr>
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
                      <td className="receive-signature">
                        <small><input className="prf-input requests-signature" style={{border: "transparent", color: "transparent"}} value={selectedRequest.requested_signature} readOnly required/></small>
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
                    {(selectedRequest.endorsed_by || selectedRequest.endorsed_signature) && (
                      <tr>
                        <th><small>Endorsed by</small></th>
                        <td><small>{selectedRequest.endorsed_by}</small></td>
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

                    {(selectedRequest.approve_by || selectedRequest.approve_signature) && (
                      <tr>
                        <th><small>Approved by</small></th>
                        <td><small>{selectedRequest.approve_by}</small></td>
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
                  </table>
                </div>
                
                {(selectedRequest.status || selectedRequest.declined_reason) &&
                  isFloatingVisible && (
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
                          color: "#6d6d6dff",
                        }}
                      >
                        ×
                      </button>

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
        </div>
      </main>
    </div>
  );
}

export default SubmittedLeaveApplication;