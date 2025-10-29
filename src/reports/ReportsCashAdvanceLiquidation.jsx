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

function ReportsCashAdvanceLiquidation() {
  // ---------------------- STATE DEFINITIONS ----------------------

  // Main dataset of cash advance luquidation requests
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

  // Fetch all cash advance luquidation from backend
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/cash_advance_liquidation`);
      if (!response.ok) throw new Error("Failed to fetch cash advance liquidation");
      const data = await response.json();

      // Sort newest first based on request code
      const sortedData = data.sort((a, b) =>
        b.cal_request_code.localeCompare(a.cal_request_code)
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

  // Fetch cash advance luquidation requests when component mounts
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


    // Step 4: Apply text search filter (matches multiple fields)
    if (term) {
      categorizedRequests = categorizedRequests.filter((req) =>
        [
          "cal_request_code",
          "request_date",
          "employee_id",
          "name",
          "branch",
          "department",
          "nature_activity",
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
    <div className="admin-view">
      {/* ---------- Toolbar and Filters ---------- */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Cash Advance Liquidation Reports</h2>
          <p>View all cash advance luquidation reports in the system.</p>
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
      <div className="admin-table-wrapper">
        <table className="admin-table purchase-table">
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>Ref. No.</th>
              <th style={{ textAlign: "center" }}>Date Request</th>
              <th style={{ textAlign: "left" }}>Employee ID</th>
              <th style={{ textAlign: "left" }}>Name</th>
              <th style={{ textAlign: "left" }}>Branch</th>
              <th style={{ textAlign: "left" }}>Department</th>
              <th style={{ textAlign: "left" }}>Check No.</th>
              <th style={{ textAlign: "center" }}>Nature of Activity</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {/* Loading or empty states */}
            {loading ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  Loading cash advance luquidation reports...
                </td>
              </tr>
            ) : visibleRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  {search || startDate || endDate
                    ? "No requests match your search/filter."
                    : "No pending cash advance luquidation found."}
                </td>
              </tr>
            ) : (
              // Map visible requests into table rows
              visibleRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ textAlign: "center" }}>
                    {req.cal_request_code}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {new Date(req.request_date).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: "left" }}>{req.employee_id}</td>
                  <td style={{ textAlign: "left" }}>{req.name}</td>
                  <td style={{ textAlign: "left" }}>{req.branch}</td>
                  <td style={{ textAlign: "left" }}>{req.department}</td>
                  <td style={{ textAlign: "left" }}>{req.nature_activity}</td>
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
                        <div className="admin-modal-panel request-modals">
                            <button
                                className="admin-close-btn"
                                onClick={handleCloseModal}
                                aria-label="Close"
                                >
                                ×
                            </button>

                            <h2>{modalRequest.cal_request_code}</h2>
                            <p>
                                <strong>Date:</strong>{" "}
                                <em>{new Date(modalRequest.request_date).toLocaleDateString()}</em>
                            </p>
                            <div className="employee-info">
                              <p>
                                <strong>Employee ID:</strong>{" "}
                                <em>{modalRequest.employee_id}</em>
                              </p>
                              <p>
                                <strong>Name:</strong>{" "}
                                <em>{modalRequest.name}</em>
                              </p>
                              <p>
                                <strong>Branch:</strong>{" "}
                                <em>{modalRequest.branch}</em>
                              </p>
                              <p>
                                <strong>Department:</strong>{" "}
                                <em>{modalRequest.department}</em>
                              </p>
                            </div>

                            <div class="replenish-amount">
                                <p>
                                    <strong>Nature of Activity:</strong>{" "}
                                    <em>{modalRequest.nature_activity}</em>
                                </p>
                                <p>
                                    <strong>Inclusive date(s):</strong>{" "}
                                    <em>{new Date(modalRequest.inclusive_date_from).toLocaleDateString()} - {new Date(modalRequest.inclusive_date_to).toLocaleDateString()}</em>
                                </p>
                            </div>

                            {modalRequest.items && modalRequest.items.length > 0 ? (
                            <table className="request-items-table">
                                <thead>
                                <tr>
                                    <th className="text-center">DATE</th>
                                    <th className="text-center">DESCRIPTION</th>
                                    <th className="text-center">OR NO.</th>
                                    <th className="text-center">AMOUNT</th>
                                    <th className="text-center">EXPENSE CHARGES</th>
                                    <th>Store/Branch</th>
                                </tr>
                                </thead>
                                <tbody>
                                {modalRequest.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="text-center">{item.transaction_date}</td>
                                        <td className="text-center">{item.description}</td>
                                        <td className="text-center">{item.or_no}</td>
                                        <td className="text-center">
                                            {item.amount? Number(item.amount).toLocaleString("en-PH", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })
                                            : "0.00"}
                                        </td>
                                        <td className="text-center">{item.exp_charges}</td>
                                        <td className="text-center">{item.store_branch}</td>
                                        {/* <td>{item.remarks}</td> */}
                                    </tr>
    
                                ))}
                                <tr>
                                    <td className="text-center" colSpan={3}><b>Total Expenses</b></td>
                                    <td className="text-center">{modalRequest.total_expense
                                            ? Number(modalRequest.total_expense).toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })
                                        : "0.00"}
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                                </tbody>
                            </table>
                            ) : (
                            <p>—</p>
                            )}

                            <div className="pr-items-card">
                                <div>
                                    <table className="request-items-table">
                                        <tr>
                                            <th className="text-center">BUDGETED</th>
                                            <th className="text-center">ACTUAL</th>
                                            <th className="text-center">DIFFERENCE</th>
                                        </tr>
                                        <tr>
                                            <td className="text-center">
                                                {modalRequest.budgeted
                                                    ? Number(modalRequest.budgeted).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"}
                                            </td>
                                            <td className="text-center">
                                                {modalRequest.actual
                                                    ? Number(modalRequest.actual).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"}</td>
                                            <td className="text-center">
                                                {modalRequest.difference
                                                    ? Number(modalRequest.difference).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"}
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </div>

                            <div className="pr-items-card">
                                <div className="pr-flex-container">
                                    <div className="cal-section" >
                                        <h2 className="pr-section-title">When Budgeted Exceeds Actual</h2>
                                        <div>
                                            <span>Deposit of Excess</span>
                                            <input type="text" value={modalRequest.excess_deposit} readOnly />
                                        </div>
                                        <div>
                                            <span>Date</span>
                                            <input type="text" value={new Date(modalRequest.date_excess).toLocaleDateString()} readOnly/>
                                        </div>
                                        <div>
                                            <span>Acknowledgement Receipt No.</span>
                                            <input type="text" value={modalRequest.ack_rcpt_no} readOnly/>
                                        </div>
                                        <div>
                                            <span>Amount</span>
                                            <input 
                                                type="text"
                                                value={modalRequest.exceed_amount? Number(modalRequest.exceed_amount).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"} readOnly
                                            />
                                        </div>
                                    </div>
                                    <div className="cal-section" >
                                        <h2 className="pr-section-title">When Actual Exceeds Budgeted</h2>
                                        <div>
                                            <span>Reimbursable Amount</span>
                                            <input 
                                                type="text"
                                                value={modalRequest.rb_amount? Number(modalRequest.rb_amount).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"} readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="submit-content">
                              <div className="submit-by-content">
                                <div>
                                  <span>{modalRequest.prepared_by}</span>
                                  <p>Prepared by</p>
                                </div>

                                <div className="signature-content">
                                    <label htmlFor="">
                                        <input className="submit-sign" type="text" value={modalRequest.prepared_signature} readOnly />
                                        {modalRequest.prepared_signature ? (
                                            <>
                                            <img
                                                src={`${API_BASE_URL}/uploads/signatures/${modalRequest.prepared_signature}`}
                                                alt="Signature"
                                                className="cal-signature-image"
                                            />
                                            </>
                                        ) : (
                                            <div className="img-sign empty-sign"></div>
                                        )}
                                    </label>
                                  <p>Signature</p>
                                </div>
                              </div>
                            </div>

                            <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                              <div className="submit-content">
                                <div className="submit-by-content-approve">
                                    <div>
                                        <span>
                                            <input
                                            type="text"
                                            name="approved_by"
                                            value={userData.name || ""}
                                            className="approver-name"
                                            readOnly
                                            />
                                        </span>
                                        <p>Approved by</p>
                                    </div>

                                    <div className="signature-content">
                                        <label>
                                          <input
                                            type="text"
                                            name="approve_signature"
                                            value={userData.signature || ""}
                                            className="submit-sign"
                                            required
                                            readOnly
                                          />
                                          {userData.signature ? (
                                          <img
                                          src={`${API_BASE_URL}/uploads/signatures/${userData.signature}`}
                                          alt="Signature"
                                          className="cal-signature-image"/>
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

export default ReportsCashAdvanceLiquidation;