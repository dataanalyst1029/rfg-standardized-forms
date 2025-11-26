import { useEffect, useMemo, useState } from "react";
import "../styles/RequestPayment.css";
import "../styles/AdminView.css";
import { API_BASE_URL } from "../config/api.js";

const PAGE_SIZES = [5, 10, 20];

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;

  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  const timestampMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/);
  if (timestampMatch) {
    const [, year, month, day] = timestampMatch.map(Number);
    return new Date(year, month - 1, day);
  }

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
  // const [startDate, setStartDate] = useState("");
  // const [endDate, setEndDate] = useState("");
  const [modalRequest, setModalRequest] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/maintenance_repair_request`);
      if (!response.ok)
        throw new Error("Failed to fetch maintenance / repair requests");
      const data = await response.json();

      const sortedData = data.sort((a, b) =>
        b.mrr_request_code.localeCompare(a.mrr_request_code)
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

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const formatDate = (date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date - tzOffset).toISOString().slice(0, 10);
    return localISOTime;
  };

  const [startDate, setStartDate] = useState(formatDate(firstDayOfMonth));
  const [endDate, setEndDate] = useState(formatDate(today));

  const statusColors = {
    Declined: 'red',
    Pending: "orange",
    Approved: "blue",
    Received: "purple",
    Completed: "green",
    Accomplished: "teal",
  };

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

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    let categorizedRequests = requests;

    if (startDate) {
      const start = parseLocalDate(startDate);
      if (start) {
        start.setHours(0, 0, 0, 0);
        categorizedRequests = categorizedRequests.filter((req) => {
          const reqDate = parseLocalDate(req.request_date);
          return reqDate && reqDate >= start;
        });
      }
    }

    if (endDate) {
      const end = parseLocalDate(endDate);
      if (end) {
        end.setHours(23, 59, 59, 999);
        categorizedRequests = categorizedRequests.filter((req) => {
          const reqDate = parseLocalDate(req.request_date);
          return reqDate && reqDate <= end;
        });
      }
    }

    const checkDate = (dateStr) => {
      if (!dateStr) return false;

      if (dateStr.toLowerCase().includes(term)) return true;

      const dateObj = parseLocalDate(dateStr);
      return dateObj && dateObj.toLocaleDateString('en-US').includes(term);
    }

    if (term) {
      categorizedRequests = categorizedRequests.filter((req) =>
      {
        const topLevelMatch =
        [
          "mrr_request_code",
          "request_date",
          "employee_id",
          "name",
          "branch",
          "department",
          "date_needed",
          "status",
          "work_description",
          "asset_tag",
        ].some((key) => req[key]?.toString().toLowerCase().includes(term));

        if (topLevelMatch) return true;

        const dateMatch = [
          req.request_date,
          req.date_needed,
          req.date_completed,
        ].some(checkDate);

        if (dateMatch) return true;

        return false;
      });
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
              <th style={{ textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  Loading maintenance/repair reports...
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
                  <td style={{ textAlign: "center", cursor: "pointer", color: "blue", textDecoration: "underline" }} onClick={() => openModal(req)} title="View Details">
                    {req.mrr_request_code}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {parseLocalDate(req.request_date)?.toLocaleDateString() ||
                      "—"}
                  </td>
                  <td style={{ textAlign: "center" }}>{req.employee_id}</td>
                  <td style={{ textAlign: "left" }}>{req.name}</td>
                  <td style={{ textAlign: "left" }}>{req.branch}</td>
                  <td style={{ textAlign: "left" }}>{req.department}</td>
                  <td style={{ textAlign: "center" }}>
                    {parseLocalDate(req.date_needed)?.toLocaleDateString() ||
                      "—"}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      color: statusColors[req.status] || "black",
                      fontWeight: "bold", 
                    }}
                  >
                    <small>
                      {req.status.toUpperCase()}
                    </small>
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

              <h2>
                <small>Reference Number - </small>
                <small 
                  style={{
                    textDecoration: "underline",
                    color: "#305ab5ff"
                  }}
                >
                  {modalRequest.mrr_request_code}
                </small>{" - "}
                <small 
                  style={{ 
                    color: statusColors[modalRequest.status] || "black",
                    fontWeight: "bold"
                  }}
                >
                  {modalRequest.status.toUpperCase()}
                </small>
              </h2>
              
              <section className="pr-form-section">
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label">
                      Date Request
                    </label>
                    <input
                      value={parseLocalDate(modalRequest.request_date)?.toLocaleDateString() ||
                        "Invalid date"}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                    <label className="pr-label">
                      Date Needed
                    </label>
                    <input
                      value={parseLocalDate(modalRequest.date_needed)?.toLocaleDateString() ||
                        "Invalid date"}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                </div>
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label">
                      Employee ID
                    </label>
                    <input
                      value={modalRequest.employee_id}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                    <label className="pr-label">
                      Name
                    </label>
                    <input
                      value={modalRequest.name}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                </div>
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label">
                      Branch
                    </label>
                    <input
                      value={modalRequest.branch}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                    <label className="pr-label">
                      Department
                    </label>
                    <input
                      value={modalRequest.department}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                </div>
              </section>

              <section className="pr-form-section">
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label">
                      Description of Work Required
                    </label>
                    <textarea
                      value={modalRequest.work_description}
                      className="pr-input"
                      rows={1}
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                    <label className="pr-label">
                      Asset Tag/Code (if applicable)
                    </label>
                    <input
                      value={modalRequest.asset_tag}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                </div>
              </section>

              <section className="pr-form-section" id="details">
                
                  <table className="request-items-table">
                    <thead>
                      <tr>
                        <th colSpan={4} className="text-center">COMPLETION INFORMATION</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-left pr-label">Performed by</td>
                        <td className="text-left"><input type="text" className="prf-input" value={modalRequest.performed_by} readOnly/></td>
                          <td className="text-left pr-label">Date Completed</td>
                          <td><input className="prf-input" value={parseLocalDate(modalRequest.date_completed)?.toLocaleDateString() ||
                            "Invalid date"} readOnly/>
                          </td>
                      </tr>
                      <tr>
                        <td className="text-left pr-label">Remarks</td>
                        <td className="text-left" colSpan={3}>
                          <textarea type="text" rows={1} style={{width: '100%'}} className="prf-input" value={modalRequest.remarks} readOnly/>
                        </td>
                      </tr>
                      
                    </tbody>
                  </table>
              </section>

              <section className="pr-form-section">
                {/* <h2><small>Signature Details</small></h2> */}
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label">Requested by</label>
                    <input
                      value={modalRequest.requested_by}
                      className="pr-input"
                      readOnly
                    />
                  </div>

                  <div className="pr-field receive-signature">
                    <label className="pr-label">Signature</label>
                    <input
                        type="text"
                        name="request_signature"
                        value={modalRequest.request_signature || ""}
                        className="pr-input received-signature"
                        required
                        readOnly
                    />
                    {modalRequest.request_signature ? (
                      <img
                      src={`${API_BASE_URL}/uploads/signatures/${modalRequest.request_signature}`}
                      alt="Signature"
                      className="img-sign"/>
                      ) : (
                        <p></p>
                    )}
                  </div>
                </div>
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label">Approved by</label>
                    <input
                      value={modalRequest.approved_by}
                      className="pr-input"
                      readOnly
                    />
                  </div>

                  <div className="pr-field receive-signature">
                    <label className="pr-label">Signature</label>
                    <input
                        type="text"
                        name="approved_signature"
                        value={modalRequest.approved_signature || ""}
                        className="pr-input received-signature"
                        required
                        readOnly
                    />
                    {modalRequest.approved_signature ? (
                      <img
                      src={`${API_BASE_URL}/uploads/signatures/${modalRequest.approved_signature}`}
                      alt="Signature"
                      className="img-sign"/>
                      ) : (
                        <p></p>
                    )}
                  </div>
                </div>
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label">Accomplished by</label>
                    <input
                      value={modalRequest.accomplished_by}
                      className="pr-input"
                      readOnly
                    />
                  </div>

                  <div className="pr-field receive-signature">
                    <label className="pr-label">Signature</label>
                    <input
                        type="text"
                        name="accomplished_signature"
                        value={modalRequest.accomplished_signature || ""}
                        className="pr-input received-signature"
                        required
                        readOnly
                    />
                    {modalRequest.accomplished_signature ? (
                      <img
                      src={`${API_BASE_URL}/uploads/signatures/${modalRequest.accomplished_signature}`}
                      alt="Signature"
                      className="img-sign"/>
                      ) : (
                        <p></p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ReportsMaintenanceRepair;