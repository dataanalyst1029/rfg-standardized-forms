import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-request.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "new-request", label: "New Purchase Request" },
  { id: "submitted", label: "Purchase Request Reports" },
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

  // const storedId = sessionStorage.getItem("id");
  // const [userData, setUserData] = useState({ name: "", signature: "" });

  // const [receiveInputs, setReceiveInputs] = useState({
  //   received_by: "",
  //   received_signature: "",
  // });

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/purchase_request`);
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

  // useEffect(() => {
  //   if (!storedId) return;

  //   fetch(`${API_BASE_URL}/users/${storedId}`)
  //     .then((res) => res.json())
  //     .then((data) => {
  //       setUserData(data);
  //       setReceiveInputs({
  //         received_by: data.name || "",
  //         received_signature: data.signature || "",
  //       });
  //     })
  //     .catch((err) => console.error("Error fetching user data:", err));
  // }, [storedId]);

  useEffect(() => {
    const selected = requests.find(
      (req) => req.purchase_request_code === selectedRequestCode
    );

    if (!selected) {
      setItems([]);
      return;
    }

    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await fetch(
          `${API_BASE_URL}/api/purchase_request_items?request_id=${selected.id}`
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
    if (sectionId === "new-request") navigate("/forms/purchase-request");
  };

  const handleSelectChange = (e) => {
    setSelectedRequestCode(e.target.value);
  };

  const selectedRequest = requests.find(
    (req) => req.purchase_request_code === selectedRequestCode
  );

  if (loading)
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>Loading submitted purchase requests…</span>
    </div>
  );

  // const handleReceive = async (request) => {
  //   try {
  //     if (!request?.id) {
  //       alert("Missing request ID. Cannot update status.");
  //       console.error("Missing request ID:", request);
  //       return;
  //     }

  //     const confirmReceive = window.confirm(
  //       `Mark ${request.purchase_request_code} as Received?`
  //     );
  //     if (!confirmReceive) return;

  //     console.log("Updating purchase request:", request.id);

  //     const userRes = await fetch(`${API_BASE_URL}/api/users/${currentUserId}`);
  //     if (!userRes.ok) throw new Error("Failed to fetch user data");
  //     const userData = await userRes.json();

  //     const payload = {
  //       status: "Received",
  //       received_by: userData.name || receiveInputs.received_by,
  //       received_signature: userData.signature || receiveInputs.received_signature,
  //     };

  //     const res = await fetch(`${API_BASE_URL}/api/purchase_request/${request.id}`, {
  //       method: "PUT",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(payload),
  //     });

  //     let data = {};
  //     try {
  //       data = await res.json();
  //     } catch {
  //       console.warn("Non-JSON response from backend");
  //     }

  //     if (!res.ok) {
  //       console.error("Backend response error:", data);
  //       alert(`Failed to update status: ${data.error || "Unknown error"}`);
  //       return;
  //     }

  //     alert(`Purchase Request ${request.purchase_request_code} marked as Received ✅`);

  //     setRequests((prev) =>
  //       prev.map((r) =>
  //         r.id === request.id ? { ...r, ...payload } : r
  //       )
  //     );
  //   } catch (err) {
  //     console.error("Error receiving purchase:", err);
  //     alert("Error updating status. Check console for details.");
  //   }
  // };

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
            Purchase Request
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
            View your submitted purchase requests.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Submitted Purchase Requests</h1>
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
                      key={req.purchase_request_code}
                      value={req.purchase_request_code}
                    >
                      {req.purchase_request_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequest && (
                <div
                  className="submitted-pr-request-card"
                  ref={cardRef}
                  style={{ marginTop: "1rem" }} >

                  <div class="record-request">
                    <header className="request-header">
                      <div class="header-brand">
                        <img src={rfgLogo} alt="Ribshack Food Group" className="header-logo" />
                      </div>
                      <div className="header-request-code">
                        <i className="request-code">{selectedRequest.purchase_request_code}</i>
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
                          <th><small>Requested by</small></th>
                          <td><small>{selectedRequest.request_by}</small></td>
                          <th><small>Contact Number</small></th>
                          <td><small>{selectedRequest.contact_no}</small></td>
                        </tr>
                        <tr>
                          <th><small>Branch</small></th>
                          <td><small>{selectedRequest.branch}</small></td>
                          <th><small>Department</small></th>
                          <td><small>{selectedRequest.department}</small></td>
                        </tr>
                        <tr>
                            <th><small>Address</small></th>
                            <td><small>{selectedRequest.address}</small></td>
                            <th><small>Purpose</small></th>
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
                          <table className="p-items-table">
                          <thead>
                            <tr>
                              <th className="text-center"><small>Quantity</small></th>
                              <th className="text-left"><small>Item Name</small></th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td className="text-center"><small>{item.quantity}</small></td>
                                <td><small>{item.purchase_item}</small></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    <div className="table pr-items-table-wrapper">
                      <table>
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
                        {/* {(selectedRequest.status === "Received" || selectedRequest.status === "Completed") && (
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
                            <th><small>Signature</small></th>
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
                        )} */}
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
                          <th><small>Date ordered</small></th>
                          <td><small><small>{formatDate(selectedRequest.date_ordered)}</small></small></td>
                          <th><small>PO Number</small></th>
                          <td><small>{selectedRequest.po_number}</small></td>
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
                  {/* {selectedRequest.status === "Approved" && (
                    <button
                      className="floating-receive-btn"
                      onClick={() => handleReceive({ ...selectedRequest })}
                      disabled={selectedRequest.status === "Received"}
                    >
                      {selectedRequest.status === "Received" ? "✅ Received" : "Receive"}
                    </button>
                  )}   */}
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
