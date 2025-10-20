import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import "../forms/PurchaseRequest.css";
import "./styles/submitted-request.css";
import "./styles/submitted-revolving-fund.css";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted revolving fund requests" },
  { id: "new-request", label: "New revolving fund request" },
];

const formatDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const normalized = value.replace(" ", "T").replace(/\//g, "-");
    const fallback = new Date(normalized);
    if (Number.isNaN(fallback.getTime())) {
      return value;
    }
    return fallback.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function SubmittedRevolvingFund({ onLogout, currentUserId, showAll = false }) {
  const navigate = useNavigate();
  const storedUser = useMemo(
    () => JSON.parse(sessionStorage.getItem("user") || "{}"),
    [],
  );

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestCode, setSelectedRequestCode] = useState("");
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const cardRef = useRef(null);

  const effectiveUserId = showAll
    ? null
    : currentUserId || storedUser.id || null;
  const effectiveRole = storedUser.role || "";

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (effectiveRole) {
          params.append("role", effectiveRole);
        }
        if (effectiveUserId) {
          params.append("userId", effectiveUserId);
        }

        const res = await fetch(
          `${API_BASE_URL}/api/revolving_fund${
            params.toString() ? `?${params.toString()}` : ""
          }`,
        );

        if (!res.ok) {
          throw new Error("Failed to fetch submitted requests");
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const filtered = effectiveUserId
          ? list.filter(
              (request) =>
                String(request.submitted_by) === String(effectiveUserId),
            )
          : list;

        setRequests(filtered);

        setSelectedRequestCode((prev) => {
          if (prev && filtered.some((request) => request.form_code === prev)) {
            return prev;
          }
          return filtered[0]?.form_code || "";
        });
      } catch (error) {
        console.error("Error fetching revolving fund requests", error);
        setRequests([]);
        setSelectedRequestCode("");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [effectiveRole, effectiveUserId, showAll]);

  useEffect(() => {
    const selected = requests.find(
      (request) => request.form_code === selectedRequestCode,
    );

    if (!selected) {
      setItems([]);
      return;
    }

    setLoadingItems(true);
    setItems(Array.isArray(selected.items) ? selected.items : []);
    setLoadingItems(false);
  }, [selectedRequestCode, requests]);

  const selectedRequest = requests.find(
    (request) => request.form_code === selectedRequestCode,
  );

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") {
      navigate("/forms/revolving-fund");
      return;
    }
  };

  const handleSelectChange = (event) => {
    setSelectedRequestCode(event.target.value);
  };

  const handlePrint = () => {
    if (!cardRef.current) return;

    const printContents = cardRef.current.outerHTML;
    const printWindow = window.open("", "", "width=900,height=650");

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Revolving Fund Request</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: #fff;
              color: #111;
            }
            h1, h2, h3, h4 {
              margin-bottom: 0.75rem;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 1rem;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 0.6rem 0.9rem;
              text-align: left;
            }
            th.text-center, td.text-center {
              text-align: center;
            }
