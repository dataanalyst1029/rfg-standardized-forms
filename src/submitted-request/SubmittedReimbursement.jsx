import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import "./styles/submitted-reimburse.css";


const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted Reimbursement" },
  { id: "new-request", label: "New Reimbursement" },
];

function SubmittedReimbursement({ onLogout, currentUserId, showAll = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestCode, setSelectedRequestCode] = useState("");
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
        const res = await fetch(`${API_BASE_URL}/api/reimbursement`);
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

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") navigate("/forms/reimbursement-form");
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
          <title>Print Reimbursement</title>
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

            .approved-content {
              margin-top: 3rem;
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
                filename: 'Reimbursement.pdf',
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
    (req) => req.rb_request_code === selectedRequestCode
  );

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading submitted reimbursement…</span>
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
            Reimbursement
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
            Review your submitted reimbursement.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Submitted Reimbursement</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view details.
            </p>
          </div>

          {selectedRequest && (
            <button onClick={handlePrint} className="print-btn">
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
                  <option value="" disabled>
                    -- Choose Reference Number --
                  </option>
                  {requests.map((req) => (
                    <option key={req.rb_request_code} value={req.rb_request_code}>
                      {req.rb_request_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequest && (
                <div
                  className="submitted-request-card"
                  ref={cardRef}
                  style={{ marginTop: "1rem" }}
                >

                    {/* <div className="rb-reference-card">
                        <span className="rb-reference-value">
                            <strong>{selectedRequest.rb_request_code}</strong>
                        </span>
                        <span>
                            <strong>{formatDate(selectedRequest.request_date)}</strong>
                        </span>
                        <p hidden>ID: {selectedRequest.id}</p>
                    </div> */}

                    <section className="pr-form-section" id="details">
                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Reference No.</label>
                                <input value={selectedRequest.rb_request_code} className="pr-input" readOnly />
                            </div>
                            <div className="pr-field">
                                <label>Date Request</label>
                                <input value={formatDate(selectedRequest.request_date)} className="pr-input" readOnly />
                            </div>
                        </div>
                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Cash Advance Liquidation No.</label>
                                <input value={selectedRequest.cal_no} className="pr-input" readOnly />
                            </div>
                            <div className="pr-field">
                                <label>Cash Advance No.</label>
                                <input value={selectedRequest.ca_no} className="pr-input" readOnly />
                            </div>
                        </div>
                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Employee ID</label>
                                <input value={selectedRequest.employee_id} className="pr-input" readOnly />
                            </div>
                            <div className="pr-field">
                                <label>Name</label>
                                <input value={selectedRequest.name} className="pr-input" readOnly />
                            </div>
                        </div>
                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>Branch</label>
                                <input value={selectedRequest.branch} className="pr-input" readOnly />
                            </div>
                            <div className="pr-field">
                                <label>Department</label>
                                <input value={selectedRequest.department} className="pr-input" readOnly />
                            </div>
                        </div>
                    </section>

                    <section className="pr-form-section" id="details">
                        <div className="pr-grid-two">
                            <div className="pr-field">
                                <label>BPI Account No.</label>
                                <input value={selectedRequest.bpi_acc_no} className="pr-input" readOnly />
                            </div>
                            <div className="pr-field">
                                <label>Total Reimbursable Amount</label>
                                <input value={selectedRequest.total_rb_amount} className="pr-input" readOnly />
                            </div>
                        </div>
                    </section>

                    <section className="pr-form-section" id="details">
                        <div className="signature-section">
                            <div className="signature-format">
                                <div className="submitter-signature">
                                <label htmlFor="submitted-by">
                                    <span className="s-name">{selectedRequest.requested_by}</span>
                                    <span className="s-by">Request by</span>
                                </label>
                                </div>
                                <div className="submitter-signature">
                                <label htmlFor="submitted-signature">
                                    <span className="sub-sign">{selectedRequest.request_signature}</span>
                                    {selectedRequest.request_signature ? (
                                    <img
                                    src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.request_signature}`}
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
                    </section>
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
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default SubmittedReimbursement;
