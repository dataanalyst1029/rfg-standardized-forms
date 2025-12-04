import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-overtime.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "new-request", label: "New Interbranch Transfer Request" },
  { id: "submitted", label: "Interbranch Transfer Slip Reports" },
];

function SubmittedInterbranch({ onLogout, currentUserId, showAll = false }) {
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
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const [receiveForm, setReceiveForm] = useState({
    shortage: null,
    overage: null, 
    shortage_reason: "",
    overage_reason: "",
  });


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

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/interbranch_transfer`);
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
      (req) => req.its_request_code === selectedRequestCode
    );

    if (!selected) {
      setItems([]);
      return;
    }

    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await fetch(
          `${API_BASE_URL}/api/interbranch_transfer_item?request_id=${selected.id}`
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
    if (sectionId === "new-request") navigate("/forms/interbranch-transfer-slip");
  };

  const handleSelectChange = (e) => {
    setSelectedRequestCode(e.target.value);
  };

  const handleReceive = async (data) => {
    try {
      const formData = new FormData();

      formData.append("its_request_code", data.its_request_code);
      formData.append("received_by", userData.name);
      formData.append("received_signature", userData.signature);

      formData.append("shortage_items", data.shortage);
      formData.append("shortage_reason", data.shortage_reason || "");

      formData.append("overage_items", data.overage);
      formData.append("overage_reason", data.overage_reason || "");

      const res = await fetch(
        `${API_BASE_URL}/api/receive_interbranch_transfer_request`,
        {
          method: "PUT",
          body: formData,
        }
      );

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Failed to confirm receive.");
        return;
      }

      alert("✅ Successfully received!");

      // Update UI instantly without refresh
      setRequests((prev) =>
        prev.map((req) =>
          req.its_request_code === data.its_request_code
            ? { ...req, ...result.data }
            : req
        )
      );

      setShowReceiveModal(false);

    } catch (err) {
      console.error("Receive error:", err);
      alert("Server error while receiving.");
    }
  };


  const selectedRequest = requests.find(
    (req) => req.its_request_code === selectedRequestCode
  );

  if (loading)
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>Loading submitted interbranch transfer request…</span>
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
            title="Back to Forms Library"
          >
            Interbranch Tranfer Request
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
            View your submitted interbranch transfer request.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Submitted Interbranch Transfer Request</h1>
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
                      key={req.its_request_code}
                      value={req.its_request_code}
                    >
                      {req.its_request_code}
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
                        <i className="request-code">{selectedRequest.its_request_code}</i>
                      </div>
                    </header>

                    <div className="table">
                      <p hidden>ID: {selectedRequest.id}</p>
                      <table>
                        <tr>
                          <th><small>Date Transferred</small></th>
                          <td><small>{formatDate(selectedRequest.date_transferred)}</small></td>
                        </tr>
                        <tr>
                          <th><small>FROM (Branch Name)</small></th>
                          <td><small>{selectedRequest.from_branch}</small></td>
                          <th><small>TO (Branch Name)</small></th>
                          <td><small>{selectedRequest.to_branch}</small></td>
                          
                        </tr>
                        <tr>
                          <th><small>Address</small></th>
                          <td><small>{selectedRequest.address_from}</small></td>
                          <th><small>Address</small></th>
                          <td><small>{selectedRequest.address_to}</small></td>
                        </tr>
                        <tr>
                            <th><small>Area Operations Controller (AOC)</small></th>
                            <td colSpan={4}><small>{formatDate(selectedRequest.aoc)}</small></td>
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
                              {/* <th className="text-left" style={{background: 'transparent'}}><small>Overtime Hours Rendered</small></th> */}
                            </tr>
                            <tr>
                              <th><small>Item Code</small></th>
                              <th><small>Item Description</small></th>
                              <th><small>Quantity</small></th>
                              <th><small>UoM</small></th>
                              <th className="text-left"><small>Remarks</small></th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td className="text-center"><small>{item.item_code}</small></td>
                                <td className="text-center"><small>{item.item_description}</small></td>
                                <td className="text-center"><small>{item.quantity}</small></td>
                                <td className="text-center"><small>{item.uom}</small></td>
                                <td className="text-left"><small>{item.remarks}</small></td>
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

                    <div className="table" style={{marginTop: '1rem'}}>
                      <table>
                        <tr>
                          <th><small>Vehicle Use</small></th>
                          <td><small>{formatDate(selectedRequest.vehicle_use)}</small></td>
                          <th><small>Specify if Others</small></th>
                          <td><small>{selectedRequest.specify_if_others}</small></td>
                        </tr>
                        <tr>
                          <td colSpan={4}><small className="pr-label">Mode of Transport</small></td>
                        </tr>
                        <tr>
                          <th><small>Vehicle No</small></th>
                          <td><small>{selectedRequest.vehicle_no}</small></td>
                          <th><small>Driver Name</small></th>
                          <td><small>{selectedRequest.driver_name}</small></td>
                        </tr>
                        <tr>
                          <th><small>Driver Contact No</small></th>
                          <td><small>{selectedRequest.driver_contact_no}</small></td>
                          <th><small>Expected Delivery Date</small></th>
                          <td><small>{formatDate(selectedRequest.expected_delivery_date)}</small></td>
                        </tr>
                        <tr>
                          <th style={{color: 'transparent', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent'}}>-</th>
                          <th style={{color: 'transparent', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent'}}>-</th>
                          <th style={{color: 'transparent', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent'}}>-</th>
                          <th style={{color: 'transparent', borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent'}}>-</th>
                        </tr>
                        <tr>
                          <th><small>Prepared by</small></th>
                          <td><small>{selectedRequest.prepared_by}</small></td>
                          <th><small>Signature</small></th>
                          <td style={{borderBottom: '0px', borderLeft: '0px', borderRight: '0px', borderTop: '0px'}} className="receive-signature"><small style={{border: "transparent", color: "transparent"}}>{selectedRequest.prepared_signature}</small>
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

                        <tr>
                          <th><small>Dispatched by</small></th>
                          <td><small>{selectedRequest.dispatched_by}</small></td>
                          <th><small>Signature</small></th>
                          <td style={{borderBottom: '0px', borderLeft: '0px', borderRight: '0px'}} className="receive-signature"><small style={{border: "transparent", color: "transparent"}}>{selectedRequest.dispatched_signature}</small>
                            {selectedRequest.dispatched_signature ? (
                            <img
                                src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.dispatched_signature}`}
                                alt="Signature"
                                className="img-sign-prf"
                            />
                            ) : (
                            <div className="img-sign-prf empty-sign"></div>
                            )}
                          </td>
                        </tr>

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
                  {selectedRequest.status === "Dispatched" && (
                    <button
                      className="floating-receive-btn"
                      onClick={() => setShowReceiveModal(true)}
                    >
                      Receive
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      {showReceiveModal && (
        <div className="modal-overlay">
          <div className="modal-box">

            <div className="modal-header">
              <strong>RECEIVING BRANCH USE ONLY</strong>
            </div>

            <div className="modal-body">

              {/* SHORTAGE */}
              <div className="modal-row">
                <span>Is there a shortage in the items delivered?</span>

                <label>
                  <input
                    type="radio"
                    checked={receiveForm.shortage === true}
                    onChange={() =>
                      setReceiveForm(prev => ({ ...prev, shortage: true }))
                    }
                  />
                  Yes
                </label>

                <label>
                  <input
                    type="radio"
                    checked={receiveForm.shortage === false}
                    onChange={() =>
                      setReceiveForm(prev => ({ ...prev, shortage: false }))
                    }
                  />
                  No
                </label>
              </div>

              {receiveForm.shortage === true && (
                <textarea
                  placeholder="If yes, please specify reason..."
                  value={receiveForm.shortage_reason}
                  onChange={(e) =>
                    setReceiveForm(prev => ({
                      ...prev,
                      shortage_reason: e.target.value,
                    }))
                  }
                  className="pr-textarea"
                />
              )}

              <hr />

              {/* OVERAGE */}
              <div className="modal-row">
                <span>Is there an overage in the items delivered?</span>

                <label>
                  <input
                    type="radio"
                    checked={receiveForm.overage === true}
                    onChange={() =>
                      setReceiveForm(prev => ({ ...prev, overage: true }))
                    }
                  />
                  Yes
                </label>

                <label>
                  <input
                    type="radio"
                    checked={receiveForm.overage === false}
                    onChange={() =>
                      setReceiveForm(prev => ({ ...prev, overage: false }))
                    }
                  />
                  No
                </label>
              </div>

              {receiveForm.overage === true && (
                <textarea
                  placeholder="If yes, please specify reason..."
                  value={receiveForm.overage_reason}
                  onChange={(e) =>
                    setReceiveForm(prev => ({
                      ...prev,
                      overage_reason: e.target.value,
                    }))
                  }

                  className="pr-textarea"
                />
              )}
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowReceiveModal(false)}>Cancel</button>

              <button
                className="confirm-btn"
                onClick={() => handleReceive({ ...selectedRequest, ...receiveForm })}
              >
                Confirm Receive
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default SubmittedInterbranch;