.rf-signature-row {
              margin-top: 1.5rem;
              display: flex;
              justify-content: center;
              align-items: flex-end;
              gap: 3.5rem;
              flex-wrap: wrap;
            }
            .rf-signature-block {
              min-width: 220px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.35rem;
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
              color: #555;
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
            .submitted-request-card {
              border: none;
              box-shadow: none;
              padding: 0;
            }
            .floating-buttons {
              position: fixed;
              bottom: 20px;
              right: 20px;
              display: flex;
              gap: 12px;
              z-index: 9999;
            }
            .action-btn {
              display: inline-flex;
              align-items: center;
              gap: 0.4rem;
              border: none;
              border-radius: 9999px;
              padding: 0.55rem 1rem;
              font-size: 0.95rem;
              font-weight: 600;
              color: #fff;
              background-color: #2563eb;
              cursor: pointer;
              box-shadow: 0 4px 10px rgba(0,0,0,0.14);
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .action-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 14px rgba(0,0,0,0.16);
            }
            .action-btn.pdf-btn {
              background-color: #16a34a;
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
            <button class="action-btn print-btn" onclick="window.print()" title="Print">
              Print
            </button>
            <button class="action-btn pdf-btn" id="downloadPDF" title="Save as PDF">
              Save PDF
            </button>
          </div>
          ${printContents}
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <script>
            async function toBase64Image(img) {
              const response = await fetch(img.src, { mode: "cors" });
              const blob = await response.blob();
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
            }

            document.getElementById("downloadPDF").addEventListener("click", async function () {
              const element = document.body.cloneNode(true);
              const buttons = element.querySelector(".floating-buttons");
              if (buttons) buttons.remove();

              const imgs = element.querySelectorAll("img");
              for (const img of imgs) {
                try {
                  const base64 = await toBase64Image(img);
                  img.src = base64;
                } catch (err) {
                  console.warn("Could not inline image:", img.src);
                }
              }

              const opt = {
                margin: 0.5,
                filename: "Revolving_Fund_Request.pdf",
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
              };

              html2pdf().from(element).set(opt).save();
            });
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleResolvedLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    sessionStorage.removeItem("user");
    navigate("/");
  };

  const renderBody = () => {
    if (loading) {
      return <p>Loading submitted revolving fund requests...</p>;
    }

    if (requests.length === 0) {
      return <p>No submitted requests found.</p>;
    }

    return (
      <>
        <div className="dropdown-section">
          <label htmlFor="rfRequestSelect">Select Reference No: </label>
          <select
            id="rfRequestSelect"
            value={selectedRequestCode}
            onChange={handleSelectChange}
            className="pr-input"
          >
            <option value="" disabled>
              -- Choose Reference Number --
            </option>
            {requests.map((request) => (
              <option key={request.form_code} value={request.form_code}>
                {request.form_code}
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
            <h2>{selectedRequest.form_code}</h2>
            <p>
              Custodian: <i>{selectedRequest.custodian_name || "N/A"}</i>
            </p>
            <p>
              Submitted:{" "}
              <i>
                {formatDate(
                  selectedRequest.submitted_at ||
                    selectedRequest.request_date ||
                    selectedRequest.created_at,
                )}
              </i>
            </p>
            <p>
              Branch: <i>{selectedRequest.branch || "N/A"}</i>
            </p>
            <p>
              Department: <i>{selectedRequest.department || "N/A"}</i>
            </p>

            <div style={{ marginTop: "1.5rem" }}>
              <h3>Expense entries</h3>
              {loadingItems ? (
                <p>Loading items...</p>
              ) : items.length === 0 ? (
                <p>No expense entries recorded.</p>
              ) : (
                <table className="pr-items-table">
                  <thead>
                    <tr>
                      <th>Entry date</th>
                      <th>Voucher no.</th>
                      <th>OR ref.</th>
                      <th className="text-center">Amount</th>
                      <th>Expense category</th>
                      <th>GL account</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDate(item.entry_date)}</td>
                        <td>{item.voucher_no || "N/A"}</td>
                        <td>{item.or_ref_no || "N/A"}</td>
                        <td className="text-center">
                          {pesoFormatter.format(item.amount || 0)}
                        </td>
                        <td>{item.expense_category || "N/A"}</td>
                        <td>{item.gl_account || "N/A"}</td>
                        <td>{item.remarks || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={3}
                        style={{ textAlign: "right", fontWeight: 600 }}
                      >
                        Total
                      </td>
                      <td className="text-center" style={{ fontWeight: 600 }}>
                        {pesoFormatter.format(
                          selectedRequest.total_expenses || 0,
                        )}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            <div className="submitted-request-meta-line" style={{ marginTop: "1rem" }}>
              <span>
                <strong>Petty cash amount:</strong>{" "}
                {pesoFormatter.format(selectedRequest.petty_cash_amount || 0)}
              </span>
            </div>
            <div className="submitted-request-meta-line">
              <span>
                <strong>Cash on hand:</strong>{" "}
                {pesoFormatter.format(selectedRequest.cash_on_hand || 0)}
              </span>
            </div>
            <div className="submitted-request-meta-line">
              <span>
                <strong>Amount for replenishment:</strong>{" "}
                {pesoFormatter.format(selectedRequest.total_expenses || 0)}
              </span>
            </div>
            <div className="approved-content rf-signature-row">
              <div className="rf-signature-block">
                <span className="rf-signature-line">
                  {selectedRequest.custodian_name || ""}
                </span>
                <p>Submitted by</p>
              </div>
              <div className="rf-signature-block">
                {selectedRequest.submitted_signature ? (
                  <img
                    src={`${API_BASE_URL}/${selectedRequest.submitted_signature}`}
                    alt="Submitted signature"
                    className="rf-signature-image"
                  />
                ) : (
                  <span className="rf-signature-line muted">No signature available</span>
                )}
                <p>Signature</p>
              </div>
            </div>

            <div className="approved-content rf-signature-row">
              <div className="rf-signature-block">
                <span className="rf-signature-line">
                  {selectedRequest.approved_by || ""}
                </span>
                <p>Approved by</p>
              </div>
              <div className="rf-signature-block">
                {selectedRequest.approved_signature ? (
                  <img
                    src={`${API_BASE_URL}/${selectedRequest.approved_signature}`}
                    alt="Approved signature"
                    className="rf-signature-image"
                  />
                ) : (
                  <span className="rf-signature-line muted">No signature available</span>
                )}
                <p>Signature</p>
              </div>
            </div>

            <div className="purchase-dept-box rf-signature-row rf-no-border rf-status-row">
              <div className="rf-signature-block">
                <span className="rf-signature-line">
                  {formatDate(selectedRequest.approved_at)}
                </span>
                <p>Date Approved</p>
              </div>
              <div className="rf-signature-block">
                <span className="rf-signature-line">
                  {(selectedRequest.status || "").toUpperCase()}
                </span>
                <p>Status</p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2
            onClick={() => navigate("/forms-list")}
            style={{ cursor: "pointer", color: "#007bff" }}
          >
            Revolving Fund
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
            Review your revolving fund submissions.
          </span>
          <button
            type="button"
            className="pr-sidebar-logout"
            onClick={handleResolvedLogout}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Submitted Revolving Fund Requests</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view details.
            </p>
          </div>

          {selectedRequest && (
            <button type="button" className="print-btn" onClick={handlePrint}>
              Print
            </button>
          )}
        </header>

        <div className="submitted-requests-container">{renderBody()}</div>
      </main>
    </div>
  );
}

export default SubmittedRevolvingFund;

















