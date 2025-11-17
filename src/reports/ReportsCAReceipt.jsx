import { useEffect, useMemo, useState } from "react";
import "../styles/AdminView.css";
import "../styles/RequestPurchase.css";
import "../styles/ReportsAudit.css";
import { API_BASE_URL } from "../config/api.js";

// Pagination options for the table
const PAGE_SIZES = [5, 10, 20];

// ✅ Safer date parser for both MM/DD/YYYY and YYYY-MM-DD
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;

  // Handle MM/DD/YYYY (U.S. format)
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  // Handle YYYY-MM-DD (ISO format)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  // Fallback — native parse attempt
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
};

function ReportsCAReceipt() {
  // ---------------------- STATE DEFINITIONS ----------------------
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRequest, setModalRequest] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const storedId = sessionStorage.getItem("id");
  const [userData, setUserData] = useState({ name: "", signature: "" });
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showConfirmDecline, setShowConfirmDecline] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // ---------------------- DATA FETCHING ----------------------
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ca_receipt`);
      if (!response.ok)
        throw new Error("Failed to fetch cash advance receipt reports");
      const data = await response.json();

      // Sort newest first
      const sortedData = data.sort((a, b) =>
        b.car_request_code.localeCompare(a.car_request_code)
      );
      setRequests(sortedData);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ---------------------- SIDE EFFECTS ----------------------
  useEffect(() => {
    if (!storedId) return;
    fetch(`${API_BASE_URL}/users/${storedId}`)
      .then((res) => res.json())
      .then((data) => setUserData(data))
      .catch((err) => console.error("Error fetching user data:", err));
  }, [storedId]);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!status) return undefined;
    const timeout = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    setPage(1);
  }, [search, rowsPerPage, startDate, endDate]);

  // ---------------------- FILTERING LOGIC ----------------------
  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    let categorizedRequests = requests;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      categorizedRequests = categorizedRequests.filter((req) => {
        const reqDate = parseLocalDate(req.request_date);
        return reqDate && reqDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      categorizedRequests = categorizedRequests.filter((req) => {
        const reqDate = parseLocalDate(req.request_date);
        return reqDate && reqDate <= end;
      });
    }

    const checkDate = (dateStr) => {
      if (!dateStr) return false;

      if (dateStr.toLowerCase().includes(term)) return true;
      
      const dateObj = parseLocalDate(dateStr);
      return dateObj && dateObj.toLocaleDateString('en-US').includes(term);
    }

    if (term) {
      categorizedRequests = categorizedRequests.filter((req) => {
        const topLevelMatch = 
        [
          "car_request_code",
          "request_date",
          "employee_id",
          "name",
          "cash_advance_no",
          "php_amount",
          "received_from",
          "received_by",
        ].some((key) => req[key]?.toString().toLowerCase().includes(term));

        if (topLevelMatch) return true;

        const dateMatch = [
          req.request_date,
        ].some(checkDate);

        if (dateMatch) return true;

        return false;
      });
    }

    return categorizedRequests;
  }, [requests, search, startDate, endDate]);

  // ---------------------- PAGINATION ----------------------
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / rowsPerPage) || 1
  );

  const visibleRequests = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRequests.slice(start, start + rowsPerPage);
  }, [filteredRequests, page, rowsPerPage]);

  // ---------------------- MODAL HANDLERS ----------------------
  const openModal = (request) => {
    setModalRequest(request);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setModalOpen(false);
      setModalRequest(null);
      setShowLoadingModal(false);
      setShowConfirmDecline(false);
    }, 300);
  };

  // ---------------------- RENDER ----------------------
  return (
    <div className="admin-view">
      {/* ---------- Toolbar and Filters ---------- */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Cash Advance Receipt Reports</h2>
          <p>View all cash advance receipt reports in the system.</p>
        </div>

        <div className="admin-toolbar-actions">
          <p>Filter from </p>
          <input
            type="date"
            className="audit-date-filter"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate}
          />
          <span style={{ margin: "0 5px" }}>to</span>
          <input
            type="date"
            className="audit-date-filter"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
          />
          <input
            type="search"
            className="admin-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests"
            style={{ marginLeft: "20px" }}
          />
        </div>
      </div>

      {/* ---------- Status Banner ---------- */}
      {status && (
        <div
          className={`admin-status-banner${
            status.type === "error"
              ? " admin-status-banner--error"
              : status.type === "info"
              ? " admin-status-banner--info"
              : ""
          }`}
        >
          {status.message}
        </div>
      )}

      {/* ---------- Data Table ---------- */}
      <div className="admin-table-wrapper">
        <table className="admin-table purchase-table">
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>Ref. No.</th>
              <th style={{ textAlign: "center" }}>Date Request</th>
              <th style={{ textAlign: "left" }}>Employee ID</th>
              <th style={{ textAlign: "left" }}>Name</th>
              <th style={{ textAlign: "left" }}>Amount</th>
              <th style={{ textAlign: "left" }}>Received From</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  Loading cash advance receipt reports...
                </td>
              </tr>
            ) : visibleRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  {search || startDate || endDate
                    ? "No requests match your search/filter."
                    : "No pending cash advance receipts found."}
                </td>
              </tr>
            ) : (
              visibleRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ textAlign: "center" }}>{req.car_request_code}</td>
                  <td style={{ textAlign: "center" }}>
                    {parseLocalDate(req.request_date)?.toLocaleDateString() ||
                      "—"}
                  </td>
                  <td style={{ textAlign: "left" }}>{req.employee_id}</td>
                  <td style={{ textAlign: "left" }}>{req.name}</td>
                  <td style={{ textAlign: "left" }}>
                    ₱
                    {Number(req.php_amount || 0).toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td style={{ textAlign: "left" }}>{req.received_from}</td>
                   <td style={{ textAlign: "center" }}>{req.status}</td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="admin-primary-btn"
                      onClick={() => openModal(req)}
                      title="View Details"
                    >
                      🔍
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Pagination Controls ---------- */}
      <div className="admin-pagination">
        <span className="admin-pagination-info">
          Showing {visibleRequests.length} of {filteredRequests.length} requests
        </span>

        <div className="admin-pagination-controls">
          <button
            type="button"
            className="admin-pagination-btn"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="admin-pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="admin-pagination-btn"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>

        <label className="admin-pagination-info" htmlFor="rowsPerPage">
          Rows per page
          <select
            id="rowsPerPage"
            className="admin-rows-select"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ---------- Modal for Viewing Request Details ---------- */}
      {modalOpen && modalRequest && (
        <div className={`modal-overlay ${isClosing ? "fade-out" : ""}`}>
          <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal-panel request-modal">
              <button
                className="admin-close-btn"
                onClick={handleCloseModal}
                aria-label="Close"
              >
                ×
              </button>

              <h2>{modalRequest.car_request_code}</h2>
              <p>
                <strong>Date:</strong>{" "}
                <em>
                  {parseLocalDate(
                    modalRequest.request_date
                  )?.toLocaleDateString() || "—"}
                </em>
              </p>

              <div className="employee-info">
                <p>
                  <strong>Employee ID:</strong>{" "}
                  <em>{modalRequest.employee_id}</em>
                </p>
                <p>
                  <strong>Name:</strong> <em>{modalRequest.name}</em>
                </p>
              </div>

              <div className="replenish-amount">
                <p>
                  <strong>Cash Advance No:</strong>{" "}
                  <em>{modalRequest.cash_advance_no}</em>
                </p>

                <p>
                  <strong>Received from:</strong>{" "}
                  <em>{modalRequest.received_from}</em>
                </p>
              </div>

              <div className="pr-items-card">
                <label>
                  <strong>Amount:</strong> <em>₱
                    {Number(modalRequest.php_amount || 0).toLocaleString(
                      "en-PH",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )} / {modalRequest.php_word} Pesos  </em>
                </label>
              </div>

              <form className="request-footer-form">
                <div className="submit-content">
                  <div className="submit-by-content">
                    <div>
                      <label>
                        <span>
                          <input
                            type="text"
                            name="approved_by"
                            value={modalRequest.received_by || ""}
                            readOnly
                          />
                        </span>
                        <p>Received by</p>
                      </label>
                    </div>

                    <div className="approver-signature">
                      <label>
                        <input
                          type="text"
                          name="approve_signature"
                          value={modalRequest.received_signature || ""}
                          className="submit-sign"
                          required
                          readOnly
                        />
                        {modalRequest.received_signature ? (
                          <img
                            src={`${API_BASE_URL}/uploads/signatures/${modalRequest.received_signature}`}
                            alt="Signature"
                            className="signature-img"
                          />
                        ) : (
                          <div className="img-sign empty-sign"></div>
                        )}
                        <p>Signature</p>
                      </label>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsCAReceipt;