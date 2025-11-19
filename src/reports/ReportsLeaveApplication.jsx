import { useEffect, useMemo, useState } from "react";
import "../styles/AdminView.css";
import "../styles/RequestPurchase.css";
import "../styles/ReportsAudit.css";
import "../styles/RequestRevolvingFund.css";
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

function ReportsLeaveApplication() {
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
      const response = await fetch(`${API_BASE_URL}/api/leave_requests`);
      if (!response.ok) throw new Error("Failed to fetch leave applications");
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
        const reqDate = parseLocalDate(req.received_by_date);
        return reqDate && reqDate >= start;
      });
    }

    // ✅ End date filter (inclusive)
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      categorizedRequests = categorizedRequests.filter((req) => {
        const reqDate = parseLocalDate(req.received_by_date);
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
      const normalizedTerm = term.replace(/[^0-9.]/g, "");
      categorizedRequests = categorizedRequests.filter((req) => {
        const topLevelMatch = 
        [
          "form_code",
          "received_by_date",
          "cal_no",
          "employee_id",
          "name",
          "branch",
          "department",
          "status",
        ].some((key) => req[key]?.toString().toLowerCase().includes(term))||
        (req.total_rb_amount && 
          req.total_rb_amount.toString().replace(/[^0-9.]/g, "") === normalizedTerm
        )

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
    }, 300);
  };

  // ---------------------- RENDER ----------------------
  return (
    <div className="admin-view">
      {/* ---------- Toolbar and Filters ---------- */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>HR Leave Application Request</h2>
          <p>View all leave application requests in the system.</p>
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
              <th style={{ textAlign: "center" }}>Employee ID</th>
              <th style={{ textAlign: "center" }}>Cardholder Name</th>
              <th style={{ textAlign: "center" }}>Department</th>
              <th style={{ textAlign: "center" }}>Leave Type</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  Loading leave application requests...
                </td>
              </tr>
            ) : visibleRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  {search || startDate || endDate
                    ? "No requests match your search/filter."
                    : "No leave application requests found."}
                </td>
              </tr>
            ) : (
              visibleRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ textAlign: "center" }}>{req.form_code}</td>
                  <td style={{ textAlign: "center" }}>
                    {new Date(req.request_date).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: "center" }}>{req.employee_id}</td>
                  <td style={{ textAlign: "left" }}>{req.requester_name}</td>
                  <td style={{ textAlign: "center" }}>{req.department}</td>
                  <td style={{ textAlign: "left" }}>{req.leave_type}</td>
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

      {/* ---------- Modal for Viewing Request Details (UPDATED) ---------- */}
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

              <h2>Leave Application Form - {modalRequest.form_code}</h2>

              <section className="pr-form-section" id="details">
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label" htmlFor="employeeID">
                      Date:
                    </label>
                    <input
                      value={new Date(modalRequest.request_date).toLocaleDateString()}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                </div>

                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label" htmlFor="employeeID">
                      Employee ID
                    </label>
                    <input
                      value={modalRequest.employee_id}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                    <label className="pr-label" htmlFor="employeeID">
                      Name
                    </label>
                    <input
                      value={modalRequest.requester_name}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                </div>

                 <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label" htmlFor="employeeID">
                      Branch
                    </label>
                    <input
                      value={modalRequest.branch}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                    <label className="pr-label" htmlFor="employeeID">
                      Department - Position
                    </label>
                    <input
                      value={`${modalRequest.department} - ${modalRequest.position}`}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                </div>
              </section>
              
              {/* ----- 2. Leave Details Block (UPDATED TO TABLE) ----- */}
              <div className="pr-items-card">
                <h2 
                  className="pr-section-title pr-section-title--modal" 
                >
                  Leave Details
                </h2>
                <table className="request-items-table" style={{ border: 'none', width: '100%' }}>
                  <tbody>
                    <tr>
                      <th>Leave Type</th>
                      <td>{modalRequest.leave_type}</td>
                      <th>Date Filed</th>
                      <td>
                        {modalRequest.request_date ? new Date(modalRequest.request_date).toLocaleDateString() : "--:--:--"}
                      </td>
                    </tr>
                    <tr>
                      <th>Leave Dates</th>
                      <td>
                        {`${new Date(modalRequest.leave_start)?.toLocaleDateString()} - ${new Date(modalRequest.leave_end)?.toLocaleDateString()}`}
                      </td>
                      <th>Date Received</th>
                      <td>
                        {modalRequest.received_at ? new Date(modalRequest.received_at).toLocaleDateString() : "--:--:--"}
                      </td>
                    </tr>
                    <tr>
                      <th>Available Days</th>
                      <td colSpan="3">
                        {/* Cleaner display for available days */}
                        <p>
                          <strong>Vacation:</strong> {modalRequest.available_vacation || 'N/A'}
                        </p>
                        <p>
                          <strong>Sick:</strong> {modalRequest.available_sick || 'N/A'}
                        </p>
                        <p>
                          <strong>Emergency:</strong> {modalRequest.available_emergency || 'N/A'}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>


              {/* ----- 3. "Submitted by" Signature Block ----- */}
              <div className="submit-content">
                <div className="submit-by-content">
                  <div>
                    <span>{modalRequest.requester_name}</span>
                    <p>Submitted by</p>
                  </div>

                  <div className="signature-content">
                    <input
                      className="submit-sign"
                      type="text"
                      value={modalRequest.signature}
                      readOnly
                    />
                    {modalRequest.signature ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${modalRequest.signature}`}
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


              {/* ----- 4. "Endorsed by" Signature Block (Styled like Approver) ----- */}
              <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                <div className="submit-content">
                  <div className="submit-by-content"> 
                    <div>
                      <label>
                        <span>
                          <input
                            type="text"
                            name="endorsed_by"
                            value={modalRequest.endorsed_by || ""}
                            className="approver" // Added class
                            readOnly
                          />
                        </span>
                        <p>Endorsed by</p>
                      </label>
                    </div>
                    
                    <div className="approver-signature">
                      <label>
                        <span>
                          <input
                            className="submit-sign approver"
                            type="text"
                            value={modalRequest.endorsed_signature || ""}
                            readOnly
                          />
                        </span>
                        {modalRequest.endorsed_signature ? (
                          <img
                            src={`${API_BASE_URL}/uploads/signatures/${modalRequest.endorsed_signature}`}
                            alt="Signature"
                            className="signature-image" // Standardized class
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

              {/* ----- 5. "Approved by" Signature Block (Styled like Approver) ----- */}
              <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                <div className="submit-content">
                  <div className="submit-by-content"> 
                    <div>
                      <label>
                        <span>
                          <input
                            type="text"
                            name="approved_by"
                            value={modalRequest.approved_by || ""}
                            className="approver" 
                            readOnly
                          />
                        </span>
                        <p>Approved by(HR)</p>
                      </label>
                    </div>
                    
                    <div className="approver-signature">
                      <label>
                        <span>
                          <input
                            className="submit-sign approver"
                            type="text"
                            value={modalRequest.approved_signature || ""}
                            readOnly
                          />
                        </span>
                        {modalRequest.approved_signature ? (
                          <img
                            src={`${API_BASE_URL}/uploads/signatures/${modalRequest.approved_signature}`}
                            alt="Signature"
                            className="signature-image" // Standardized class
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

export default ReportsLeaveApplication;