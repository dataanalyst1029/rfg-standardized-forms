import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import "./styles/submitted-request.css";
import "./styles/submitted-payment-request.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted payment requests" },
  { id: "new-request", label: "New payment request" },
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

function SubmittedPaymentRequest({ onLogout, currentUserId, showAll = false }) {
  const navigate = useNavigate();
  const storedUser = useMemo(
    () => JSON.parse(sessionStorage.getItem("user") || "{}"),
    [],
  );

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCode, setSelectedCode] = useState("");
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
          `${API_BASE_URL}/api/payment_request${query ? `?${query}` : ""}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch submitted payment requests.");
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
        setSelectedCode((prev) => {
          if (prev && filtered.some((request) => request.form_code === prev)) {
            return prev;
          }
          return filtered[0]?.form_code || "";
        });
      } catch (err) {
        console.error("Error fetching payment requests", err);
        setError(err.message || "Unable to load submitted payment requests.");
        setRequests([]);
        setSelectedCode("");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [effectiveRole, effectiveUserId, showAll]);

  useEffect(() => {
    const selected = requests.find(
      (request) => request.form_code === selectedCode,
    );

    if (!selected) {
      setItems([]);
      return;
    }

    setLoadingItems(true);
    setItems(Array.isArray(selected.items) ? selected.items : []);
    setLoadingItems(false);
  }, [selectedCode, requests]);

  const selectedRequest = requests.find(
    (request) => request.form_code === selectedCode,
  );

  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );
  const displayedTotal =
    totalAmount || Number(selectedRequest?.total_amount || 0);
  const hasItems = items.length > 0;
  const displayItems = hasItems
    ? items
    : Array.from({ length: 6 }, (_, index) => ({
        id: `placeholder-${index}`,
        __placeholder: true,
      }));

  const approvedByValue = displayText(
    selectedRequest?.approved_by,
    "Awaiting approval",
  );
  const receivedByValue = displayText(
    selectedRequest?.received_by || selectedRequest?.released_by,
    "Pending acknowledgement",
  );

  const handleSelectChange = (event) => {
    setSelectedCode(event.target.value);
  };

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") {
      navigate("/forms/payment-request-form");
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

  const handlePrint = () => {
    if (!cardRef.current) {
      return;
    }

    const printContents = cardRef.current.outerHTML;
    const printWindow = window.open("", "", "width=900,height=650");

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Payment Request</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #fff;
              color: #111;
              font-size: 0.9rem;
              margin: 0;
              padding: 1in 0.75in 0.75in;
            }
            .pay-print-card {
              background: #fff;
              border: 1px solid #111;
              border-radius: 0;
              padding: 1rem 1.1rem;
              margin: 0 auto;
              max-width: 7.05in;
              color: #111;
              display: flex;
              flex-direction: column;
              gap: 1.05rem;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .pay-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 1.3rem;
              border-bottom: 2px solid #111;
              padding-bottom: 0.55rem;
            }
            .pay-logo {
              max-width: 140px;
              height: auto;
            }
            .pay-header-meta {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 0.35rem;
              text-transform: uppercase;
            }
            .pay-header-title {
              margin: 0;
              font-size: 1rem;
              letter-spacing: 0.08em;
            }
            .pay-form-code {
              border: 1px solid #111;
              border-radius: 999px;
              padding: 0.28rem 0.75rem;
              font-weight: 600;
              font-size: 0.82rem;
              letter-spacing: 0.05em;
            }
            .pay-meta-date-row {
              display: grid;
              grid-template-columns: 120px 1fr;
              border: 1px solid #111;
              font-size: 0.9rem;
            }
            .pay-meta-date-row span {
              padding: 0.45rem 0.65rem;
              border-right: 1px solid #111;
            }
            .pay-meta-date-row span:last-child {
              border-right: none;
            }
            .pay-meta-table,
            .pay-purpose-section,
            .pay-items-table,
            .pay-signature-table,
            .pay-accounting-table {
              width: 100%;
              border: 1px solid #111;
              border-collapse: collapse;
              font-size: 0.88rem;
            }
            .pay-meta-table th,
            .pay-meta-table td,
            .pay-purpose-section span,
            .pay-items-table th,
            .pay-items-table td,
            .pay-signature-table th,
            .pay-signature-table td,
            .pay-accounting-table th,
            .pay-accounting-table td {
              border: 1px solid #111;
              padding: 0.8rem 0.7rem;
              text-align: left;
            }
            .pay-meta-table th {
              width: 22%;
              font-weight: 600;
              background: #f7f7f7;
            }
            .pay-purpose-section {
              display: grid;
              grid-template-columns: 120px 1fr;
              font-size: 0.9rem;
            }
            .pay-purpose-section span {
              border-right: 1px solid #111;
            }
            .pay-purpose-section span:last-child {
              border-right: none;
            }
            .pay-items-table th {
              text-transform: uppercase;
              font-size: 0.82rem;
              letter-spacing: 0.04em;
              background: #e5e5e5;
            }
            .pay-items-table .text-center {
              text-align: center;
            }
            .pay-items-total-row td {
              font-weight: 600;
              background: #111;
              color: #fff;
            }
            .pay-footnote {
              font-size: 0.78rem;
              font-style: italic;
              margin: 0;
            }
            .pay-signature-table td {
              min-height: 3.4rem;
              vertical-align: bottom;
            }
            .pay-signature-table th:nth-child(3),
            .pay-signature-table td:nth-child(3) {
              width: 18%;
            }
            .pay-signature-table th:nth-child(4),
            .pay-signature-table td:nth-child(4) {
              width: 30%;
            }
            .pay-signature-placeholder {
              display: inline-block;
              width: 100%;
              min-height: 2.6rem;
              border-bottom: 1px solid currentColor;
              text-align: center;
              font-weight: 600;
            }
            .pay-accounting-table th,
            .pay-accounting-table td {
              padding: 0.5rem 0.65rem;
            }
            .pay-accounting-card {
              border: 1px solid #d0d0d0;
              border-radius: 0;
              background: #ffffff;
              overflow: hidden;
              break-inside: avoid;
            }
            .pay-accounting-header {
              background: #111;
              color: #fff;
              padding: 0.55rem 0.75rem;
              font-weight: 600;
              text-align: center;
              text-transform: uppercase;
              font-size: 0.83rem;
              letter-spacing: 0.04em;
            }
            .pay-accounting-table th {
              width: 20%;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
  };

  const renderBody = () => {
    if (loading) {
      return <p>Loading submitted payment requests...</p>;
    }

    if (error) {
      return <p className="pr-error-message">{error}</p>;
    }

    if (requests.length === 0) {
      return <p>No submitted payment requests found.</p>;
    }

    return (
      <>
        <div className="dropdown-section">
          <label htmlFor="paymentRequestSelect">Select Reference No: </label>
          <select
            id="paymentRequestSelect"
            value={selectedCode}
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
          <div className="pay-print-card" ref={cardRef}>
            <header className="pay-header">
              <div className="pay-header-brand">
                <img src={rfgLogo} alt="Ribshack Food Group" className="pay-logo" />
              </div>
              <div className="pay-header-meta">
                <h1 className="pay-header-title">Request for Payment Form</h1>
                <span className="pay-form-code">{selectedRequest.form_code}</span>
              </div>
            </header>

            <div className="pay-meta-date-row">
              <span>Date</span>
              <span>
                {formatDate(
                  selectedRequest.request_date ||
                    selectedRequest.submitted_at ||
                    selectedRequest.created_at,
                )}
              </span>
            </div>

            <table className="pay-meta-table">
              <tbody>
                <tr>
                  <th>Name</th>
                  <td>{displayText(selectedRequest.requester_name)}</td>
                  <th>Vendor/Supplier (Payee&apos;s Name)</th>
                  <td>{displayText(selectedRequest.vendor_name)}</td>
                </tr>
                <tr>
                  <th>Department</th>
                  <td>{displayText(selectedRequest.department)}</td>
                  <th>PR Number (if applicable)</th>
                  <td>{displayText(selectedRequest.pr_number)}</td>
                </tr>
                <tr>
                  <th>Employee ID</th>
                  <td>{displayText(selectedRequest.employee_id)}</td>
                  <th>Date Needed</th>
                  <td>{formatDate(selectedRequest.date_needed)}</td>
                </tr>
              </tbody>
            </table>

            <div className="pay-purpose-section">
              <span>Purpose</span>
              <span>{displayText(selectedRequest.purpose, "No purpose provided.")}</span>
            </div>

            {loadingItems ? (
              <p>Loading items...</p>
            ) : (
              <table className="pay-items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-center">Qty</th>
                    <th className="text-center">Unit Price</th>
                    <th className="text-center">Amount</th>
                    <th>Expense Charges</th>
                    <th>Location (Store/Branch)</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item) => {
                    const isPlaceholder = Boolean(item.__placeholder);
                    const amountValue = isPlaceholder
                      ? ""
                      : formatAmount(
                          item.amount ||
                            Number(item.quantity || 0) * Number(item.unit_price || 0),
                        );
                    return (
                    <tr
                      key={
                        item.id ||
                        `${item.description || "item"}-${item.amount || "0"}`
                      }
                    >
                      <td>
                        {isPlaceholder
                          ? "\u00a0"
                          : displayText(item.description, "N/A")}
                      </td>
                      <td className="text-center">
                        {isPlaceholder
                          ? "\u00a0"
                          : displayText(item.quantity, "0")}
                      </td>
                      <td className="text-center">
                        {isPlaceholder ? "\u00a0" : formatAmount(item.unit_price)}
                      </td>
                      <td className="text-center">{amountValue || "\u00a0"}</td>
                      <td>
                        {isPlaceholder
                          ? "\u00a0"
                          : displayText(item.budget_code, "N/A")}
                      </td>
                      <td>
                        {isPlaceholder
                          ? "\u00a0"
                          : displayText(item.location || selectedRequest.branch, "N/A")}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="pay-items-total-row">
                    <td colSpan={3}>Total</td>
                    <td className="text-center">
                      {Number(displayedTotal || 0).toFixed(2)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}

            <p className="pay-footnote">
              *** Attach detailed breakdown and/or supporting documents.
            </p>

            <table className="pay-signature-table">
              <tbody>
                <tr>
                  <th>Requested by</th>
                  <td>{displayText(selectedRequest.requester_name)}</td>
                  <th>Signature</th>
                  <td>
                    <span className="pay-signature-placeholder" />
                  </td>
                </tr>
                <tr>
                  <th>Approved by</th>
                  <td>{approvedByValue}</td>
                  <th>Signature</th>
                  <td>
                    <span className="pay-signature-placeholder" />
                  </td>
                </tr>
                <tr>
                  <th>Received by</th>
                  <td>{receivedByValue}</td>
                  <th>Signature</th>
                  <td>
                    <span className="pay-signature-placeholder" />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="pay-accounting-card">
              <div className="pay-accounting-header">Accounting Department Use Only</div>
              <table className="pay-accounting-table">
                <tbody>
                  <tr>
                    <th>GL Code</th>
                    <td>{displayText(selectedRequest.accounting_gl_code, "")}</td>
                    <th>OR Number</th>
                    <td>{displayText(selectedRequest.accounting_or_number, "")}</td>
                  </tr>
                  <tr>
                    <th>Amount</th>
                    <td>
                      {displayText(
                        selectedRequest.accounting_amount
                          ? formatAmount(selectedRequest.accounting_amount)
                          : "",
                        "",
                      )}
                    </td>
                    <th>Check Number</th>
                    <td>{displayText(selectedRequest.accounting_check_number, "")}</td>
                  </tr>
                </tbody>
              </table>
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
            Review your payment request submissions.
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
            <h1>Submitted Payment Requests</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view the request details.
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

export default SubmittedPaymentRequest;
