import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import "./styles/submitted-request.css";

const NAV_SECTIONS = [
  { id: "submitted", label: "Submitted cash advance requests" },
  { id: "new-request", label: "New cash advance request" },
];

const formatDate = (value) => {
  if (!value) return "—";
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

const formatCurrency = (value) => {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return "—";
  }
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(number);
};

function SubmittedCashAdvance() {
  const navigate = useNavigate();
  const storedUser = useMemo(
    () => JSON.parse(sessionStorage.getItem("user") || "{}"),
    [],
  );

  const [requests, setRequests] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!storedUser?.id) {
        setLoading(false);
        setError("Sign in to view your cash advance submissions.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          role: storedUser.role || "",
          userId: storedUser.id,
        });

        const response = await fetch(
          `${API_BASE_URL}/api/cash_advance?${params.toString()}`,
        );
        if (!response.ok) {
          throw new Error("Failed to load cash advance requests.");
        }
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        setRequests(list);
        if (list.length && !selectedCode) {
          setSelectedCode(list[0].form_code);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load cash advance requests.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [storedUser, selectedCode]);

  const selectedRequest = requests.find((item) => item.form_code === selectedCode);

  const handleNavigate = (sectionId) => {
    if (sectionId === "new-request") {
      navigate("/forms/cash-advance-request");
    }
  };

  const handlePrint = () => {
    if (!selectedRequest) return;
    const printWindow = window.open("", "", "width=900,height=650");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Cash Advance Request</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2, h3, h4 { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th.text-center, td.text-center { text-align: center; }
          </style>
        </head>
        <body>
          ${document.getElementById("submitted-ca-card")?.innerHTML ?? ""}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const totalAmount = selectedRequest?.items?.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  ) || 0;

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
          <span>Submitted requests</span>
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
            Review and print your previous cash advance requests.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={() => navigate("/forms-list")}>
            Forms library
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1 className="topbar-title">Submitted Cash Advance Requests</h1>
            <p className="pr-topbar-meta">
              Select a reference number to view the submitted details.
            </p>
          </div>
          {selectedRequest && (
            <button type="button" className="print-btn" onClick={handlePrint}>
              Print
            </button>
          )}
        </header>

        {loading ? (
          <p>Loading submitted cash advance requests…</p>
        ) : error ? (
          <p style={{ color: "var(--color-danger, #d14343)" }}>{error}</p>
        ) : requests.length === 0 ? (
          <p>No submitted cash advance requests found.</p>
        ) : (
          <div className="submitted-requests-container">
            <div className="dropdown-section">
              <label htmlFor="caRequestSelect">Select Reference No: </label>
              <select
                id="caRequestSelect"
                value={selectedCode}
                onChange={(event) => setSelectedCode(event.target.value)}
              >
                <option value="">-- Choose Reference Number --</option>
                {requests.map((request) => (
                  <option key={request.form_code} value={request.form_code}>
                    {request.form_code}
                  </option>
                ))}
              </select>
            </div>

            {selectedRequest && (
              <div className="submitted-request-card" id="submitted-ca-card">
                <h2 style={{ marginTop: 0 }}>{selectedRequest.form_code}</h2>
                <p>
                  <strong>Custodian:</strong> {selectedRequest.custodian_name || "—"}
                </p>
                <p>
                  <strong>Date filed:</strong>{" "}
                  {selectedRequest.submitted_at
                    ? formatDate(selectedRequest.submitted_at)
                    : selectedRequest.request_date
                    ? formatDate(selectedRequest.request_date)
                    : formatDate(selectedRequest.created_at)}
                </p>
                <p>
                  <strong>Branch:</strong> {selectedRequest.branch || "—"} |{" "}
                  <strong>Department:</strong> {selectedRequest.department || "—"}
                </p>
                <p>
                  <strong>Nature of activity:</strong> {selectedRequest.nature_of_activity || "—"}
                </p>
                <p>
                  <strong>Inclusive dates:</strong> {selectedRequest.inclusive_dates || "—"}
                </p>
                <p>
                  <strong>Purpose:</strong> {selectedRequest.purpose || "—"}
                </p>

                <h3 style={{ marginTop: "1.5rem" }}>Requested amounts</h3>
                <table className="pr-items-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="text-center">Amount</th>
                      <th>Expense category</th>
                      <th>Store / branch</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRequest.items || []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.description || "—"}</td>
                        <td className="text-center">{formatCurrency(item.amount)}</td>
                        <td>{item.expense_category || "—"}</td>
                        <td>{item.store_branch || "—"}</td>
                        <td>{item.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>TOTAL</td>
                      <td className="text-center" style={{ fontWeight: 600 }}>
                        {formatCurrency(totalAmount)}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>

                <div className="submitted-request-meta-line" style={{ marginTop: "1rem" }}>
                  <span>
                    <strong>Total amount requested:</strong> {formatCurrency(totalAmount)}
                  </span>
                  <span>
                    <strong>Status:</strong>{" "}
                    {selectedRequest.status ? selectedRequest.status.toUpperCase() : "—"}
                  </span>
                </div>
                <div className="submitted-request-meta-line">
                  <span>
                    <strong>Approved by:</strong>{" "}
                    {selectedRequest.approved_by ? `User #${selectedRequest.approved_by}` : "Awaiting approval"}
                  </span>
                  <span>
                    <strong>Released by:</strong>{" "}
                    {selectedRequest.released_by ? `User #${selectedRequest.released_by}` : "Pending release"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default SubmittedCashAdvance;
