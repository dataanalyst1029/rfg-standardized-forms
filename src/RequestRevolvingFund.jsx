import { useEffect, useMemo, useState } from "react";
// import "./styles/AdminView.css";
import "./styles/RequestRevolvingFund.css";
// import "./styles/RequestPurchase.css"; // reuse same styles
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

function RevolvingFundRequest() {
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


    return (
        <div className="admin-view">
            <div className="admin-toolbar">
                <div className="admin-toolbar-title">
                <h2>Revolving Fund Requests</h2>
                <p>View and manage all revolving fund requests in the system.</p>
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
                        <td colSpan={8} className="admin-empty-state">
                        Loading revolving fund requests...
                        </td>
                    </tr>
                    ) : visibleRequests.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="admin-empty-state">
                        {search
                            ? "No requests match your search."
                            : "No revolving fund requests found."}
                        </td>
                    </tr>
                    ) : (
                    visibleRequests.map((req) => (
                        <tr key={req.id}>
                        <td style={{ textAlign: "center" }}>
                            {req.revolving_request_code}
                        </td>
                        <td style={{ textAlign: "center" }}>
                            {new Date(req.date_request).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: "left" }}>{req.employee_id}</td>
                        <td style={{ textAlign: "left" }}>{req.custodian}</td>
                        <td style={{ textAlign: "left" }}>{req.branch}</td>
                        <td style={{ textAlign: "left" }}>{req.department}</td>
                        <td style={{ textAlign: "left" }}>
                          {req.replenish_amount
                            ? Number(req.replenish_amount).toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "0.00"}
                        </td>

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

                            <h2>{modalRequest.revolving_request_code}</h2>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Date
                                        </label>
                                        <input
                                        value={new Date(modalRequest.date_request).toLocaleDateString()}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                    
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
                                            Custodian
                                        </label>
                                        <input
                                        value={modalRequest.custodian}
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

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Amount for Replenishment
                                        </label>
                                        <input
                                            value={modalRequest.replenish_amount
                                            ? Number(modalRequest.replenish_amount).toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })
                                        : "0.00"}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                       
                                    </div>
                                </div>

                                {/* <div class="replenish-amount">
                                    
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
                                </div> */}
                            </section>

                            <section className="pr-form-section" id="details">
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
                            </section>

                            <section className="pr-form-section" id="details">
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
                            </section>

                            {/* <div className="submit-content">
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
                            </div> */}

                            <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                                <section className="pr-form-section" id="details">
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label className="pr-label">Submitted by</label>
                                            <input
                                                type="text"
                                                name="submitted_by"
                                                value={modalRequest.submitted_by || ""}
                                                className="car-input"
                                                readOnly
                                                />
                                        </div>

                                        <div className="pr-field receive-signature">
                                            <label className="pr-label">Signature</label>
                                            <input
                                                type="text"
                                                name="approved_signature"
                                                value={modalRequest.submitter_signature || ""}
                                                className="car-input received-signature"
                                                required
                                                readOnly
                                            />
                                                {modalRequest.submitter_signature ? (
                                                <img
                                                src={`${API_BASE_URL}/uploads/signatures/${modalRequest.submitter_signature}`}
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
                                                name="approver_signature"
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

                                      formData.append("revolving_request_code", modalRequest.revolving_request_code);
                                      formData.append("status", "Approved");

                                      setShowLoadingModal(true);

                                      try {
                                          const response = await fetch(`${API_BASE_URL}/api/update_revolving_fund_request`, {
                                          method: "PUT",
                                          body: formData,
                                          });

                                          if (!response.ok) throw new Error("Failed to approve request");

                                          setStatus({
                                          type: "info",
                                          message: "Purchase request approved successfully.",
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
                                                          "revolving_request_code",
                                                          modalRequest.revolving_request_code
                                                          );
                                                          formData.append("status", "Declined");
                                                          formData.append("declined_reason", declineReason.trim());

                                                          setShowLoadingModal(true);

                                                          try {
                                                          const response = await fetch(
                                                              `${API_BASE_URL}/api/update_revolving_fund_request`,
                                                              {
                                                              method: "PUT",
                                                              body: formData,
                                                              }
                                                          );

                                                          if (!response.ok)
                                                              throw new Error("Failed to decline request");

                                                          setStatus({
                                                              type: "info",
                                                              message: "Revolving Fund request declined successfully.",
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
export default RevolvingFundRequest;
