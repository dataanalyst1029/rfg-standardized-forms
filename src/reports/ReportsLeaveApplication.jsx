import { useEffect, useMemo, useState } from "react";
import "../styles/AdminView.css";
import { API_BASE_URL } from "../config/api.js";

const PAGE_SIZES = [5, 10, 20];

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;

  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
};

function ReportsLeaveApplication() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRequest, setModalRequest] = useState(null);
  // const [startDate, setStartDate] = useState("");
  // const [endDate, setEndDate] = useState("");
  const storedId = sessionStorage.getItem("id");
  const [userData, setUserData] = useState({ name: "", signature: "" });
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
    Endorsed: "purple",
  };

  const [leaveBalances, setLeaveBalances] = useState({
    "Vacation Leave": 0,
    "Sick Leave": 0,
    "Emergency Leave": 0,
  });

  useEffect(() => {
    if (!modalRequest) return;

    const userId = modalRequest.user_id || modalRequest.employee_id;

    if (!userId) {
      console.warn("❌ No user ID found to load leave balances.");
      return;
    }

    const fetchBalances = async () => {
      const types = ["Vacation Leave", "Sick Leave", "Emergency Leave"];
      const result = {};

      for (const type of types) {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/user_leaves/${userId}/${encodeURIComponent(type)}`
          );
          const data = await res.json();
          result[type] = data.leave_days ?? 0;
        } catch (err) {
          console.error(`❌ Error loading ${type}:`, err);
          result[type] = 0;
        }
      }

      setLeaveBalances(result);
    };

    fetchBalances();
  }, [modalRequest]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/leave_application`);
      if (!response.ok) throw new Error("Failed to fetch leave applications");
      const data = await response.json();

      const sortedData = data.sort((a, b) =>
        b.laf_request_code.localeCompare(a.laf_request_code)
      );

      setRequests(sortedData);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
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
      const normalizedTerm = term.replace(/[^0-9.]/g, "");
      categorizedRequests = categorizedRequests.filter((req) => {
        const topLevelMatch = 
        [
          "laf_request_code",
          "request_date",
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
    }, 300);
  };

  return (
    <div className="admin-view">
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

      <div className="admin-table-wrapper">
        <table className="admin-table purchase-table">
          <thead>
            <tr>
              <th className="text-center">Ref. No.</th>
              <th className="text-left">Date Request</th>
              <th className="text-center">Employee ID</th>
              <th className="text-left">Department</th>
              <th className="text-left">Leave Type</th>
              <th className="text-center">Status</th>
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
                  <td style={{ textAlign: "center", cursor: "pointer", color: "blue", textDecoration: "underline" }} onClick={() => openModal(req)} title="View Details">
                    {req.laf_request_code}
                  </td>
                  <td className="text-left">
                    {new Date(req.request_date).toLocaleDateString()}
                  </td>
                  <td className="text-center">{req.employee_id}</td>
                  <td className="text-left">{req.department}</td>
                  <td style={{ textAlign: "left" }}>{req.leave_type}</td>
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
          <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal-panel request-modals">
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
                  {modalRequest.laf_request_code}
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

              <section className="pr-form-section" id="details">
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label">
                      Date
                    </label>
                    <input
                      value={new Date(modalRequest.request_date).toLocaleDateString()}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                    
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

                      // value={`${modalRequest.department} - ${modalRequest.position}`}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                </div>

                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label">
                      Position
                    </label>
                    <input
                      value={modalRequest.position}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                  <div className="pr-field">
                  </div>
                </div>
              </section>

              <section className="pr-form-section">
                <div className="pr-grid-two">
                  <div className="pr-field">
                      <label className="pr-label">Leave Type</label>
                      <input 
                        value={modalRequest.leave_type}
                        className="pr-input"
                        readOnly
                      />
                  </div>
                  <div className="pr-field">
                    <label className="pr-label">Leave Date(s)</label>
                    <input
                      value={`${new Date(modalRequest.leave_date_from).toLocaleDateString()} - ${new Date(modalRequest.leave_date_to).toLocaleDateString()}`}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                </div>

                <div className="pr-grid-two">
                  <div className="pr-field">
                      <label className="pr-label">Remarks</label>
                      <input
                        value={modalRequest.remarks}
                        className="pr-input"
                        readOnly
                      />
                  </div>
                  <div className="pr-field">
                    <label classNamer="pr-label">Date Received</label>
                    <input
                      value={new Date(modalRequest.date_received).toLocaleDateString()}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                </div>

                <div className="pr-grid-two" style={{marginTop: '2rem'}}>
                  <div className="pr-field">
                    <label className="pr-labell">Available Leave Day(s)</label>

                    <ul>
                      <li>Vacation Leave: {leaveBalances["Vacation Leave"]}</li>
                      <li>Sick Leave: {leaveBalances["Sick Leave"]}</li>
                      <li>Emergency Leave: {leaveBalances["Emergency Leave"]}</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="pr-form-section">
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
                        name="requested_signature"
                        value={modalRequest.requested_signature || ""}
                        className="pr-input received-signature"
                        required
                        readOnly
                    />
                    {modalRequest.requested_signature ? (
                      <img
                      src={`${API_BASE_URL}/uploads/signatures/${modalRequest.requested_signature}`}
                      alt="Signature"
                      className="img-sign"/>
                      ) : (
                        <p></p>
                    )}
                  </div>
                </div>
                
                <div className="pr-grid-two">
                  <div className="pr-field">
                    <label className="pr-label">Endorsed by</label>
                    <input 
                      value={modalRequest.endorsed_by}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                  <div className="pr-field receive-signature">
                    <label className="pr-label">Signature</label>
                    <input
                        type="text"
                        name="endorsed_signature"
                        value={modalRequest.endorsed_signature || ""}
                        className="pr-input received-signature"
                        required
                        readOnly
                    />
                    {modalRequest.endorsed_signature ? (
                      <img
                      src={`${API_BASE_URL}/uploads/signatures/${modalRequest.endorsed_signature}`}
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
                        name="approve_signature"
                        value={modalRequest.approve_signature || ""}
                        className="pr-input received-signature"
                        required
                        readOnly
                    />
                    {modalRequest.approve_signature ? (
                      <img
                      src={`${API_BASE_URL}/uploads/signatures/${modalRequest.approve_signature}`}
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

export default ReportsLeaveApplication;