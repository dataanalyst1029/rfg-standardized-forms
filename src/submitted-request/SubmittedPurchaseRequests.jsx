import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./submitted-request.css";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted purchase requests" },
  { id: "new-request", label: "New purchase request" },
];

function SubmittedPurchaseRequests({ onLogout, currentUserId, showAll = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestCode, setSelectedRequestCode] = useState("");
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const cardRef = useRef(null); // 🆕 Ref for selected request card
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

  // 🖨️ Print only the selected card
  const handlePrint = () => {
    if (!cardRef.current) return;
    const printContents = cardRef.current.innerHTML;
    const printWindow = window.open("", "", "width=900,height=650");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Purchase Request</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2, h3, h4 { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th.text-center, td.text-center { text-align: center; }
            .purchase-dept { margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const selectedRequest = requests.find(
    (req) => req.purchase_request_code === selectedRequestCode
  );

  if (loading) return <div>Loading submitted purchase requests…</div>;

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2
            onClick={() => navigate("/forms-list")}
            style={{ cursor: "pointer", color: "#007bff" }}
          >
            Purchase Request
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
            Review your submitted purchase requests.
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
            <button
              onClick={handlePrint}
              className="print-btn"
              style={{
                
              }}
            >
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
                  <option value="">-- Choose Reference Number --</option>
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
                  className="submitted-request-card"
                  ref={cardRef} // 🆕 Ref added here
                  style={{ marginTop: "1rem" }}
                >
                  <h2>{selectedRequest.purchase_request_code}</h2>
                  <p hidden>ID: {selectedRequest.id}</p>
                  <p>Requested by: {selectedRequest.request_by}</p>
                  <p>Date: {formatDate(selectedRequest.request_date)}</p>
                  <p>
                    Branch: {selectedRequest.branch} | Department:{" "}
                    {selectedRequest.department}
                  </p>
                  <p>Purpose: {selectedRequest.purpose}</p>

                  <div style={{ marginTop: "1.5rem" }}>
                    <h3>Requested Items</h3>
                    {loadingItems ? (
                      <p>Loading items…</p>
                    ) : items.length === 0 ? (
                      <p>No items found for this request.</p>
                    ) : (
                      <table className="pr-items-table">
                        <thead>
                          <tr>
                            <th>Item Name</th>
                            <th className="text-center">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id}>
                              <td>{item.purchase_item}</td>
                              <td className="text-center">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                    <div className="purchase-dept-box">
                        <h4 className="purchase-dept-title">Purchasing Department Use Only</h4>
                    
                        <div className="purchase-dept-content">
                            <p>Date Ordered: {selectedRequest.date_ordered}</p>
                            <p>PO Number: {selectedRequest.po_number}</p>
                        </div>

                        <div className="purchase-dept-content">
                            <p>Approved by: {selectedRequest.approved_by}</p>
                            <p>Status: <strong>{selectedRequest.status}</strong></p>
                        </div>
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
