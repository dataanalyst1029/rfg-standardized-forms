import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api.js";
import "../forms/PurchaseRequest.css";
import "./styles/submitted-request.css";

const toTitleCase = (value = "") =>
  value
    .toString()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

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

const formatDateRange = (start, end) => {
  if (!start && !end) {
    return "—";
  }
  if (start && !end) {
    return `${formatDate(start)} onwards`;
  }
  if (!start && end) {
    return `Until ${formatDate(end)}`;
  }
  return `${formatDate(start)} → ${formatDate(end)}`;
};

const FORM_CONFIG = {
  "cash-advance-request": {
    title: "Cash Advance Requests",
    endpoint: "/api/cash_advance",
    newPath: "/forms/cash-advance-request",
    mapRow: (row) => ({
      reference: row.form_code,
      status: row.status,
      submittedAt: row.submitted_at || row.created_at,
      details: [
        { label: "Total amount", value: formatCurrency(row.total_amount) },
        { label: "Nature of activity", value: row.nature_of_activity || "—" },
      ],
    }),
  },
  "revolving-fund": {
    title: "Revolving Fund Requests",
    endpoint: "/api/revolving_fund",
    newPath: "/forms/revolving-fund",
    mapRow: (row) => ({
      reference: row.form_code,
      status: row.status,
      submittedAt: row.submitted_at || row.created_at,
      details: [
        { label: "Petty cash amount", value: formatCurrency(row.petty_cash_amount) },
        { label: "Total expenses", value: formatCurrency(row.total_expenses) },
        { label: "Cash on hand", value: formatCurrency(row.cash_on_hand) },
      ],
    }),
  },
  "payment-request-form": {
    title: "Payment Requests",
    endpoint: "/api/payment_request",
    newPath: "/forms/payment-request-form",
    mapRow: (row) => ({
      reference: row.form_code,
      status: row.status,
      submittedAt: row.submitted_at || row.created_at,
      details: [
        { label: "Vendor", value: row.vendor_name || "—" },
        { label: "Total amount", value: formatCurrency(row.total_amount) },
        { label: "Purpose", value: row.purpose || "—" },
      ],
    }),
  },
  "maintenance-or-repair": {
    title: "Maintenance / Repair Requests",
    endpoint: "/api/maintenance_repair",
    newPath: "/forms/maintenance-or-repair",
    mapRow: (row) => ({
      reference: row.form_code,
      status: row.status,
      submittedAt: row.submitted_at || row.created_at,
      details: [
        { label: "Work description", value: row.work_description || "—" },
        { label: "Performed by", value: row.performed_by || "—" },
        { label: "Date needed", value: formatDate(row.date_needed) },
      ],
    }),
  },
  "hr-overtime-approval": {
    title: "Overtime Requests",
    endpoint: "/api/overtime_request",
    newPath: "/forms/hr-overtime-approval",
    mapRow: (row) => ({
      reference: row.form_code,
      status: row.status,
      submittedAt: row.submitted_at || row.created_at,
      details: [
        { label: "Cut-off period", value: formatDateRange(row.cutoff_start, row.cutoff_end) },
        { label: "Total hours", value: `${Number(row.total_hours || 0).toFixed(2)} hrs` },
      ],
    }),
  },
  "hr-leave-application": {
    title: "Leave Applications",
    endpoint: "/api/leave_request",
    newPath: "/forms/hr-leave-application",
    mapRow: (row) => ({
      reference: row.form_code,
      status: row.status,
      submittedAt: row.submitted_at || row.created_at,
      details: [
        { label: "Leave type", value: row.leave_type || "—" },
        { label: "Schedule", value: formatDateRange(row.leave_start, row.leave_end) },
        { label: "Remarks", value: row.purpose || "—" },
      ],
    }),
  },
};

