import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-request.css";
import "./styles/submitted-cash-advance.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted cash advance liquidation" },
  { id: "new-request", label: "New cash advance liquidation" },
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
        const res = await fetch(`${API_BASE_URL}/api/cash_advance_liquidation`);
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
      (req) => req.cal_request_code === selectedRequestCode
    );

    if (!selected) {
      setItems([]);
      return;
    }

    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await fetch(
          `${API_BASE_URL}/api/cash_advance_liquidation_items?request_id=${selected.id}`
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
    if (sectionId === "new-request") navigate("/forms/cash-advance-liquidation-form");
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
          <title>Print Cash Advance Liquidation</title>
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

            .submitted-revolving-request-card {
              margin-bottom: 2rem;
              padding: 1rem;
              background-color: var(--card-bg, #ffffff);
              color: var(--card-text, #111);
              transition: background-color 0.3s, color 0.3s, border-color 0.3s;
            }

            .record-request{
              background: #ffffff;
              padding: 1.15rem 1.4rem;
              margin: 0 auto;
              box-shadow: 0 4px 14px rgba(255, 255, 255, 0.08);
              color: var(--card-text, #222);
              display: flex;
              flex-direction: column;
              gap: 1.05rem;
            }

            .request-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 1.5rem;
              border-bottom: 2px solid #ddd;
              padding-bottom: 0.6rem;
            }

            .header-brand {
              display: flex;
              align-items: center;
              gap: 0.65rem;
            }

            .header-logo {
              width: 150px; 
            }
            
            .header-request-code {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
            }

            .table table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #ddd;  
            } 

            .table table th,
            .table table td {
              border: 1px solid #ddd;
              padding: .5rem;
              text-align: left;
            }

            .rf-signature-row {
              margin-top: 1.5rem;
              display: flex;
              justify-content: center;
              align-items: flex-end;
              gap: 4rem;
              flex-wrap: wrap;
            }

            .rf-signature-block {
              min-width: 220px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.3rem;
            }

            .rf-signature-line {
              display: inline-block;
              min-width: 220px;
              text-align: center;
              padding-bottom: 0.2rem;
              border-bottom: 1px solid currentColor;
              font-weight: 600;
            }

            .rf-signature-line.muted {
              font-style: italic;
              color: var(--card-meta, #555);
            }

            .rf-signature-image {
              max-width: 160px;
              height: auto;
              object-fit: contain;
            }

            .rf-no-border {
              border: none !important;
              background: transparent !important;
              box-shadow: none !important;
              padding: 0 !important;
            }

            .rf-status-row {
              margin-top: 1rem;
            }

            .rfrf-items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 0.75rem;
              font-size: 0.95rem;
              border: 1px solid var(--table-border, #aaaaaa);
              background-color: var(--table-bg, #fff);
              color: var(--table-text, #333);
            }

            .rfrf-items-table thead tr th {
              background: var(--color-table-header);
              text-transform: uppercase;
              padding: 0.3rem 0.8rem;
              font-size: 0.72rem;
              letter-spacing: 0.08em;
              color: var(--color-text-muted);
            }

            .rfrf-items-table td {
              border: 1px solid var(--table-border, #dcdcdc);
              padding: 0.5rem 0.75rem;
              text-align: left;
            }

            .rfrf-items-table tbody tr:hover {
              background-color: var(--table-hover, #ececec);
            }

            .rfrf-items-table td.text-center {
              text-align: center !important;
              vertical-align: middle;
            }

            .signature-section{
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .signature-section > div > div {
              width: 100%;
            }

            .signature-format .s-by {
              font-weight: bold;
            }

            .signature-format .s-name {
              border-bottom: 1px solid #555;
              font-size: 1rem;
              padding: 0 1rem;
            }

            .signature-format {
              display: flex;
              flex-direction: row;
              text-align: center;
              justify-content: space-evenly;
              padding: 16px;
              width: 100%;
              margin-top: 2rem;
            }

            .signature-format label {
              display: flex;
              flex-direction: column;
              font-size: 0.9rem;
            }

            .submitter-signature {
              position: relative;
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .submitter-signature .sub-sign {
              color: transparent;
              border-bottom: 1px solid #555;
              font-size: 1rem;
              padding: 0 1rem;
            }

            .submitter-signature .img-sign {
              position: absolute;
              top: 0;
              left: 50%;
              width: 120px;
              height: auto;
              object-fit: contain;
              transform: translate(-53%, -50%);
              z-index: 0;
              max-width: 25vw;
              margin-top: 8px;
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
                filename: 'Revolving Request.pdf',
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
    (req) => req.cal_request_code === selectedRequestCode
  );

  if (loading)
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>Loading submitted cash advance liquidation…</span>
    </div>
  );

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2
            onClick={() => navigate("/forms-list")}
            style={{ cursor: "pointer", color: "#007bff" }}
          >
            Cash Advance Liquidation
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
            Review your submitted cash advance liquidation.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Cash Advance Liquidation Reports</h1>
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
                      key={req.cal_request_code}
                      value={req.cal_request_code}
                    >
                      {req.cal_request_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequest && (
                <div
                  className="submitted-revolving-request-card"
                  ref={cardRef}
                  style={{ marginTop: "1rem" }} >

                  <div class="record-request">
                    <header className="request-header">
                      <div class="header-brand">
                        <img src={rfgLogo} alt="Ribshack Food Group" className="header-logo" />
                      </div>
                      <div className="header-request-code">
                        <i className="request-code">{selectedRequest.cal_request_code}</i>
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
                      </table>
                    </div>
                    <div class="replenish-amount">
                      <p>
                          <strong>Check / PCV No:</strong>{" "}
                          <em>{selectedRequest.check_pcv_no}</em>
                      </p>
                      <p>
                          <strong>Cut-off Date:</strong>{" "}
                          <em>{new Date(selectedRequest.cutoff_date).toLocaleDateString()}</em>
                      </p>
                      <p>
                          <strong>Nature of Activity:</strong>{" "}
                          <em>{selectedRequest.nature_activity}</em>
                      </p>
                      <p>
                          <strong>Inclusive date(s):</strong>{" "}
                          <em>{new Date(selectedRequest.inclusive_date_from).toLocaleDateString()} - {new Date(selectedRequest.inclusive_date_to).toLocaleDateString()}</em>
                      </p>
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
                              <th className="text-center">Date of Transaction</th>
                              <th className="text-center">Description</th>
                              <th className="text-center">OR No.</th>
                              <th className="text-center">Amount</th>
                              <th className="text-center">Expense Charges</th>
                              <th className="text-center">Store/Branch</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td className="text-center">{new Date(item.transaction_date).toLocaleDateString()}</td>
                                <td className="text-center">{item.description}</td>
                                <td className="text-center">{item.or_no}</td>
                                <td className="text-center">{item.amount
                                  ? Number(item.amount).toLocaleString("en-PH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                  })
                                  : "0.00"}
                                </td>
                                <td className="text-center">{item.exp_charges}</td>
                                <td className="text-center">{item.store_branch}</td>
                              </tr>
                            ))}
                            <tr>
                              <td className="text-center" colSpan={3}><strong>Total Expenses</strong></td>
                              <td className="text-center">{selectedRequest.total_expense
                                      ? Number(selectedRequest.total_expense).toLocaleString("en-PH", {
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

                    <div>
                      <h2 className="pr-section-title">Expenses Breakdown</h2>
                        <table className="rfrf-items-table">
                          <thead>
                            <tr>
                              <th className="text-center">Budgeted</th>
                              <th className="text-center">Actual</th>
                              <th className="text-center">Difference</th>
                            </tr>
                          </thead>
                          <tbody>
                              <tr>
                                <td className="text-center">{selectedRequest.budgeted
                                  ? Number(selectedRequest.budgeted).toLocaleString("en-PH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                  })
                                  : "0.00"}
                                </td>
                                <td className="text-center">{selectedRequest.actual
                                  ? Number(selectedRequest.actual).toLocaleString("en-PH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                  })
                                  : "0.00"}
                                </td>
                                <td className="text-center">{selectedRequest.difference
                                  ? Number(selectedRequest.difference).toLocaleString("en-PH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                  })
                                  : "0.00"}
                                </td>
                              </tr>
                          </tbody>
                        </table>
                    </div>

                    <div>
                      <div className="pr-flex-container">
                          <div className="pr-section">
                            <h2 className="pr-section-title">When Budgeted Exceeds Actual</h2>
                            <div>
                              <span>Deposit of Excess</span>
                              <input
                                value={selectedRequest.excess_deposit || ""}
                                readOnly
                              />
                            </div>
                            <div>
                              <span>Date</span>
                              <input
                                value={new Date(selectedRequest.date_excess).toLocaleDateString()}
                                readOnly
                              />
                            </div>
                            <div>
                              <span>Acknowledgement Receipt No.</span>
                              <input
                                value={selectedRequest.ack_rcpt_no || ""}
                                readOnly
                              />
                            </div>
                            <div>
                                <span>Amount</span>
                                <input
                                  value={selectedRequest.exceed_amount || ""}
                                  readOnly
                                />
                            </div>
                          </div>
                          <div className="pr-section" >
                              <h2 className="pr-section-title">When Actual Exceeds Budgeted</h2>
                              <div>
                                  <span>Reimbursable Amount</span>
                                  <input
                                  value={selectedRequest.rb_amount || ""}
                                  readOnly
                                  />
                              </div>
                            </div>
                      </div>
                    </div>
                    <div className="signature-section">
                      <div className="signature-format">
                        <div className="submitter-signature">
                          <label htmlFor="submitted-by">
                            <span className="s-name">{selectedRequest.prepared_by}</span>
                            <span className="s-by">Submitted by</span>
                          </label>
                        </div>
                        <div className="submitter-signature">
                          <label htmlFor="submitted-signature">
                            <span className="sub-sign">{selectedRequest.prepared_signature}</span>
                            {selectedRequest.prepared_signature ? (
                              <img
                              src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.prepared_signature}`}
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
                            <span className="sub-sign">{selectedRequest.approve_signature}</span>
                            {selectedRequest.approve_signature ? (
                              <img
                              src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.approve_signature}`}
                              alt="Signature"
                              className="img-sign"/>
                              ) : (
                                  <div className="img-sign empty-sign"></div>
                              )}
                            <span className="s-by">Signature</span>
                          </label>
                        </div>
                      </div>
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
