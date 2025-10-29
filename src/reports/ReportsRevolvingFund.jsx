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
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/); // ✅ Added `$` for stricter match
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  // Fallback — native parse attempt
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
};

function ReportsRevolvingFund() {
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
      const response = await fetch(`${API_BASE_URL}/api/revolving_fund_request`);
      if (!response.ok) throw new Error("Failed to fetch revolving fund requests");
      const data = await response.json();

      const sortedData = data.sort((a, b) =>
        b.revolving_request_code.localeCompare(a.revolving_request_code)
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
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!storedId) return;
    fetch(`${API_BASE_URL}/users/${storedId}`)
      .then((res) => res.json())
      .then((data) => setUserData(data))
      .catch((err) => console.error("Error fetching user data:", err));
  }, [storedId]);

  useEffect(() => {
    if (!status) return;
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

    // Start date filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      categorizedRequests = categorizedRequests.filter((req) => {
        const reqDate = parseLocalDate(req.date_request);
        return reqDate && reqDate >= start;
      });
    }

    // End date filter
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      categorizedRequests = categorizedRequests.filter((req) => {
        const reqDate = parseLocalDate(req.date_request);
        return reqDate && reqDate <= end;
      });
    }

    // Text search
    if (term) {
      categorizedRequests = categorizedRequests.filter((req) =>
        [
          "revolving_request_code",
          "date_request",
          "employee_id",
          "custodian",
          "branch",
          "department",
          "replenish_amount",
          "status",
        ].some((key) => req[key]?.toString().toLowerCase().includes(term))
      );
    }

    return categorizedRequests;
  }, [requests, search, startDate, endDate]);

  // ---------------------- PAGINATION ----------------------
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage) || 1);

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
    <div className="audit-view">
      {/* ---------- Toolbar and Filters ---------- */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>Revolving Fund Reports</h2>
          <p>View all revolving fund reports in the system.</p>
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
      <div className="audit-table-wrapper">
        <table className="admin-table purchase-table">
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>Ref. No.</th>
              <th style={{ textAlign: "center" }}>Date Request</th>
              <th style={{ textAlign: "left" }}>Employee ID</th>
              <th style={{ textAlign: "left" }}>Custodian</th>
              <th style={{ textAlign: "left" }}>Branch</th>
              <th style={{ textAlign: "left" }}>Department</th>
              <th style={{ textAlign: "left" }}>Replenish Amount</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="admin-empty-state">
                  Loading revolving fund reports...
                </td>
              </tr>
            ) : visibleRequests.length === 0 ? (
              <tr>
                <td colSpan={9} className="admin-empty-state">
                  {search || startDate || endDate
                    ? "No requests match your search/filter."
                    : "No revolving fund requests found."}
                </td>
              </tr>
            ) : (
              visibleRequests.map((req) => {
                const displayDate =
                  parseLocalDate(req.date_request)?.toLocaleDateString() || "—"; // ✅ safer
                return (
                  <tr key={req.id}>
                    <td style={{ textAlign: "center" }}>{req.revolving_request_code}</td>
                    <td style={{ textAlign: "center" }}>{displayDate}</td>
                    <td>{req.employee_id}</td>
                    <td>{req.custodian}</td>
                    <td>{req.branch}</td>
                    <td>{req.department}</td>
                    <td>
                      {Number(req.replenish_amount).toLocaleString("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      })}
                    </td>
                    <td style={{ textAlign: "center" }}>{req.status.toUpperCase()}</td>
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
                );
              })
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

                            <h2>{modalRequest.revolving_request_code}</h2>
                            <p>
                                <strong>Date:</strong>{" "}
                                <em>{new Date(modalRequest.date_request).toLocaleDateString()}</em>
                            </p>
                            <div className="employee-info">
                              <p>
                                <strong>Employee ID:</strong>{" "}
                                <em>{modalRequest.employee_id}</em>
                              </p>
                              <p>
                                <strong>Custodian:</strong>{" "}
                                <em>{modalRequest.custodian}</em>
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
                              <span><b>Amount for Replenishment: </b> 
                                <i>
                                  {modalRequest.replenish_amount
                                    ? Number(modalRequest.replenish_amount).toLocaleString("en-PH", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : "0.00"}
                                </i>
                              </span>
                            </div>

                            {modalRequest.items && modalRequest.items.length > 0 ? (
                            <table className="request-items-table">
                                <thead>
                                <tr>
                                    <th className="text-center">DATE</th>
                                    <th className="text-center">VOUCHER NO.</th>
                                    <th className="text-center">OR REF. NO.</th>
                                    <th className="text-center">AMOUNT</th>
                                    <th>EXP. CATEGORY</th>
                                    <th>GL ACCOUNT</th>
                                    <th>REMARKS</th>
                                </tr>
                                </thead>
                                <tbody>
                                {modalRequest.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="text-center">{new Date(modalRequest.date_request).toLocaleDateString()}</td>
                                        <td className="text-center">{item.voucher_no}</td>
                                        <td className="text-center">{item.or_ref_no}</td>
                                        <td className="text-center">
                                            {item.amount
                                                ? Number(item.amount).toLocaleString("en-PH", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })
                                            : "0.00"}</td>
                                        <td>{item.exp_cat}</td>
                                        <td>{item.gl_account}</td>
                                        <td>{item.remarks}</td>
                                    </tr>
    
                                ))}
                                <tr>
                                    <td className="text-center" colSpan={3}>Total</td>
                                    <td className="text-center">{modalRequest.total
                                            ? Number(modalRequest.total).toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })
                                        : "0.00"}
                                    </td>
                                    <td colSpan={3}></td>
                                </tr>
                                </tbody>
                            </table>
                            ) : (
                            <p>—</p>
                            )}

                            <div className="replenishment-cash">
                                <label htmlFor="revolving-fund-amount">
                                    <p>Petty Cash/Revolving Fund Amount:</p>
                                    <em>{modalRequest.revolving_amount
                                            ? Number(modalRequest.revolving_amount).toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })
                                        : "0.00"}
                                    </em>
                                </label>
                                <label htmlFor="total-expense">
                                    <p>Less: Total Expenses per vouchers:</p>
                                    <em>{modalRequest.total_exp
                                            ? Number(modalRequest.total_exp).toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })
                                        : "0.00"}
                                    </em>
                                    
                                </label>
                                <label htmlFor="cash-onhand">
                                    <p>Cash on Hand:</p>
                                    <em>{modalRequest.cash_onhand
                                            ? Number(modalRequest.cash_onhand).toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })
                                        : "0.00"}
                                    </em>
                                </label>
                            </div>

                            <div className="submit-content">
                              <div className="submit-by-content">
                                <div>
                                  <span>{modalRequest.submitted_by}</span>
                                  <p>Submitted by</p>
                                </div>

                                <div className="revolving-signature">
                                  <input className="submit-sign" type="text" value={modalRequest.submitter_signature} readOnly />
                                  {modalRequest.submitter_signature ? (
                                    <>
                                      <img
                                        src={`${API_BASE_URL}/uploads/signatures/${modalRequest.submitter_signature}`}
                                        alt="Signature"
                                        className="signature-image"
                                      />
                                    </>
                                  ) : (
                                    <p><i>No signature available</i></p>
                                  )}
                                  <p>Signature</p>
                                </div>
                              </div>
                            </div>

                            <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                              <div className="submit-content">
                                <div className="submit-by-content">
                                    <div>
                                        <label>
                                            <span>
                                              <input
                                                type="text"
                                                name="approved_by"
                                                value={userData.name || ""}
                                                readOnly
                                              />
                                            </span>
                                            <p>Approved by</p>
                                        </label>
                                    </div>

                                    <div className="approver-signature">
                                        <label>
                                          <input
                                            type="text"
                                            name="approver_signature"
                                            value={userData.signature || ""}
                                            className="submit-sign"
                                            required
                                            readOnly
                                          />
                                          {userData.signature ? (
                                          <img
                                          src={`${API_BASE_URL}/uploads/signatures/${userData.signature}`}
                                          alt="Signature"
                                          className="signature-img"/>
                                          ) : (
                                              <p>No signature available</p>
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

export default ReportsRevolvingFund;
