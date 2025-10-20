import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import "../forms/PurchaseRequest.css";
import "./styles/submitted-request.css";
import "./styles/submitted-cash-advance.css";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted cash advance requests" },
  { id: "new-request", label: "New cash advance request" },
];

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const normalized = String(value).replace(" ", "T").replace(/\//g, "-");
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

const displayText = (value, fallback = "-") => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const stringValue = typeof value === "string" ? value.trim() : String(value);
  return stringValue ? stringValue : fallback;
};

const formatAmount = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return pesoFormatter.format(0);
  }
  return pesoFormatter.format(numeric);
};

function SubmittedCashAdvance({ onLogout, currentUserId, showAll = false }) {
  const navigate = useNavigate();
  const storedUser = useMemo(
    () => JSON.parse(sessionStorage.getItem("user") || "{}"),
    [],
  );

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      setError(null);

      try {
        const params = new URLSearchParams();
        if (effectiveRole) {
          params.append("role", effectiveRole);
        }
        if (effectiveUserId) {
          params.append("userId", effectiveUserId);
        }

        const query = params.toString();
        const response = await fetch(
          `${API_BASE_URL}/api/cash_advance${query ? `?${query}` : ""}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch submitted cash advance requests.");
        }

        const data = await response.json();
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
      } catch (err) {
        console.error("Error fetching cash advance requests", err);
        setError(
          err.message || "Unable to load submitted cash advance requests.",
        );
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

  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );
  const totalRequested =
    totalAmount || Number(selectedRequest?.total_amount || 0);

  const releaseMethod = (selectedRequest?.release_method || "").toLowerCase();
  const releaseMethodCheck =
    releaseMethod.includes("check") || releaseMethod.includes("cheque");
  const releaseMethodPCV =
    releaseMethod.includes("voucher") ||
    releaseMethod.includes("pcv") ||
    releaseMethod.includes("petty");

  const submittedSignature =
    selectedRequest?.submitted_signature ||
    selectedRequest?.custodian_signature ||
    "";
  const approvedSignature = selectedRequest?.approved_signature || "";
  const releasedSignature = selectedRequest?.released_signature || "";

  const approvedByValue =
    selectedRequest?.approved_by_name ||
    (selectedRequest?.approved_by
      ? `User #${selectedRequest.approved_by}`
      : "Awaiting approval");
  const releasedByValue =
    selectedRequest?.released_by_name ||
    (selectedRequest?.released_by
      ? `User #${selectedRequest.released_by}`
      : "Pending release");

  const handleSelectChange = (event) => {
    setSelectedRequestCode(event.target.value);
  };

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") {
      navigate("/forms/cash-advance-request");
    }
  };

  const handleResolvedLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    sessionStorage.removeItem("user");
    navigate("/");
  };

  const renderSignatureLine = (id, label, value) => (
    <div className="ca-signature-block" key={id}>
      <span className="ca-signature-line">{displayText(value)}</span>
      <p>{label}</p>
    </div>
  );

  const renderSignatureImage = (id, label, signature) => (
    <div className="ca-signature-block" key={id}>
      {signature ? (
        <img
          src={`${API_BASE_URL}/${signature}`}
          alt={`${label} signature`}
          className="ca-signature-image"
        />
      ) : (
        <span className="ca-signature-line muted">No signature available</span>
      )}
      <p>{label}</p>
    </div>
  );

  const handlePrint = () => {
    if (!cardRef.current) {
      return;
    }

    const printContents = cardRef.current.outerHTML;
    const printWindow = window.open("", "", "width=900,height=650");

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Cash Advance Request</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 18px;
              background: #fff;
              color: #111;
              font-size: 0.80rem;
            }
            h1, h2, h3, h4 {
              margin-bottom: 0.5rem;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: .7rem;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 0.6rem 0.9rem;
              text-align: left;
            }
            th.text-center, td.text-center {
              text-align: center;
            }
            .submitted-request-card {
              border: none;
              box-shadow: none;
              padding: 0;
            }
            .submitted-request-meta-line {
              display: flex;
              flex-wrap: wrap;
              gap: 1.5rem;
              margin-top: 0.65rem;
              font-size: 0.95rem;
            }
            .submitted-request-meta-line strong {
              font-weight: 600;
            }
            .submitted-request-section {
              margin-top: 1.25rem;
            }
            .submitted-request-section p {
              margin: 0.4rem 0 0;
              line-height: 1.5;
            }
            .ca-summary-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
              gap: 0.6rem 1.5rem;
              margin-top: 0.75rem;
            }
            .ca-summary-grid p {
              margin: 0;
            }
            .ca-signature-grid {
              margin-top: .5rem;
              display: grid;
              gap: 1.5rem 2.5rem;
              grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
            }
            .ca-signature-block {
              min-width: 220px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.35rem;
            }
            .ca-signature-line {
              display: inline-block;
              min-width: 200px;
              text-align: center;
              padding-bottom: 0.2rem;
              border-bottom: 1px solid currentColor;
              font-weight: 600;
            }
            .ca-signature-line.muted {
              font-style: italic;
              color: #555;
            }
            .ca-signature-image {
              max-width: 160px;
              height: auto;
              object-fit: contain;
            }
            .ca-accounting-card {
              margin: 1.75rem auto 0;
              border: 1px solid #d0d0d0;
              border-radius: 12px;
              background: #ffffff;
              overflow: hidden;
              box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
              max-width: 720px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .ca-accounting-header {
              background: #111;
              color: #fff;
              padding: 0.75rem 1rem;
              font-weight: 600;
              text-align: center;
              text-transform: uppercase;
              font-size: 0.95rem;
            }
            .ca-accounting-body {
              padding: 1rem 1.25rem;
              display: grid;
              gap: 0.85rem 1.75rem;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              font-size: 0.95rem;
              color: #111;
            }
            .ca-accounting-section {
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
            }
            .ca-accounting-subtitle {
              font-weight: 600;
              margin: 0;
            }
            .ca-accounting-line {
              display: flex;
              align-items: center;
              gap: 0.6rem;
              justify-content: space-between;
            }
            .ca-accounting-line span:first-child {
              font-weight: 500;
            }
            .ca-accounting-checkbox {
              display: inline-flex;
              align-items: center;
              gap: 0.45rem;
              font-weight: 500;
            }
            .ca-accounting-checkbox mark {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 1.15rem;
              height: 1.15rem;
              border: 1px solid #999;
              border-radius: 0.2rem;
              background: transparent;
              font-size: 0.85rem;
            }
            .ca-accounting-input-display {
              min-width: 170px;
              border-bottom: 1px solid #ccc;
              padding: 0.25rem 0;
              font-weight: 500;
              display: inline-flex;
              justify-content: flex-start;
              flex: 1;
            }
            @media print {
              body {
                margin: 0;
                padding: 0.6in;
                font-size: 0.9rem;
              }
              .submitted-request-card {
                max-width: 7.1in;
                margin: 0 auto;
              }
              .submitted-request-section {
                margin-top: 1.05rem;
              }
              .ca-signature-grid {
                margin-top: 1.1rem;
                gap: 1rem 1.5rem;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              }
              .ca-accounting-card {
                margin: 1.25rem auto 0;
                max-width: 7.1in;
              }
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
                filename: "Cash_Advance_Request.pdf",
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
  };

  const renderBody = () => {
    if (loading) {
      return <p>Loading submitted cash advance requests...</p>;
    }

    if (error) {
      return <p className="pr-error-message">{error}</p>;
    }

    if (requests.length === 0) {
      return <p>No submitted requests found.</p>;
    }

    const signatureSlots = selectedRequest
      ? [
          {
            id: "requested-by",
            label: "Requested by",
            type: "text",
            value: selectedRequest.custodian_name,
          },
          {
            id: "requested-signature",
            label: "Signature",
            type: "signature",
            signature: submittedSignature,
          },
          {
            id: "approved-by",
            label: "Approved by",
            type: "text",
            value: approvedByValue,
          },
          {
            id: "approved-signature",
            label: "Signature",
            type: "signature",
            signature: approvedSignature,
          },
          {
            id: "received-by",
            label: "Received by",
            type: "text",
            value: releasedByValue,
          },
          {
            id: "released-signature",
            label: "Signature",
            type: "signature",
            signature: releasedSignature,
          },
          {
            id: "date-released",
            label: "Date released",
            type: "text",
            value: formatDate(selectedRequest.released_at),
          },
          {
            id: "status",
            label: "Status",
            type: "text",
            value: (selectedRequest.status || "draft").toUpperCase(),
          },
        ]
      : [];

    return (
      <>
        <div className="dropdown-section">
          <label htmlFor="caRequestSelect">Select Reference No: </label>
          <select
            id="caRequestSelect"
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
              Custodian: <i>{displayText(selectedRequest.custodian_name)}</i>
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
              Branch: <i>{displayText(selectedRequest.branch)}</i>
            </p>
            <p>
              Department: <i>{displayText(selectedRequest.department)}</i>
            </p>

            <div className="submitted-request-meta-line">
              <span>
                <strong>Employee ID:</strong>{" "}
                {displayText(selectedRequest.employee_id)}
              </span>
            </div>

            <div className="submitted-request-meta-line">
              <span>
                <strong>Nature of activity:</strong>{" "}
                {displayText(selectedRequest.nature_of_activity)}
              </span>
              <span>
                <strong>Inclusive dates:</strong>{" "}
                {displayText(selectedRequest.inclusive_dates)}
              </span>
            </div>

            <div className="submitted-request-meta-line">
              <span>
                <strong>Release method:</strong>{" "}
                {displayText(selectedRequest.release_method)}
              </span>
              <span>
                <strong>Total requested:</strong> {formatAmount(totalRequested)}
              </span>
            </div>

            <div className="submitted-request-section">
              <h3>Purpose of cash advance</h3>
              <p>
                {displayText(
                  selectedRequest.purpose,
                  "No purpose provided.",
                )}
              </p>
            </div>

            <div className="submitted-request-section">
              <h3>Cash advance items</h3>
              {loadingItems ? (
                <p>Loading items...</p>
              ) : items.length === 0 ? (
                <p>No cash advance items recorded.</p>
              ) : (
                <table className="pr-items-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="text-center">Amount</th>
                      <th>Budget account</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={
                          item.id ||
                          `${item.description || "item"}-${item.amount || "0"}`
                        }
                      >
                        <td>{displayText(item.description, "N/A")}</td>
                        <td className="text-center">
                          {formatAmount(item.amount)}
                        </td>
                        <td>
                          {displayText(
                            item.budget_account || item.expense_category,
                            "N/A",
                          )}
                        </td>
                        <td>{displayText(item.remarks, "N/A")}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        style={{ textAlign: "right", fontWeight: 600 }}
                      >
                        Total
                      </td>
                      <td
                        className="text-center"
                        style={{ fontWeight: 600 }}
                      >
                        {formatAmount(totalRequested)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            <div className="ca-signature-grid">
              {signatureSlots.map((slot) =>
                slot.type === "signature"
                  ? renderSignatureImage(slot.id, slot.label, slot.signature)
                  : renderSignatureLine(slot.id, slot.label, slot.value),
              )}
            </div>

            <div className="ca-accounting-card">
              <div className="ca-accounting-header">
                Accounting Department Use Only
              </div>
              <div className="ca-accounting-body">
                <div className="ca-accounting-section">
                  <p className="ca-accounting-subtitle">Released through</p>
                  <span className="ca-accounting-checkbox">
                    <mark>{releaseMethodCheck ? "✔" : ""}</mark>
                    <span>Check**</span>
                  </span>
                  <span className="ca-accounting-checkbox">
                    <mark>{releaseMethodPCV ? "✔" : ""}</mark>
                    <span>Petty Cash Voucher</span>
                  </span>
                </div>
                <div className="ca-accounting-section">
                  <p className="ca-accounting-subtitle">**If check issuance:</p>
                  <div className="ca-accounting-line">
                    <span>Check No.</span>
                    <span className="ca-accounting-input-display">
                      {displayText(selectedRequest.check_number, "")}
                    </span>
                  </div>
                  <div className="ca-accounting-line">
                    <span>Bank G/L Code</span>
                    <span className="ca-accounting-input-display">
                      {displayText(selectedRequest.bank_gl_code, "")}
                    </span>
                  </div>
                </div>
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
            Cash Advance
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
            Review your cash advance submissions.
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
            <h1>Submitted Cash Advance Requests</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view details.
            </p>
          </div>

          {selectedRequest && (
            <button
              type="button"
              className="print-btn"
              onClick={handlePrint}
            >
              Print
            </button>
          )}
        </header>

        <div className="submitted-requests-container">{renderBody()}</div>
      </main>
    </div>
  );
}

export default SubmittedCashAdvance;
