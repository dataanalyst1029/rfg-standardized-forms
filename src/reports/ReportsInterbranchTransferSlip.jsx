import { useEffect, useMemo, useState } from "react";
import "../styles/AdminView.css";
import "../styles/RequestPurchase.css";
import "../styles/ReportsAudit.css";
import { API_BASE_URL } from "../config/api.js";

// Pagination options for the table
const PAGE_SIZES = [5, 10, 20];

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

function ReportsInterbranchTransferSlip() {
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
  const [isClosing, setIsClosing] = useState(false);

  // ---------------------- DATA FETCHING ----------------------
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/interbranch_transfer_slip`);
      if (!response.ok) throw new Error("Failed to fetch interbranch transfer slips");
      const data = await response.json();

      // Sort newest first
      const sortedData = data.sort((a, b) =>
        b.form_code.localeCompare(a.form_code)
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
        const reqDate = parseLocalDate(req.prepared_date);
        return reqDate && reqDate >= start;
      });
    }

    // ✅ End date filter (inclusive)
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      categorizedRequests = categorizedRequests.filter((req) => {
        const reqDate = parseLocalDate(req.prepared_date);
        return reqDate && reqDate <= end;
      });
    }
    
    const checkDate = (dateStr) => {
      if (!dateStr) return false;
      // 1. Check raw string
      if (dateStr.toLowerCase().includes(term)) return true;
      // 2. Check formatted string
      const dateObj = parseLocalDate(dateStr);
      return dateObj && dateObj.toLocaleDateString('en-US').includes(term);
    }

    // ✅ Text search
    if (term) {
      categorizedRequests = categorizedRequests.filter((req) => {
        const topLevelMatch =
        [
          "form_code",
          "prepared_date",
          "prepared_by",
          "from_branch",
          "to_branch",
          "from_address",
          "to_address",
          "item_code",
          "status",
        ].some((key) => req[key]?.toString().toLowerCase().includes(term));

        if (topLevelMatch) return true;

        const dateMatch = [
          req.prepared_date,
          req.date_transferred,
          req.date_received
        ].some(checkDate); // <-- This is much simpler now

        if (dateMatch) return true;

        // 2. Check nested item details
        const itemMatch = (req.items || []).some(item =>
          item.item_code?.toLowerCase().includes(term) ||
          item.item_description?.toLowerCase().includes(term)
          // You could also add qty, unit_measure, etc. here
        );

        if (itemMatch) return true;

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
    }, 300);
  };

  // ---------------------- RENDER ----------------------
  return (
    <div className="admin-view">
      {/* ---------- Toolbar and Filters ---------- */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Interbranch Transfer Slip</h2>
          <p>View all interbranch transfer slips in the system.</p>
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
              <th style={{ textAlign: "center" }}>Date Request</th>
              <th style={{ textAlign: "center" }}>Prepared By</th>
              <th style={{ textAlign: "center" }}>From Branch</th>
              <th style={{ textAlign: "center" }}>To Branch</th>
              <th style={{ textAlign: "center" }}>Item Code</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  Loading interbranch transfer slips...
                </td>
              </tr>
            ) : visibleRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  {search || startDate || endDate
                    ? "No requests match your search/filter."
                    : "No interbranch transfer slips found."}
                </td>
              </tr>
            ) : (
              visibleRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ textAlign: "center" }}>{req.form_code}</td>
                  <td style={{ textAlign: "center" }}>
                    {new Date(req.prepared_date).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: "left" }}>{req.prepared_by}</td>
                  <td style={{ textAlign: "left" }}>{req.from_branch}</td>
                  <td style={{ textAlign: "left" }}>{req.to_branch}</td>
                  <td style={{ textAlign: "center" }}>
                    {(req.items || []).map(item => (
                      <div key={item.id}>{item.item_code || 'N/A'}</div>
                    ))}
                  </td>
                  <td style={{ textAlign: "Center" }}>{req.status}</td>
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
            <div className="admin-modal-panel request-modals">
              <button
                className="admin-close-btn"
                onClick={handleCloseModal}
                aria-label="Close"
              >
                ×
              </button>

              <h2>{modalRequest.form_code}</h2>
              <p>
                <strong>Date:</strong>{" "}
                <em>
                  {new Date(modalRequest.prepared_date).toLocaleDateString()}
                </em>
              </p>

              <section className="pr-form-section" id="details">
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label>Date Transferred</label>
                    <input
                      type="text"
                      className="pr-input"
                      value={new Date(modalRequest.date_transferred).toLocaleDateString()}
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                    <label>Date Received</label>
                    <input
                      type="text"
                      className="pr-input"
                      value={new Date(modalRequest.date_received).toLocaleDateString()}
                      readOnly
                    />
                  </div>
                </div>
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label>From Branch</label>
                    <textarea
                      className="cabr-textarea"
                      value={`${(modalRequest.from_branch.trim()).toString()}\n\n${modalRequest.from_address.trim()}`}
                      rows={5}
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                    <label>To Branch</label>
                    <textarea
                      className="cabr-textarea"
                      value={`${modalRequest.to_branch.trim()}\n\n${modalRequest.to_address.trim()}`}
                      rows={5}
                      readOnly
                    />
                  </div>
                </div>
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label>Area Operations Controller</label>
                    <input
                      type="text"
                      className="pr-input"
                      value={modalRequest.from_area_ops_controller}
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                    <label>Area Operations Controller</label>
                    <input
                      type="text"
                      className="pr-input"
                      value={modalRequest.to_area_ops_controller}
                      readOnly
                    />
                  </div>
                </div>  
              </section>

              <section className="pr-form-section" id="details">
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label>Bank</label>
                    <input
                      type="text"
                      className="pr-input"
                      value={modalRequest.bank}
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                    <label>Issuer</label>
                    <input
                      type="text"
                      className="pr-input"
                      value={modalRequest.issuer}
                      readOnly
                    />
                  </div>
                </div>

                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label>Card Number</label>
                    <input
                      type="text"
                      className="pr-input"
                      value={modalRequest.card_number}
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                    <label>Date Received</label>
                    <input
                      type="text"
                      className="pr-input"
                      value={new Date(modalRequest.date_received).toLocaleDateString()}
                      readOnly
                    />
                  </div>
                </div>
              </section>

              <div className="submit-content">
                <div className="submit-by-content">
                  <div>
                    <span>{modalRequest.received_by_name}</span>
                    <p>Received by</p>
                  </div>

                  <div className="signature-content">
                    <input
                      className="submit-sign"
                      type="text"
                      value={modalRequest.received_by_signature}
                      readOnly
                    />
                    {modalRequest.received_by_signature ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${modalRequest.received_by_signature}`}
                        alt="Signature"
                        className="ca-signature-image"
                      />
                    ) : (
                      <div className="img-sign empty-sign"></div>
                    )}
                    <p>Signature</p>
                  </div>
                </div>
              </div>

              <div className="submit-content">
                <div className="submit-by-content">
                  <div>
                    <label>
                      <span>
                        <input
                          type="text"
                          name="approved_by"
                          value={modalRequest.issued_by_name || ""}
                          readOnly
                        />
                      </span>
                      <p>Issued by</p>
                    </label>
                  </div>

                  <div className="approver-signature">
                    <label>
                      <input
                        type="text"
                        name="approve_signature"
                        value={modalRequest.issued_by_signature || ""}
                        className="submit-sign"
                        readOnly
                      />
                      {modalRequest.issued_by_signature ? (
                        <img
                          src={`${API_BASE_URL}/uploads/signatures/${modalRequest.issued_by_signature}`}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsInterbranchTransferSlip;
