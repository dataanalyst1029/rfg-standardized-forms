import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-request.css";

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

  const handlePrint = () => {
    if (!cardRef.current) return;

    const printContents = cardRef.current.outerHTML;
    const printWindow = window.open("", "", "width=900,height=650");

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Purchase Request</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: #fff;
              position: relative;
            }

            h2, h3, h4 {
              margin-bottom: 8px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }

            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }

            th.text-center, td.text-center {
              text-align: center;
            }

            .approved-content {
              margin-top: 2rem;
            }

            .purchase-dept-family{
              margin-top: 3rem;
            }

            .purchase-dept-box {
              page-break-inside: avoid;
              border: 1px solid #ddd;
              margin-top: 1.5rem;
              padding: 1.5rem 3rem;
            }

            .purchase-dept-title {
              text-align: center;
              font-weight: 600;
              margin-bottom: 1rem;
            }
            .purchase-dept-content input:focus {
              border-bottom: 1px solid #444;
              outline: none;
            }

            .purchase-dept-content {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-bottom: 1.5rem;
              position: relative;
            }

            .purchase-dept-content div {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 45%;
            }

            .purchase-dept-content input {
              border: none;
              border-bottom: 1px solid #000;
              text-align: center;
              font-weight: bold;
              margin-bottom: 4px;
              width: 80%;
            }

            .purchase-dept-content p {
              font-style: italic;
              margin: 0;
            }

            .purchase-signature {
              position: relative;
              width: 45%;
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .signature-image {
              position: absolute;
              top: -123px;
              width: 150px;
              height: auto;
              object-fit: contain;
            }

            .purchase-signature p {
              border-top: 1px solid;
              width: 80%;
              text-align: center;
            }

            .floating-buttons {
              position: fixed;
              bottom: 20px;
              right: 20px;
              display: flex;
              gap: 10px;
              z-index: 9999;
            }

            .action-btn {
              width: 44px;
              height: 44px;
              border-radius: 50%;
              border: none;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
              color: white;
              font-size: 20px;
              transition: transform 0.2s ease;
            }

            .action-btn:hover {
              transform: scale(1.1);
            }

            .print-btn {
              background-color: #007bff;
            }

            .pdf-btn {
              background-color: #28a745;
            }

            @media print {
              .floating-buttons {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="floating-buttons">
            <button class="action-btn print-btn" onclick="window.print()" title="Print">🖨️</button>
            <button class="action-btn pdf-btn" id="downloadPDF" title="Download PDF">📥</button>
          </div>

          ${printContents}

          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <script>
            async function toBase64Image(img) {
              const response = await fetch(img.src, {mode: 'cors'});
              const blob = await response.blob();
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
            }

            document.getElementById("downloadPDF").addEventListener("click", async function() {
              const element = document.body.cloneNode(true);
              const buttons = element.querySelector('.floating-buttons');
              if (buttons) buttons.remove();

              const imgs = element.querySelectorAll('img');
              for (let img of imgs) {
                try {
                  const base64 = await toBase64Image(img);
                  img.src = base64;
                } catch (err) {
                  console.warn('Could not convert image:', img.src);
                }
              }

              const opt = {
                margin: 0.5,
                filename: 'Purchase_Request.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
              };

              html2pdf().from(element).set(opt).save();
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
                  className="submitted-request-card"
                  ref={cardRef}
                  style={{ marginTop: "1rem" }} >
                
                  <h2>{selectedRequest.purchase_request_code}</h2>
                  <p hidden>ID: {selectedRequest.id}</p>
                  <p>Requested by: <i>{selectedRequest.request_by}</i></p>
                  <p>Date: <i>{formatDate(selectedRequest.request_date)}</i></p>
                  <p>Branch: <i>{selectedRequest.branch}</i></p>
                  <p>Department: <i>{selectedRequest.department}</i></p>
                  <p>Purpose: <i>{selectedRequest.purpose}</i></p>

                  <div style={{ marginTop: "1.5rem" }}>
                    <h3>Requested Items</h3>
                    {loadingItems ? (
                      <p>Loading items…</p>
                    ) : items.length === 0 ? (
                      <p>No items found for this request.</p>
                    ) : (
                      <table className="p-items-table">
                        <thead>
                          <tr>
                            <th className="text-left">Item Name</th>
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
                  <div className="approved-content">
                    <div className="purchase-dept-content">
                      <div>
                        <input value={selectedRequest.approved_by} readOnly />
                        <p>Approved by</p>
                      </div>

                      <div className="purchase-signature">
                        {selectedRequest.approved_signature ? (
                          <>
                            <img
                              src={`${API_BASE_URL}/${selectedRequest.approved_signature}`}
                              alt="Signature"
                              className="signature-image"
                            />
                            <p>Signature</p>
                          </>
                        ) : (
                          <p><i>No signature available</i></p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="purchase-dept-box">
                    <h4 className="purchase-dept-title">Purchasing Department Use Only</h4>
                    <div className="purchase-dept-family">
                      <div className="purchase-dept-content">
                        <div>
                          <input value={formatDate(selectedRequest.date_ordered)} readOnly/>
                            <p>Date Ordered</p>
                          </div>
                          <div>
                            <input value={selectedRequest.po_number} readOnly/>
                            <p>PO Number</p>
                          </div>
                      </div>
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
