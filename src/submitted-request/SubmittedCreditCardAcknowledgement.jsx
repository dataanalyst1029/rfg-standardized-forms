import { useEffect, useMemo, useState } from "react"; // 1. useRef removed
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import "./styles/submitted-request.css";
import "./styles/submitted-payment-request.css";
// Import the new CSS file
import "./styles/submitted-credit-card-ack.css";
import rfgLogo from "../assets/rfg_logo.png";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted Requests" }, // Updated label
  { id: "new-request", label: "New Credit Card Acknowledgment Receipt" },
];

const formatDate = (value) => {
  if (!value) return "";
  if (typeof value === "string" && value.length === 10 && value.includes("-")) {
    const parts = value.split("-");
    if (parts.length === 3) {
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }
  }

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

const displayText = (value, fallback = "-") => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const stringValue = typeof value === "string" ? value.trim() : String(value);
  return stringValue ? stringValue : fallback;
};

function SubmittedCreditCardAcknowledgement({
  onLogout,
  currentUserId,
  showAll = false,
}) {
  const navigate = useNavigate();
  const storedUser = useMemo(
    () => JSON.parse(sessionStorage.getItem("user") || "{}"),
    [],
  );

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCode, setSelectedCode] = useState("");
  // 2. const cardRef = useRef(null); removed

  const effectiveUserId = showAll
    ? null
    : currentUserId || storedUser.id || null;
  const effectiveRole = storedUser.role || "";

  // This useEffect fetches the data
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
          params.append("userId", effectiveUserId); // This is the ID
        }

        const query = params.toString();
        const response = await fetch(
          `${API_BASE_URL}/api/credit_card_acknowledgement_receipt${
            query ? `?${query}` : ""
          }`,
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch submitted credit card acknowledgement receipts.",
          );
        }

        const data = await response.json();
        const list = Array.isArray(data) ? data : [];

        // This filter logic is now correct, comparing employee_id
        const filtered = effectiveUserId
          ? list.filter(
              (request) =>
                String(request.employee_id).toLowerCase() ===
                String(storedUser.employee_id).toLowerCase(),
            )
          : list;

        setRequests(filtered);

        setSelectedCode((prev) => {
          if (prev && filtered.some((request) => request.form_code === prev)) {
            return prev;
          }
          return "";
        });
      } catch (err) {
        console.error("Error fetching credit card acknowledgement receipt", err);
        setError(
          err.message ||
            "Unable to load submitted credit card acknowledgement receipt.",
        );
        setRequests([]);
        setSelectedCode("");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [
    effectiveRole,
    effectiveUserId,
    showAll,
    storedUser.employee_id, // Switched from storedUser.name
  ]);

  const selectedRequest = requests.find(
    (request) => request.form_code === selectedCode,
  );

  const handleSelectChange = (event) => {
    setSelectedCode(event.target.value);
  };

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") {
      navigate("/forms/credit-card-acknowledgement-receipt");
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading submitted credit card acknowledgement receipts…</span>
      </div>
    );
  }

  // 3. The entire 'handlePrint' function (approx. 115 lines) has been removed.

  const renderBody = () => {
    if (error) {
      return <p className="pr-error-message">{error}</p>;
    }

    if (requests.length === 0) {
      return (
        <p>
          No submitted credit card acknowledgement receipts found for your
          account.
        </p>
      );
    }

    return (
      <>
        <div className="dropdown-section" style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="itsRequestSelect">Select Reference No: </label>
          <select
            id="itsRequestSelect"
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

        {selectedRequest ? (
          // 4. 'ref={cardRef}' was removed from the div below
          <div className="cca-record-request">
            <header className="cca-request-header">
              <div className="header-brand">
                <img
                  src={rfgLogo}
                  alt="Ribshack Food Group"
                  className="header-logo"
                />
              </div>

              <div className="header-request-code">
                <i className="request-code">
                  {displayText(selectedRequest.form_code)}
                </i>
              </div>
            </header>

            {/* --- Details Table --- */}
            <table className="cca-details-table">
              <tbody>
                <tr>
                  <th>Name of Cardholder</th>
                  <td>{displayText(selectedRequest.cardholder_name)}</td>
                  <th>Bank/Issuer</th>
                  <td>
                    {displayText(selectedRequest.bank)} /{" "}
                    {displayText(selectedRequest.issuer)}
                  </td>
                </tr>
                <tr>
                  <th>Employee ID</th>
                  <td>{displayText(selectedRequest.employee_id)}</td>
                  <th>Credit Card Number</th>
                  <td>{displayText(selectedRequest.card_number)}</td>
                </tr>
                <tr>
                  <th>Department/Position</th>
                  <td>
                    {displayText(selectedRequest.department)} /{" "}
                    {displayText(selectedRequest.position)}
                  </td>
                  <th>Date Received</th>
                  <td>{formatDate(selectedRequest.date_received)}</td>
                </tr>
              </tbody>
            </table>

            {/* --- Acknowledgement Section --- */}
            <div className="cca-section-header">ACKNOWLEDGEMENT</div>
            <div className="cca-ack-block">
              <p>
                I hereby acknowledge receipt of the above-mentioned credit card
                issued under the name of <strong>Ribshack Food Group</strong>. I
                understand that this credit card is to be used exclusively for
                official and authorized business purposes in accordance with the
                company's policies and guidelines.
              </p>
              <p>I agree to:</p>
              <ol>
                <li>Use the card solely for business-related transactions;</li>
                <li>
                  Submit all required receipts and expense reports in a timely
                  manner;
                </li>
                <li>
                  Ensure the safekeeping and confidentiality of the card and its
                  details;
                </li>
                <li>
                  Immediately report any loss, theft, or suspicious activity
                  involving the card.
                </li>
              </ol>
              <p style={{ marginBottom: 0 }}>
                I understand that any unauthorized or personal use may result in
                disciplinary action, including possible reimbursement of expenses
                and/or cancellation of the card.
              </p>
            </div>

            {/* --- Signature Table --- */}
            <div className="cca-section-header"></div>
            <table className="cca-sig-table">
              <thead>
                <tr>
                  <th></th>
                  <th style={{ textAlign: "center" }}>Name</th>
                  <th style={{ textAlign: "center" }}>Date</th>
                  <th style={{ textAlign: "center" }}>Signature</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Received by</th>
                  <td className="cca-sig-col">
                    {displayText(selectedRequest.received_by_name)}
                  </td>
                  <td className="cca-sig-col">
                    {formatDate(selectedRequest.received_by_date)}
                  </td>
                  <td className="cca-sig-col sig-box">
                    {selectedRequest.received_by_signature ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.received_by_signature}`}
                        alt="Received by signature"
                        className="signature-img"
                      />
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
                <tr>
                  <th>Issued by</th>
                  <td className="cca-sig-col">
                    {displayText(selectedRequest.issued_by_name, "")}
                  </td>
                  <td className="cca-sig-col">
                    {formatDate(selectedRequest.issued_by_date)}
                  </td>
                  <td className="cca-sig-col">
                    {selectedRequest.issued_by_signature ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${selectedRequest.issued_by_signature}`}
                        alt="Issued by signature"
                        className="signature-img"
                      />
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* --- STATUS DISPLAY --- */}
            {/* Added status display block, copied from other forms */}
            {(selectedRequest.status || selectedRequest.declined_reason) && (
              <div
                className={`floating-decline-reason ${selectedRequest.status?.toLowerCase()}`}
              >
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
            {/* --- END STATUS DISPLAY --- */}
          </div>
        ) : (
          // Show nothing if no request is selected
          null
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
            Credit Card Acknowledgement
          </h2>
          <span>Submitted</span>
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
            Review your form submissions.
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
            <h1>Submitted Credit Card Acknowledgement Receipts</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view the request details.
            </p>
          </div>

          {selectedRequest && (
            // 5. Button onClick was changed to window.print()
            <button onClick={() => window.print()} className="print-btn">
              🖨️ Print
            </button>
          )}
        </header>

        <div className="submitted-requests-container">{renderBody()}</div>
      </main>
    </div>
  );
}

export default SubmittedCreditCardAcknowledgement;