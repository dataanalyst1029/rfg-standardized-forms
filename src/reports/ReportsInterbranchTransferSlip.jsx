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

function ReportsInterbranchTransferSlip() {
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

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/interbranch_transfer`);
      if (!response.ok) throw new Error("Failed to fetch interbranch transfer slips");
      const data = await response.json();

      const sortedData = data.sort((a, b) =>
        b.its_request_code.localeCompare(a.its_request_code)
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
      categorizedRequests = categorizedRequests.filter((req) => {
        const topLevelMatch =
        [
          "its_request_code",
          "request_date",
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
          req.request_date,
          req.date_transferred,
          req.date_received
        ].some(checkDate); 

        if (dateMatch) return true;

        const itemMatch = (req.items || []).some(item =>
          item.item_code?.toLowerCase().includes(term) ||
          item.item_description?.toLowerCase().includes(term)
        );

        if (itemMatch) return true;

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

      <div className="admin-table-wrapper">
        <table className="admin-table purchase-table">
          <thead>
            <tr>
              <th className="text-center">Ref. No.</th>
              <th className="text-center">Date Request</th>
              <th>Prepared By</th>
              <th>From Branch</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="admin-empty-state">
                  Loading interbranch transfer slips...
                </td>
              </tr>
            ) : visibleRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-empty-state">
                  {search || startDate || endDate
                    ? "No requests match your search/filter."
                    : "No interbranch transfer slips found."}
                </td>
              </tr>
            ) : (
              visibleRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ textAlign: "center", cursor: "pointer", color: "blue", textDecoration: "underline" }} onClick={() => openModal(req)} title="View Details">
                    {req.its_request_code}
                  </td>
                  <td className="text-center">
                    {new Date(req.request_date).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: "left" }}>{req.prepared_by}</td>
                  <td style={{ textAlign: "left" }}>{req.from_branch} - {req.to_branch}</td>
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
                  {modalRequest.its_request_code}
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
                      Employee Name
                    </label>
                     <input
                      value={modalRequest.prepared_by}
                      className="pr-input"
                      readOnly
                    />
                  </div>
                </div>
              </section>

              <section className="pr-form-section">
                <h2 className="pr-section-title pr-section-title--modal">
                  Transfer Details
                </h2>
                
                <table className="request-items-table request-items-table--modal-details">
                   <tbody>
                      <tr className="modal-table-row--border-bottom">
                        <th className="modal-table-header w-15">Origin</th>
                        <td className="modal-table-cell--border-right w-35">
                            <strong>{modalRequest.from_branch}</strong><br/>
                            <span className="text-subtle">{modalRequest.from_address}</span>
                        </td>
                        <th className="modal-table-header w-15">Destination</th>
                        <td className="w-35">
                            <strong>{modalRequest.to_branch}</strong><br/>
                            <span className="text-subtle">{modalRequest.to_address}</span>
                        </td>
                      </tr>
                      <tr className="modal-table-row--border-bottom">
                        <th className="modal-table-header w-15">Area Operations Controller</th>
                        <td className="modal-table-cell--border-right w-35">
                            <strong>{modalRequest.from_area_ops_controller}</strong><br/>
                        </td>
                        <th className="modal-table-header w-15">Area Operations Controller</th>
                        <td className="w-35">
                            <strong>{modalRequest.to_area_ops_controller}</strong><br/>
                        </td>
                      </tr>
                      <tr>
                        <th className="modal-table-header">Dispatch</th>
                        <td colSpan="3">
                            <div className="modal-grid-two">
                                <span><strong>Method:</strong> {modalRequest.dispatch_method || "—"}</span>
                                <span><strong>Vehicle No:</strong> {modalRequest.vehicle_no || "—"}</span>
                                <span><strong>Driver:</strong> {modalRequest.driver_name || "—"}</span>
                                <span><strong>Contact:</strong> {modalRequest.driver_contact || "—"}</span>
                            </div>
                        </td>
                      </tr>
                   </tbody>
                </table>
              </section>

              <div className="pr-items-card pr-items-card--modal">
                 <h2 className="pr-section-title pr-section-title--modal">
                  Items
                </h2>
                
                {modalRequest.items && modalRequest.items.length > 0 ? (
                <table className="request-items-table">
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Description</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalRequest.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.item_code || "—"}</td>
                        <td className="text-center">{item.qty}</td>
                        <td className="text-center">{item.unit_measure}</td>
                        <td>{item.item_description || "—"}</td>
                        <td>{item.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                ) : (
                    <p className="modal-no-items">No items listed.</p>
                )}
              </div>

              <div className="submit-content">
                <div className="submit-by-content">
                  <div>
                    <span>{modalRequest.prepared_by}</span>
                    <p>Prepared by</p>
                  </div>
                  <div className="signature-content">
                    <input
                      className="submit-sign"
                      type="text"
                      value={modalRequest.prepared_signature}
                      readOnly
                    />
                    {modalRequest.prepared_signature ? (
                      <img
                        src={`${API_BASE_URL}/uploads/signatures/${modalRequest.prepared_signature}`}
                        alt="Signature"
                        className="signature-img"
                      />
                    ) : (
                      <div className="img-sign empty-sign"></div>
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
                            value={modalRequest.approved_by} 
                            className="approver"
                            readOnly
                          />
                        </span>
                      <p>Approved by</p>
                      </label>
                    </div>

                    <div className="approver-signature">
                      <label>
                        <span>
                          <input
                            type="text"
                            name="approve_signature"
                            value={userData.signature || ""}
                            className="submit-sign approver"
                            required
                            readOnly
                          />
                        </span>
                        {userData.signature ? (
                          <img
                            src={`${API_BASE_URL}/uploads/signatures/${modalRequest.approved_signature}`}
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

export default ReportsInterbranchTransferSlip;