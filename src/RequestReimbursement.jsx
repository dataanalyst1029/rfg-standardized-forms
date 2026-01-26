import { useEffect, useMemo, useState } from "react";
import "./styles/RequestCashAdvance.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

function ReimbursementRequest() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalRequest, setModalRequest] = useState(null);
    const [isApproving, setIsApproving] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);
    const [declineReason, setDeclineReason] = useState("");

        const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/reimbursement`);
            if (!response.ok) throw new Error("Failed to fetch reimbursement");
            const data = await response.json();

            const sortedData = data.sort((a, b) =>
            b.rb_request_code.localeCompare(a.rb_request_code)
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
    const [showConfirmDecline, setShowConfirmDecline] = useState(false);
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
    }, [search, rowsPerPage]);

    const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    let pendingRequests = requests.filter(
        (req) => req.status?.toLowerCase() === "pending"
    );

    if (term) {
        pendingRequests = pendingRequests.filter((req) =>
        [
            "rb_request_code",
            "request_date",
            "employee_id",
            "name",
            "branch",
            "department",
            "status",
        ].some((key) => req[key]?.toString().toLowerCase().includes(term))
        );
    }

    return pendingRequests;
    }, [requests, search]);


    const totalPages = Math.max(
        1,
        Math.ceil(filteredRequests.length / rowsPerPage) || 1
    );

    const visibleRequests = useMemo(() => {
        const start = (page - 1) * rowsPerPage;

        const pendingRequests = filteredRequests.filter(
        (req) => req.status?.toLowerCase() === "pending"
        );

        return pendingRequests.slice(start, start + rowsPerPage);
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
        setShowConfirmDecline(false);
        }, 300);
    };

    const hasSignature = Boolean(userData.signature && userData.signature.trim());

    return (
        <div className="admin-view">
            <div className="admin-toolbar">
                <div className="admin-toolbar-title">
                <h2>Reimbursement</h2>
                <p>View and manage all reimbursement in the system.</p>
                </div>

                <div className="admin-toolbar-actions">
                <input
                    type="search"
                    className="admin-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search requests"
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
                    <th style={{ textAlign: "center" }}>CA Liquidation No.</th>
                    <th style={{ textAlign: "center" }}>Employee ID</th>
                    <th style={{ textAlign: "center" }}>Reimbursement Amount</th>
                    {/* <th style={{ textAlign: "center" }}>Status</th> */}
                    <th style={{ textAlign: "center" }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                    <tr>
                        <td colSpan={8} className="admin-empty-state">
                        Loading reimbursement requests...
                        </td>
                    </tr>
                    ) : visibleRequests.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="admin-empty-state">
                        {search
                            ? "No requests match your search."
                            : "No reimbursement requests found."}
                        </td>
                    </tr>
                    ) : (
                    visibleRequests.map((req) => (
                        <tr key={req.id}>
                        <td style={{ textAlign: "center" }}>
                            {req.rb_request_code}
                        </td>
                        <td style={{ textAlign: "center" }}>
                            {new Date(req.request_date).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: "center" }}>{req.cal_no}</td>
                        <td style={{ textAlign: "center" }}>{req.employee_id}</td>
                        <td style={{ textAlign: "center" }}>{req.total_rb_amount}</td>
                        {/* <td style={{ textAlign: "center" }}>
                            {req.status.toUpperCase()}
                        </td> */}
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

                            <h2><small>Reference Number - </small><small style={{textDecoration: 'underline', color: '#305ab5ff'}}>{modalRequest.rb_request_code}</small></h2>
                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label>Date</label>
                                        <input type="text" className="pr-input" value={new Date(modalRequest.request_date).toLocaleDateString()} readOnly />
                                    </div>
                                    <div className="pr-field">
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label>Cash Advance Liquidation No</label>
                                        <input type="text" className="pr-input" value={modalRequest.cal_no} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label>Cash Advance No</label>
                                        <input type="text" className="pr-input" value={modalRequest.ca_no} readOnly />
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label>Employee ID</label>
                                        <input type="text" className="pr-input" value={modalRequest.employee_id} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label>Name</label>
                                        <input type="text" className="pr-input" value={modalRequest.name} readOnly />
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label>Branch</label>
                                        <input type="text" className="pr-input" value={modalRequest.branch} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label>Department</label>
                                        <input type="text" className="pr-input" value={modalRequest.department} readOnly />
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label>BPI Account No.</label>
                                        <input type="text" className="pr-input" value={modalRequest.bpi_acc_no} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label>Total Reimbursable Amount</label>
                                        <input type="text" className="pr-input" value={modalRequest.total_rb_amount} readOnly />
                                    </div>
                                </div>
                            </section>

                            <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                                <section className="pr-form-section" id="details">
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label>Requested by</label>
                                            <input
                                                type="text"
                                                name="requested_by"
                                                value={modalRequest.requested_by || ""}
                                                className="car-input"
                                                readOnly
                                            />
                                        </div>
                                        <div className="pr-field receive-signature">
                                            <label className="pr-label">Signature</label>
                                            <input
                                                type="text"
                                                name="approved_signature"
                                                value={modalRequest.request_signature || ""}
                                                className="car-input received-signature"
                                                required
                                                readOnly
                                            />
                                                {modalRequest.request_signature ? (
                                                <img
                                                src={`${API_BASE_URL}/uploads/signatures/${modalRequest.request_signature}`}
                                                alt="Signature"
                                                className="img-sign"/>
                                                ) : (
                                                <p>No signature available</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label className="pr-label">Approve by</label>
                                            <input
                                                type="text"
                                                name="approved_by"
                                                value={userData.name || ""}
                                                className="car-input"
                                                readOnly
                                            />
                                        </div>

                                        <div className="pr-field receive-signature">
                                            <label className="pr-label">Signature</label>
                                            <input
                                                type="text"
                                                name="approve_signature"
                                                value={userData.signature || ""}
                                                className="car-input received-signature"
                                                required
                                                readOnly
                                            />
                                                {userData.signature ? (
                                                <img
                                                src={`${API_BASE_URL}/uploads/signatures/${userData.signature}`}
                                                alt="Signature"
                                                className="img-sign"/>
                                                ) : (
                                                <p>No signature available</p>
                                            )}
                                        </div>
                                    </div>
                                    {/* <div className="submit-content">
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
                                                className="signature-img"/>
                                                ) : (
                                                    <div className="img-sign empty-sign"></div>
                                                )}
                                                <p>Signature</p>
                                                </label>
                                            </div>
                                        </div>
                                    </div> */}
                                </section>
                                <div className="footer-modal">
                                  <button
                                      type="button"
                                      className="admin-success-btn"
                                      disabled={isApproving}
                                      onClick={async () => {
                                      setIsApproving(true);
                                      const form = document.querySelector(".request-footer-form");
                                      const formData = new FormData(form);

                                      formData.append("rb_request_code", modalRequest.rb_request_code);
                                      formData.append("status", "Approved");

                                      setShowLoadingModal(true);

                                      try {
                                          const response = await fetch(`${API_BASE_URL}/api/update_reimbursement`, {
                                          method: "PUT",
                                          body: formData,
                                          });

                                          if (!response.ok) throw new Error("Failed to approve request");

                                          setStatus({
                                          type: "info",
                                          message: "Reimbursement approved successfully.",
                                          });
                                          handleCloseModal();
                                          fetchRequests();
                                      } catch (err) {
                                          console.error(err);
                                          setStatus({ type: "error", message: err.message });
                                      } finally {
                                          setIsApproving(false);
                                          setShowLoadingModal(false);
                                      }
                                      }}
                                  >
                                      {isApproving ? "Approving..." : "✅ Approve"}
                                  </button>

                                  <button
                                      type="button"
                                      className="admin-reject-btn"
                                      onClick={() => setShowConfirmDecline(true)}
                                  >
                                      ❌ Decline
                                  </button>
                              </div>

                              {showConfirmDecline && (
                                  <div className={`confirm-modal-overlay ${isClosing ? "fade-out" : ""}`}>
                                      <div className="admin-modal-backdrop">
                                          <div
                                              className="admin-modal-panel"
                                              onClick={(e) => e.stopPropagation()}
                                          >
                                              <h3>Confirm Decline</h3>
                                              <p>Please provide a reason for declining this purchase request:</p>

                                              <textarea
                                              className="decline-reason-textarea"
                                              placeholder="Enter reason for decline..."
                                              name="declined_reason"
                                              value={declineReason}
                                              onChange={(e) => setDeclineReason(e.target.value)}
                                              required
                                              style={{
                                                  width: "100%",
                                                  minHeight: "80px",
                                                  borderRadius: "6px",
                                                  padding: "8px",
                                                  marginTop: "8px",
                                                  marginBottom: "16px",
                                                  border: "1px solid #ccc",
                                                  resize: "vertical",
                                              }}
                                              />

                                              <div
                                              style={{
                                                  display: "flex",
                                                  gap: "12px",
                                                  justifyContent: "center",
                                              }}
                                              >
                                                  <button
                                                      className="admin-reject-btn"
                                                      disabled={!declineReason.trim() || isDeclining} 
                                                      onClick={async () => {
                                                          setIsDeclining(true);
                                                          const formData = new FormData();
                                                          formData.append(
                                                          "rb_request_code",
                                                          modalRequest.rb_request_code
                                                          );
                                                          formData.append("status", "Declined");
                                                          formData.append("declined_reason", declineReason.trim());

                                                          setShowLoadingModal(true);

                                                          try {
                                                          const response = await fetch(
                                                              `${API_BASE_URL}/api/update_reimbursement`,
                                                              {
                                                              method: "PUT",
                                                              body: formData,
                                                              }
                                                          );

                                                          if (!response.ok)
                                                              throw new Error("Failed to decline request");

                                                          setStatus({
                                                              type: "info",
                                                              message: "Reimbursement declined successfully.",
                                                          });
                                                          handleCloseModal();
                                                          fetchRequests();
                                                          } catch (err) {
                                                          console.error(err);
                                                          setStatus({ type: "error", message: err.message });
                                                          } finally {
                                                          setIsDeclining(false);
                                                          setShowConfirmDecline(false);
                                                          setShowLoadingModal(false);
                                                          setDeclineReason("");
                                                          }
                                                      }}
                                                      >
                                                      {isDeclining ? "Declining..." : "Decline"}
                                                      </button>


                                                  <button
                                                      className="admin-cancel-btn"
                                                      onClick={() => {
                                                      setShowConfirmDecline(false);
                                                      setDeclineReason("");
                                                      }}
                                                  >
                                                      Cancel
                                                  </button>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default ReimbursementRequest;