function SubmittedRequests({ formSlug }) {
  const config = FORM_CONFIG[formSlug];
  const navigate = useNavigate();
  const storedUser = useMemo(
    () => JSON.parse(sessionStorage.getItem("user") || "{}"),
    [],
  );

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("submitted");

  useEffect(() => {
    if (!config) {
      return;
    }

    const fetchRequests = async () => {
      if (!storedUser || !storedUser.id) {
        setLoading(false);
        setError("You need to be signed in to view submitted requests.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (storedUser.role) {
          params.set("role", storedUser.role);
        }
        if (storedUser.id) {
          params.set("userId", storedUser.id);
        }

        const response = await fetch(
          `${API_BASE_URL}${config.endpoint}?${params.toString()}`,
        );
        if (!response.ok) {
          throw new Error("Failed to load submitted requests");
        }
        const data = await response.json();
        const mapped = Array.isArray(data) ? data.map(config.mapRow) : [];
        setRequests(mapped);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load submitted requests.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [config, formSlug, storedUser]);

  if (!config) {
    return (
      <div className="submitted-requests-container">
        <h2>Submitted Requests</h2>
        <p>This form does not yet support submitted request listings.</p>
        <button type="button" className="print-btn" onClick={() => navigate("/forms-list")}>
          Back to forms
        </button>
      </div>
    );
  }

  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      setActiveSection("submitted");
      const list = document.getElementById("submitted-list");
      if (list) {
        list.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    if (sectionId === "new") {
      navigate(config.newPath);
      return;
    }

    setActiveSection(sectionId);
  };

  const handlePrint = () => window.print();
  const handleBackToForms = () => navigate("/forms-list");

  return (
    <div className="pr-layout submitted-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2 onClick={handleBackToForms} style={{ cursor: "pointer", color: "#007bff" }}>
            {config.title}
          </h2>
          <span>Submitted requests</span>
        </div>
        <nav className="pr-sidebar-nav">
          {[
            { id: "submitted", label: "Submitted requests" },
            { id: "new", label: "Start new request" },
          ].map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? "is-active" : ""}
              onClick={() => handleNavigate(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>
        <div className="pr-sidebar-footer">
          <span className="pr-sidebar-meta">
            Need to fill out a new form? Use the links above to resume filing.
          </span>
          <button type="button" className="pr-sidebar-logout" onClick={handleBackToForms}>
            Forms library
          </button>
        </div>
      </aside>
      <main className="pr-main submitted-main">
        <header className="pr-topbar submitted-topbar">
          <div>
            <h1 className="topbar-title" style={{ marginBottom: "0.35rem" }}>
              {config.title}
            </h1>
            <p className="pr-topbar-meta">
              Review your previous submissions and print a copy for your records.
            </p>
          </div>
          <div className="submitted-actions">
            <button
              type="button"
              className="print-btn"
              onClick={() => handleNavigate("new")}
              style={{ backgroundColor: "#3ecf8e" }}
            >
              New request
            </button>
            <button type="button" className="print-btn" onClick={handlePrint}>
              Print list
            </button>
          </div>
        </header>

        <div className="submitted-content" id="submitted-list">
          {loading ? (
            <p>Loading submitted requests…</p>
          ) : error ? (
            <p style={{ color: "var(--color-danger, #d14343)" }}>{error}</p>
          ) : requests.length === 0 ? (
            <p>No submitted requests yet.</p>
          ) : (
            <div className="submitted-requests-list">
              {requests.map((request) => (
                <div key={request.reference} className="submitted-request-card">
                  <div className="submitted-request-card__header">
                    <strong>{request.reference}</strong>
                    <span className="submitted-request-status">
                      {toTitleCase(request.status)}
                    </span>
                  </div>
                  <div className="submitted-request-meta">
                    Submitted {formatDate(request.submittedAt)}
                  </div>
                  {Array.isArray(request.details) && request.details.length > 0 && (
                    <ul className="submitted-request-details">
                      {request.details
                        .filter((detail) => detail && detail.value && detail.value !== "—")
                        .map((detail) => (
                          <li key={`${request.reference}-${detail.label}`}>
                            <strong>{detail.label}:</strong> {detail.value}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default SubmittedRequests;
