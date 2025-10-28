import { useEffect, useMemo, useState } from "react";
import "./styles/AdminView.css";
import "./styles/RequestPurchase.css";
import "./styles/ReportsAudit.css";
import { API_BASE_URL } from "./config/api.js";

// Pagination options for the table
const PAGE_SIZES = [5, 10, 20];

function ReportsRequestPurchase() {
  // ---------------------- STATE DEFINITIONS ----------------------

  // Main dataset of purchase requests
  const [requests, setRequests] = useState([]);

  // Loading spinner control while fetching data
  const [loading, setLoading] = useState(false);

  // Status messages (e.g. network errors or info)
  const [status, setStatus] = useState(null);

  // Search and pagination controls
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal states for viewing request details
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRequest, setModalRequest] = useState(null);

  // Date range filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Approver / user info
  const storedId = sessionStorage.getItem("id");
  const [userData, setUserData] = useState({ name: "", signature: "" });

  // Misc. modal animation / confirmation states
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showConfirmDecline, setShowConfirmDecline] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // ---------------------- DATA FETCHING ----------------------

  // Fetch all purchase requests from backend
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/purchase_request`);
      if (!response.ok) throw new Error("Failed to fetch purchase requests");
      const data = await response.json();

      // Sort newest first based on request code
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

  // Fetch approver (current user) details for footer signature
  useEffect(() => {
    if (!storedId) return;
    fetch(`${API_BASE_URL}/users/${storedId}`)
      .then((res) => res.json())
      .then((data) => setUserData(data))
      .catch((err) => console.error("Error fetching user data:", err));
  }, [storedId]);

  // Fetch purchase requests when component mounts
  useEffect(() => {
    fetchRequests();
  }, []);

  // Automatically clear status message after a few seconds
  useEffect(() => {
    if (!status) return undefined;
    const timeout = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timeout);
  }, [status]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setPage(1);
  }, [search, rowsPerPage, startDate, endDate]);

  // ---------------------- FILTERING LOGIC ----------------------

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    // Step 1: Keep only requests with "pending" status
    let categorizedRequests = requests/*.filter(
      (req) => req.status?.toLowerCase() === "pending"
    )*/;

    // Step 2: Apply start date filter (inclusive)
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      categorizedRequests = categorizedRequests.filter(
        (req) => new Date(req.request_date) >= start
      );
    }

    // Step 3: Apply end date filter (inclusive)
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      categorizedRequests = categorizedRequests.filter(
        (req) => new Date(req.request_date) <= end
      );
    }

    // Step 4: Apply text search filter (matches multiple fields)
    if (term) {
      categorizedRequests = categorizedRequests.filter((req) =>
        [
          "purchase_request_code",
          "request_by",
          "branch",
          "department",
          "purpose",
          "status",
        ].some((key) =>
          req[key]?.toString().toLowerCase().includes(term)
        )
      );
    }

    return categorizedRequests;
  }, [requests, search, startDate, endDate]);

  // ---------------------- PAGINATION ----------------------

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / rowsPerPage) || 1
  );

  // Slice the filtered results for current page view
  const visibleRequests = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRequests.slice(start, start + rowsPerPage);
  }, [filteredRequests, page, rowsPerPage]);

  // ---------------------- MODAL HANDLERS ----------------------

  // Open modal and store selected request
  const openModal = (request) => {
    setModalRequest(request);
    setModalOpen(true);
  };

  // Animate and close modal (with fade-out)
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
    <div className="audit-view">
      {/* ---------- Toolbar and Filters ---------- */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Purchase Requests Records</h2>
          <p>View all purchase requests in the system.</p>
        </div>

        <div className="admin-toolbar-actions">
          {/* Date range filter inputs */}
          <p>Filter from </p>
          <input
            type="date"
            className="audit-date-filter"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ margin: "0 5px" }}>to</span>
          <input
            type="date"
            className="audit-date-filter"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          {/* Text search input */}
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

      {/* ---------- Status banner for errors/info ---------- */}
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
      <div className="audit-table-wrapper">
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
            {/* Loading or empty states */}
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
              // Map visible requests into table rows
              visibleRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ textAlign: "center" }}>
                    {req.purchase_request_code}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {new Date(req.request_date).toLocaleDateString()}
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

        {/* Rows-per-page selector */}
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
              {/* Close button */}
              <button
                className="admin-close-btn"
                onClick={handleCloseModal}
                aria-label="Close"
              >
                ×
              </button>

              {/* Request details */}
              <h2>{modalRequest.purchase_request_code}</h2>
              <p>
                <strong>Requested by:</strong>{" "}
                <em>{modalRequest.request_by}</em>
              </p>
              <p>
                <strong>Date:</strong>{" "}
                <em>
                  {new Date(modalRequest.request_date).toLocaleDateString()}
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

              {/* Requested items table */}
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

              {/* Footer section for approver info */}
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
