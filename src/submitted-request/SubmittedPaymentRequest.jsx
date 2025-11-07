import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-payment-request.css";
// import "./styles/submitted-request.css";
// import "./styles/submitted-cash-advance.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted payment requests" },
  { id: "new-request", label: "New payment request" },
];

function SubmittedPurchaseRequests({ onLogout, currentUserId, showAll = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestCode, setSelectedRequestCode] = useState("");
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
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

  const storedId = sessionStorage.getItem("id");
  const [userData, setUserData] = useState({ name: "", signature: "" });

  const [receiveInputs, setReceiveInputs] = useState({
  received_by: "",
  received_signature: "",
});


  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payment_request`);
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
      (req) => req.prf_request_code === selectedRequestCode
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
    if (sectionId === "new-request") navigate("/forms/payment-request-form");
  };

  const handleSelectChange = (e) => {
    setSelectedRequestCode(e.target.value);
  };

  const selectedRequest = requests.find(
    (req) => req.prf_request_code === selectedRequestCode
  );

  if (loading)
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>Loading submitted payment requests…</span>
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
        `Mark ${request.prf_request_code} as Received?`
      );
      if (!confirmReceive) return;

      // ✅ Log what we're about to send
      console.log("Updating payment request:", request.id);

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
      const res = await fetch(`${API_BASE_URL}/api/payment_request/${request.id}`, {
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

      alert(`Payment Request ${request.prf_request_code} marked as Received ✅`);

      // ✅ Update UI instantly
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
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2
            onClick={() => navigate("/forms-list")}
            style={{ cursor: "pointer", color: "#007bff" }}
          >
            Payment Request
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
            Review your submitted payment requests.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Payment Request Reports</h1>
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
                      key={req.prf_request_code}
                      value={req.prf_request_code}
                    >
                      {req.prf_request_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequest && (
                <div
                  className="submitted-prf-request-card"
                  ref={cardRef}
                  style={{ marginTop: "1rem" }} >

                  <div class="record-request">
                    <header className="request-header">
                      <div class="header-brand">
                        <img src={rfgLogo} alt="Ribshack Food Group" className="header-logo" />
                      </div>
                      <div className="header-request-code">
                        <i className="request-code">{selectedRequest.prf_request_code}</i>
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
                          <th style={{color: '#fff'}}>-</th>
                          <th style={{color: '#fff'}}>-</th>
                          <th style={{color: '#fff'}}>-</th>
                          <th style={{color: '#fff'}}>-</th>
                        </tr>
                        <tr>
                            <th><small>Vendor/Supplier (Payee's Name):</small></th>
                            <td><small>{selectedRequest.vendor_supplier}</small></td>
                            <th><small>PR Number (if applicable):</small></th>
                            <td><small>{selectedRequest.pr_number}</small></td>
                        </tr>
                        <tr>
                            <th><small>Date Needed:</small></th>
                            <td><small>{new Date(selectedRequest.date_needed).toLocaleDateString()}</small></td>
                            <th><small>Purpose:</small></th>
                            <td><small>{selectedRequest.purpose}</small></td>
                        </tr>
                      </table>
                    </div>
                    <div>
                      {loadingItems ? (
                        <p>Loading items…</p>
                      ) : items.length === 0 ? (
                        <p>No items found for this request.</p>
                      ) : (
                        <table className="rfrf-items-table">
                          <thead>
                            <tr>
                              <th className="text-center">Item</th>
                              <th className="text-center">Quantity</th>
                              <th className="text-center">Unit Price</th>
                              <th className="text-center">Amount</th>
                              <th className="text-center">Expense Charges</th>
                              <th className="text-center">Location (Store/Branch)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td className="text-center">{item.item}</td>
                                <td className="text-center">{item.quantity}</td>
                                <td className="text-center">{item.unit_price}</td>
                                <td className="text-center">{item.amount}</td>
                                <td className="text-center">{item.expense_charges}</td>
                                <td className="text-center">{item.location}</td>
                              </tr>
                            ))}
                            <tr>
                              <td colSpan={3} className="text-center">Grand Total</td>
                              <td className="text-center">{selectedRequest.total_amount
                                      ? Number(selectedRequest.total_amount).toLocaleString("en-PH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                  })
                                  : "0.00"}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          </tbody>

                        </table>
                      )}
                    </div>

                    <div className="table">
                      <p hidden>ID: {selectedRequest.id}</p>
                      <table>
                        <tr>
                          
                        </tr>
                        <tr>
                          <th><small>Requested by</small></th>
                          <td><small><input className="prf-input" value={selectedRequest.requested_by}/></small></td>
                          <th><small>Signature</small></th>
                          <td className="receive-signature"><small><input className="prf-input requests-signature" style={{border: "transparent", color: "transparent"}} value={selectedRequest.requested_signature} readOnly required/></small>
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
                        <tr>
                          <th><small>Approved by</small></th>
                          <td><small><input type="text" className="prf-input" value={selectedRequest.approved_by}/></small></td>
                          <th><small>Signature</small></th>
                          <td className="receive-signature"><small><input className="prf-input requests-signature" style={{border: "transparent", color: "transparent"}} value={selectedRequest.approved_signature} readOnly required/></small>
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
                          <th><small>Received by</small></th>
                          <td>
                            <input
                              type="text"
                              className="prf-input"
                              value={userData.name}
                              onChange={(e) =>
                                setReceiveInputs({ ...receiveInputs, received_by: e.target.value })
                              }
                              required
                            />
                          </td>
                          <th>Signature</th>
                          <td className="receive-signature">
                            <input
                              type="text"
                              className="prf-input requests-signature"
                              style={{ border: "transparent", color: "black" }}
                              value={userData.signature}
                              onChange={(e) =>
                                setReceiveInputs({ ...receiveInputs, received_signature: e.target.value })
                              }
                              readOnly
                              required
                            />
                            {receiveInputs.received_signature ? (
                              <img
                                src={`${API_BASE_URL}/uploads/signatures/${receiveInputs.received_signature}`}
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
