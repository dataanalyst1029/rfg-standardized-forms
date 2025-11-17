import { useEffect, useMemo, useState } from "react";
import "../styles/AdminView.css";
import "../styles/RequestPurchase.css";
import "../styles/ReportsAudit.css";
import { API_BASE_URL } from "../config/api.js";

// Pagination options for the table
const PAGE_SIZES = [5, 10, 20];

// ✅ Enhanced date parser (handles MM/DD/YYYY, YYYY-MM-DD, and DD/MM/YYYY)
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;

  // U.S. format: MM/DD/YYYY
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  // ISO format: YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  // European format: DD/MM/YYYY (optional support)
  const euMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  // Fallback — native Date parse
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
};

function ReportsRequestPurchase() {
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
      const response = await fetch(`${API_BASE_URL}/api/purchase_request`);
      if (!response.ok) throw new Error("Failed to fetch purchase requests");
      const data = await response.json();

      // Sort newest first
      const sortedData = data.sort((a, b) =>
        b.purchase_request_code.localeCompare(a.purchase_request_code)
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

    // ✅ Start date filter (inclusive)
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      categorizedRequests = categorizedRequests.filter((req) => {
        const reqDate = parseLocalDate(req.request_date);
        return reqDate && reqDate >= start;
      });
    }

    // ✅ End date filter (inclusive)
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

    // ✅ Text search
    if (term) {
      categorizedRequests = categorizedRequests.filter((req) => {
        const topLevelMatch =
        [
          "purchase_request_code",
          "request_by",
          "branch",
          "department",
          "purpose",
          "status",
        ].some((key) => req[key]?.toString().toLowerCase().includes(term));

        if(topLevelMatch) return true;

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
          <h2>Purchase Request Reports</h2>
          <p>View all purchase request reports in the system.</p>
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
              <th style={{ textAlign: "center" }}>Request Date</th>
              <th style={{ textAlign: "left" }}>Requested By</th>
              <th style={{ textAlign: "left" }}>Branch</th>
              <th style={{ textAlign: "left" }}>Department</th>
              <th style={{ textAlign: "left" }}>Purpose</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  Loading purchase requests reports...
                </td>
              </tr>
            ) : visibleRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  {search || startDate || endDate
                    ? "No requests match your search/filter."
                    : "No pending purchase requests found."}
                </td>
              </tr>
            ) : (
              visibleRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ textAlign: "center" }}>
                    {req.purchase_request_code}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {parseLocalDate(req.request_date)?.toLocaleDateString() ||
                      "Invalid date"}
                  </td>
                  <td style={{ textAlign: "left" }}>{req.request_by}</td>
                  <td style={{ textAlign: "left" }}>{req.branch}</td>
                  <td style={{ textAlign: "left" }}>{req.department}</td>
                  <td style={{ textAlign: "left" }}>{req.purpose}</td>
                  <td style={{ textAlign: "center" }}>
                    {req.status.toUpperCase()}
                  </td>
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

              <h2>{modalRequest.purchase_request_code}</h2>
              <p>
                <strong>Requested by:</strong>{" "}
                <em>{modalRequest.request_by}</em>
              </p>
              <p>
                <strong>Date:</strong>{" "}
                <em>
                  {parseLocalDate(modalRequest.request_date)?.toLocaleDateString() ||
                    "Invalid date"}
                </em>
              </p>
              <p>
                <strong>Branch:</strong> <em>{modalRequest.branch}</em>
              </p>
              <p>
                <strong>Department:</strong>{" "}
                <em>{modalRequest.department}</em>
              </p>
              <p>
                <strong>Purpose:</strong> <em>{modalRequest.purpose}</em>
              </p>

              <h3>Requested Items</h3>
              {Array.isArray(modalRequest.items) &&
              modalRequest.items.length > 0 ? (
                <table className="request-items-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th style={{ textAlign: "center" }}>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalRequest.items.map(
                      (item) =>
                        item && (
                          <tr key={item.id}>
                            <td>{item.purchase_item}</td>
                            <td style={{ textAlign: "center" }}>
                              {item.quantity}
                            </td>
                          </tr>
                        )
                    )}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: "#888", fontStyle: "italic" }}>
                  No items listed.
                </p>
              )}

              <form
                className="request-footer-form"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="approver-content">
                  <div>
                    <label>
                      <input
                        type="text"
                        name="approved_by"
                        value={userData.name || ""}
                        readOnly
                      />
                      <span>Approved by:</span>
                    </label>
                  </div>

                  <div className="approver-signature">
                    <label>
                      {userData.signature ? (
                        <img
                          src={`${API_BASE_URL}/uploads/signatures/${userData.signature}`}
                          alt="Signature"
                          className="signature-img"
                        />
                      ) : (
                        <p>No signature available</p>
                      )}
                      <input
                        type="text"
                        name="approved_signature"
                        value={userData.signature || ""}
                        required
                        readOnly
                      />
                      <span>Signature:</span>
                    </label>
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

export default ReportsRequestPurchase;
