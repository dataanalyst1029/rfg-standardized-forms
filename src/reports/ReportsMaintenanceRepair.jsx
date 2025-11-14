import { useEffect, useMemo, useState } from "react";
import "../styles/RequestPayment.css";
import "../styles/AdminView.css"; // Added for modal consistency
import { API_BASE_URL } from "../config/api.js";

const PAGE_SIZES = [5, 10, 20];

// ✅ FIXED Date Parser
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;

  // Handle YYYY-MM-DD (ISO format from date inputs)
  // This MUST come first to avoid UTC conversion issues
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  // Handle MM/DD/YYYY (U.S. format)
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  // Fallback – for full timestamps (e.g., from the database)
  // Extract just the date part if it's a full ISO timestamp
  const timestampMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/);
  if (timestampMatch) {
    const [, year, month, day] = timestampMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  // Last resort fallback
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
};

function ReportsMaintenanceRepair() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [modalRequest, setModalRequest] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/maintenance_requests`);
      if (!response.ok)
        throw new Error("Failed to fetch maintenance requests");
      const data = await response.json();

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

  const storedId = sessionStorage.getItem("id");
  const [userData, setUserData] = useState({ name: "", signature: "" });

  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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
      // Use parseLocalDate to ensure YYYY-MM-DD is treated as LOCAL
      const start = parseLocalDate(startDate);
      if (start) {
        start.setHours(0, 0, 0, 0);
        categorizedRequests = categorizedRequests.filter((req) => {
          const reqDate = parseLocalDate(req.request_date);
          return reqDate && reqDate >= start;
        });
      }
    }

    // ✅ End date filter (inclusive)
    if (endDate) {
      // Use parseLocalDate to ensure YYYY-MM-DD is treated as LOCAL
      const end = parseLocalDate(endDate);
      if (end) {
        end.setHours(23, 59, 59, 999);
        categorizedRequests = categorizedRequests.filter((req) => {
          const reqDate = parseLocalDate(req.request_date);
          return reqDate && reqDate <= end;
        });
      }
    }

    if (term) {
      categorizedRequests = categorizedRequests.filter((req) =>
        [
          "form_code",
          "request_date",
          "employee_id",
          "requester_name",
          "branch",
          "department",
          "date_needed",
          "status",
          "work_description",
          "asset_tag",
        ].some((key) => req[key]?.toString().toLowerCase().includes(term))
      );
    }

    return categorizedRequests;
  }, [requests, search, startDate, endDate]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / rowsPerPage) || 1
  );

  const visibleRequests = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRequests.slice(start, start + rowsPerPage);
  }, [filteredRequests, page, rowsPerPage]);

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
    }, 300);
  };

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Maintenance/Repair Requests</h2>
          <p>View and manage all maintenance requests in the system.</p>
        </div>

        <div className="admin-toolbar-actions">
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

      <div className="admin-table-wrapper">
        <table className="admin-table purchase-table">
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>Ref. No.</th>
              <th style={{ textAlign: "center" }}>Date Request</th>
              <th style={{ textAlign: "center" }}>Employee ID</th>
              <th style={{ textAlign: "left" }}>Name</th>
              <th style={{ textAlign: "left" }}>Branch</th>
              <th style={{ textAlign: "left" }}>Department</th>
              <th style={{ textAlign: "center" }}>Date Needed</th>
              {/* <th style={{ textAlign: "center" }}>Status</th> */}
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  Loading maintenance/repair requests...
                </td>
              </tr>
            ) : visibleRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  {search || startDate || endDate
                    ? "No requests match your search/filter."
                    : "No maintenance/repair requests found."}
                </td>
              </tr>
            ) : (
              visibleRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ textAlign: "center" }}>{req.form_code}</td>
                  <td style={{ textAlign: "center" }}>
                    {parseLocalDate(req.request_date)?.toLocaleDateString() ||
                      "—"}
                  </td>
                  <td style={{ textAlign: "center" }}>{req.employee_id}</td>
                  <td style={{ textAlign: "left" }}>{req.requester_name}</td>
                  <td style={{ textAlign: "left" }}>{req.branch}</td>
                  <td style={{ textAlign: "left" }}>{req.department}</td>
                  <td style={{ textAlign: "center" }}>
                    {parseLocalDate(req.date_needed)?.toLocaleDateString() ||
                      "—"}
                  </td>
                  {/* <td style={{ textAlign: "center" }}>
                    {req.status ? req.status.toUpperCase() : "PENDING"}
                  </td> */}
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="admin-primary-btn"
                      onClick={() => openModal(req)}
                      title="View Details"
                    >
                      📋
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

      {/* ---------- ✅ FIXED MODAL ---------- */}
      {modalOpen && modalRequest && (
        <div className={`modal-overlay ${isClosing ? "fade-out" : ""}`}>
          <div
            className="admin-modal-backdrop"
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal-panel request-modal">
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
                  {parseLocalDate(
                    modalRequest.request_date
                  )?.toLocaleDateString() || "—"}
                </em>
              </p>

              <div className="employee-info">
                <p>
                  <strong>Requester:</strong>{" "}
                  <em>{modalRequest.requester_name}</em>
                </p>
                <p>
                  <strong>Employee ID:</strong>{" "}
                  <em>{modalRequest.employee_id}</em>
                </p>
                <p>
                  <strong>Branch:</strong> <em>{modalRequest.branch}</em>
                </p>
                <p>
                  <strong>Department:</strong> <em>{modalRequest.department}</em>
                </p>
              </div>

              <hr className="modal-divider" />

              <div className="pr-items-card" style={{ border: "none" }}>
                <div className="employee-info">
                  <p>
                    <strong>Asset Tag:</strong> <em>{modalRequest.asset_tag}</em>
                  </p>
                  <p>
                    <strong>Date Needed:</strong>{" "}
                    <em>
                      {parseLocalDate(
                        modalRequest.date_needed
                      )?.toLocaleDateString() || "—"}
                    </em>
                  </p>
                </div>
                <label>
                  <strong>Work Description:</strong>
                </label>
                <textarea
                  value={modalRequest.work_description}
                  className="cabr-textarea"
                  rows={5}
                  readOnly
                />

                {(modalRequest.performed_by ||
                  modalRequest.date_completed ||
                  modalRequest.completion_remarks) && (
                  <>
                    <hr className="modal-divider" />
                    <div className="employee-info">
                      <p>
                        <strong>Performed by:</strong>{" "}
                        <em>{modalRequest.performed_by}</em>
                      </p>
                      <p>
                        <strong>Date Completed:</strong>{" "}
                        <em>
                          {parseLocalDate(
                            modalRequest.date_completed
                          )?.toLocaleDateString() || "—"}
                        </em>
                      </p>
                      <label htmlFor="remarks">
                        <strong>Remarks:</strong>
                      </label>
                    </div>
                    <textarea
                      value={modalRequest.completion_remarks}
                      className="cabr-textarea"
                      rows={1}
                      readOnly
                    />
                  </>
                )}
              </div>

              <div className="submit-content">
                <div className="submit-by-content">
                  <div>
                    <span>{modalRequest.requester_name}</span>
                    <p>Requested by</p>
                  </div>

                  <div className="signature-content">
                    <input
                      className="submit-sign"
                      type="text"
                      value={modalRequest.signature}
                      readOnly
                    />
                    {/* ✅ UPDATED: Only render img if signature exists */}
                    {modalRequest.signature && (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${modalRequest.signature}`}
                        alt="Signature"
                        className="ca-signature-image"
                      />
                    )}
                    <p>Signature</p>
                  </div>
                </div>

                <div className="submit-by-content">
                  <div>
                    <span>{modalRequest.approved_by}</span>
                    <p>Approved by</p>
                  </div>

                  <div className="signature-content">
                    <input
                      className="submit-sign"
                      type="text"
                      value={modalRequest.approved_signature}
                      readOnly
                    />
                    {/* ✅ UPDATED: Fixed bug and conditional render */}
                    {modalRequest.approved_signature && (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${modalRequest.approved_signature}`}
                        alt="Signature"
                        className="ca-signature-image"
                      />
                    )}
                    <p>Signature</p>
                  </div>
                </div>

                <div className="submit-by-content">
                  <div>
                    <span>{modalRequest.accomplished_by}</span>
                    <p>Accomplished by</p>
                  </div>

                  <div className="signature-content">
                    <input
                      className="submit-sign"
                      type="text"
                      value={modalRequest.accomplished_signature}
                      readOnly
                    />
                    {/* ✅ UPDATED: Fixed bug and conditional render */}
                    {modalRequest.accomplished_signature && (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${modalRequest.accomplished_signature}`}
                        alt="Signature"
        
                        className="ca-signature-image"
                      />
                    )}
                    <p>Signature</p>
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
export default ReportsMaintenanceRepair;