import { useEffect, useMemo, useState } from "react";
import "./styles/RequestPayment.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

function PaymentRequest() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalRequest, setModalRequest] = useState(null);
    const [isApproving, setIsApproving] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);
    const [declineReason, setDeclineReason] = useState("");

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/payment_request`);
            if (!response.ok) throw new Error("Failed to fetch payment requests");
            const data = await response.json();

            const sortedData = data.sort((a, b) =>
            b.prf_request_code.localeCompare(a.prf_request_code)
            );

            setRequests(sortedData);
        } catch (err) {
            console.error(err);
            setStatus({ type: "error", message: err.message });
        } finally {
            setLoading(false);
        }
    };

    const [userAccess, setUserAccess] = useState([]);
    const [userRole, setUserRole] = useState("staff");
    const storedId = sessionStorage.getItem("id");
    const [userData, setUserData] = useState({ name: "", signature: "" });

    const [showLoadingModal, setShowLoadingModal] = useState(false);
    const [showConfirmDecline, setShowConfirmDecline] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const fetchAccess = async () => {
        if (!storedId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/user-access/${storedId}`);
            const data = await response.json();
            if (response.ok) {
            setUserAccess(data.access_forms || []);
            setUserRole(data.role || "staff");
            } else {
            console.error("Failed to load access:", data.error);
            }
        } catch (err) {
            console.error("Error fetching access:", err);
        }
        };

        fetchAccess();
    }, [storedId]);

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
            "prf_request_code",
            "request_date",
            "employee_id",
            "name",
            "branch",
            "department",
            "nature_activity",
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

    // Separate list for accounting — show only approved requests
    const receivedRequests = useMemo(() => {
    return requests.filter(
        (req) => req.status?.toLowerCase() === "received"
    );
    }, [requests]);

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

    const openModalReceived = (request) => {
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

    const handleCloseModalReceived = () => {
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
                {userRole.toLowerCase() === "approve" && (
                    <div className="admin-toolbar-title">
                        <h2>Payment Requests</h2>
                        <p>View and manage all payment requests in the system.</p>
                    </div>
                )}

                {userRole.toLowerCase() === "accounting" && (
                    <div className="admin-toolbar-title">
                        <h2>Received Payment Requests</h2>
                        <p>View and manage all received payment requests in the system.</p>
                    </div>
                )}

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

            {userRole.toLowerCase() === "approve" && (
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
                        <th style={{ textAlign: "center" }}>Amount</th>
                        {/* <th style={{ textAlign: "center" }}>Status</th> */}
                        <th style={{ textAlign: "center" }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            Loading payment requests...
                            </td>
                        </tr>
                        ) : visibleRequests.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            {search
                                ? "No requests match your search."
                                : "No payment requests found."}
                            </td>
                        </tr>
                        ) : (
                        visibleRequests.map((req) => (
                            <tr key={req.id}>
                            <td style={{ textAlign: "center" }}>
                                {req.prf_request_code}
                            </td>
                            <td style={{ textAlign: "center" }}>
                                {new Date(req.request_date).toLocaleDateString()}
                            </td>
                            <td style={{ textAlign: "center" }}>{req.employee_id}</td>
                            <td style={{ textAlign: "left" }}>{req.name}</td>
                            <td style={{ textAlign: "left" }}>{req.branch}</td>
                            <td style={{ textAlign: "left" }}>{req.department}</td>
                            <td style={{ textAlign: "center" }}>{req.total_amount}</td>
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
            )}

            {/* Accounting Department Only */}
            {userRole.toLowerCase() === "accounting" && (
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
                        <th style={{ textAlign: "center" }}>Amount</th>
                        <th style={{ textAlign: "center" }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            Loading payment requests...
                            </td>
                        </tr>
                        ) : receivedRequests.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            {search
                                ? "No received requests match your search."
                                : "No received payment requests found."}
                            </td>
                        </tr>
                        ) : (
                        receivedRequests.map((req) => (
                            <tr key={req.id}>
                            <td style={{ textAlign: "center" }}>{req.prf_request_code}</td>
                            <td style={{ textAlign: "center" }}>
                                {new Date(req.request_date).toLocaleDateString()}
                            </td>
                            <td style={{ textAlign: "center" }}>{req.employee_id}</td>
                            <td style={{ textAlign: "left" }}>{req.name}</td>
                            <td style={{ textAlign: "left" }}>{req.branch}</td>
                            <td style={{ textAlign: "left" }}>{req.department}</td>
                            <td style={{ textAlign: "center" }}>
                                {req.total_amount
                                ? Number(req.total_amount).toLocaleString("en-PH", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                    })
                                : "0.00"}
                            </td>
                            <td style={{ textAlign: "center" }}>
                                <button
                                className="admin-primary-btn"
                                onClick={() => openModalReceived(req)}
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
            )}
            {/* End Accounting Department Only */}



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

                            <h2>Payment Request - {modalRequest.prf_request_code}</h2>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Date:
                                        </label>
                                        <input
                                        value={new Date(modalRequest.request_date).toLocaleDateString()}
                                        className="pr-input"
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
                                        />
                                    </div>
                                    <div className="pr-field">
                                    <div className="pr-field">
                                            <label className="pr-label" htmlFor="employeeID">
                                                Name
                                            </label>
                                            <input
                                            value={modalRequest.name}
                                            className="pr-input"
                                            />
                                        </div>
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
                                        />
                                    </div>
                                    <div className="pr-field">
                                    <div className="pr-field">
                                            <label className="pr-label" htmlFor="employeeID">
                                                Department
                                            </label>
                                            <input
                                            value={modalRequest.department}
                                            className="pr-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Vendor/Supplier (Payee's Name)
                                        </label>
                                        <input value={modalRequest.vendor_supplier}
                                        className="pr-input"
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            PR Number (if applicable)
                                        </label>
                                        <input value={modalRequest.pr_number}
                                        className="pr-input"
                                        />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Date Needed
                                        </label>
                                        <input
                                        value={new Date(modalRequest.date_needed).toLocaleDateString()}
                                        className="pr-input"
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Purpose
                                        </label>
                                        <textarea
                                        value={modalRequest.purpose}
                                        className="cabr-textarea"
                                        rows={1}
                                        >
                                        </textarea>
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">

                                {modalRequest.items && modalRequest.items.length > 0 ? (

                                <table className="request-items-table">
                                    <thead>
                                    <tr>
                                        <th className="text-center">Item</th>
                                        <th className="text-center">Quantity</th>
                                        <th className="text-center">Unit Price</th>
                                        <th className="text-center">Amount</th>
                                        <th className="text-center">Expense Charges</th>
                                        <th className="text-center">Location (Store/Branch)</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {modalRequest.items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="text-center">{item.item}</td>
                                            <td className="text-center">{item.quantity}</td>
                                            <td className="text-center">{item.unit_price}</td>
                                            <td className="text-center">{item.amount}</td>
                                            <td className="text-center">{item.expense_charges}</td>
                                            <td className="text-center">{item.location}</td>
                                        </tr>
        
                                    ))}
                                    <tr>
                                        <td colSpan={3} className="text-center">Total</td>
                                        <td className="text-center">{modalRequest.total_amount
                                                ? Number(modalRequest.total_amount).toLocaleString("en-PH", {
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
                            </section>

                            <div className="submit-content">
                              <div className="submit-by-content">
                                <div>
                                  <span>{modalRequest.requested_by}</span>
                                  <p>Requested by</p>
                                </div>

                                <div className="signature-content">
                                  <input className="submit-sign" type="text" value={modalRequest.requested_signature} readOnly />
                                  {modalRequest.requested_signature ? (
                                    <>
                                      <img
                                        src={`${API_BASE_URL}/uploads/signatures/${modalRequest.requested_signature}`}
                                        alt="Signature"
                                        className="ca-signature-image"
                                      />
                                    </>
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
                                                value={userData.name || ""}
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
                                                    name="approved_signature"
                                                    value={userData.signature || ""}
                                                    className="submit-sign approver"
                                                    required
                                                    readOnly
                                                />
                                            </span>
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
                              </div>
                              <div className="footer-modal">
                                  <button
                                      type="button"
                                      className="admin-success-btn"
                                      disabled={isApproving}
                                      onClick={async () => {
                                      setIsApproving(true);
                                      const form = document.querySelector(".request-footer-form");
                                      const formData = new FormData(form);

                                      formData.append("prf_request_code", modalRequest.prf_request_code);
                                      formData.append("status", "Approved");

                                      setShowLoadingModal(true);

                                      try {
                                          const response = await fetch(`${API_BASE_URL}/api/update_payment_request`, {
                                          method: "PUT",
                                          body: formData,
                                          });

                                          if (!response.ok) throw new Error("Failed to approve request");

                                          setStatus({
                                          type: "info",
                                          message: "Payment request approved successfully.",
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
                                  <div className={`confirm-modal-overlay-prf ${isClosing ? "fade-out" : ""}`}>
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
                                                          "prf_request_code",
                                                          modalRequest.prf_request_code
                                                          );
                                                          formData.append("status", "Declined");
                                                          formData.append("declined_reason", declineReason.trim());

                                                          setShowLoadingModal(true);

                                                          try {
                                                          const response = await fetch(
                                                              `${API_BASE_URL}/api/update_payment_request`,
                                                              {
                                                              method: "PUT",
                                                              body: formData,
                                                              }
                                                          );

                                                          if (!response.ok)
                                                              throw new Error("Failed to decline request");

                                                          setStatus({
                                                              type: "info",
                                                              message: "Payment request declined successfully.",
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

            {/* Accounting Dept */}
            {modalOpen && modalRequest && (
                <div className={`modal-overlay ${isClosing ? "fade-out" : ""}`}>
                    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
                        <div className="admin-modal-panel request-modals">
                            <button
                                className="admin-close-btn"
                                onClick={handleCloseModalReceived}
                                aria-label="Close"
                                >
                                ×
                            </button>

                            <h2>Payment Request - {modalRequest.prf_request_code}</h2>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Date:
                                        </label>
                                        <input
                                        value={new Date(modalRequest.request_date).toLocaleDateString()}
                                        className="pr-input"
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
                                        />
                                    </div>
                                    <div className="pr-field">
                                    <div className="pr-field">
                                            <label className="pr-label" htmlFor="employeeID">
                                                Name
                                            </label>
                                            <input
                                            value={modalRequest.name}
                                            className="pr-input"
                                            />
                                        </div>
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
                                        />
                                    </div>
                                    <div className="pr-field">
                                    <div className="pr-field">
                                            <label className="pr-label" htmlFor="employeeID">
                                                Department
                                            </label>
                                            <input
                                            value={modalRequest.department}
                                            className="pr-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Vendor/Supplier (Payee's Name)
                                        </label>
                                        <input value={modalRequest.vendor_supplier}
                                        className="pr-input"
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            PR Number (if applicable)
                                        </label>
                                        <input value={modalRequest.pr_number}
                                        className="pr-input"
                                        />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Date Needed
                                        </label>
                                        <input
                                        value={new Date(modalRequest.date_needed).toLocaleDateString()}
                                        className="pr-input"
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Purpose
                                        </label>
                                        <textarea
                                        value={modalRequest.purpose}
                                        className="cabr-textarea"
                                        rows={1}
                                        >
                                        </textarea>
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">

                                {modalRequest.items && modalRequest.items.length > 0 ? (

                                <table className="request-items-table">
                                    <thead>
                                    <tr>
                                        <th className="text-center">Item</th>
                                        <th className="text-center">Quantity</th>
                                        <th className="text-center">Unit Price</th>
                                        <th className="text-center">Amount</th>
                                        <th className="text-center">Expense Charges</th>
                                        <th className="text-center">Location (Store/Branch)</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {modalRequest.items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="text-center">{item.item}</td>
                                            <td className="text-center">{item.quantity}</td>
                                            <td className="text-center">{item.unit_price}</td>
                                            <td className="text-center">{item.amount}</td>
                                            <td className="text-center">{item.expense_charges}</td>
                                            <td className="text-center">{item.location}</td>
                                        </tr>
        
                                    ))}
                                    <tr>
                                        <td colSpan={3} className="text-center">Total</td>
                                        <td className="text-center">{modalRequest.total_amount
                                                ? Number(modalRequest.total_amount).toLocaleString("en-PH", {
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
                            </section>
                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="car-reference-value">Requested by:</label>
                                        <input type="text" name="requested_by" className="car-input" value={modalRequest.requested_by} required readOnly/>
                                    </div>

                                    <div className="pr-field receive-signature">
                                        <label className="car-reference-value">Signature</label>
                                        <input type="text" name="requested_signature" className="car-input received-signature" value={modalRequest.requested_signature}  readOnly />
                                        {modalRequest.requested_signature ? (
                                            <img
                                            src={`${API_BASE_URL}/uploads/signatures/${modalRequest.requested_signature}`}
                                            alt="Signature"
                                            className="img-sign"/>
                                            ) : (
                                            <p>No signature available</p>
                                        )}
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                    <label className="car-reference-value">Approved by:</label>
                                    <input type="text" name="approved_by" className="car-input" value={modalRequest.approved_by} required readOnly/>
                                    </div>

                                    <div className="pr-field receive-signature">
                                    <label className="car-reference-value">Signature</label>
                                    <input type="text" name="approved_signature" className="car-input received-signature" value={modalRequest.approved_signature}  readOnly />
                                    {modalRequest.approved_signature ? (
                                        <img
                                        src={`${API_BASE_URL}/uploads/signatures/${modalRequest.approved_signature}`}
                                        alt="Signature"
                                        className="img-sign"/>
                                        ) : (
                                            <p>No signature available</p>
                                        )}
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="car-reference-value">Received by:</label>
                                        <input type="text" name="received_by" className="car-input" value={modalRequest.received_by} required readOnly/>
                                    </div>

                                    <div className="pr-field receive-signature">
                                        <label className="car-reference-value">Signature</label>
                                        <input type="text" name="received_signature" className="car-input received-signature" value={modalRequest.received_signature}  readOnly />
                                        {modalRequest.received_signature ? (
                                            <img
                                            src={`${API_BASE_URL}/uploads/signatures/${modalRequest.received_signature}`}
                                            alt="Signature"
                                            className="img-sign"/>
                                        ) : (
                                            <p>No signature available</p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <form className="request-footer-form-accounting" onSubmit={(e) => e.preventDefault()}>
                                <section className="pr-form-section" id="details">
                                    <div className="accounting-only">
                                    <strong>ACCOUNTING DEPARTMENT USE ONLY</strong>
                                    </div>

                                    <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="gl_code">GL Code</label>
                                        <input
                                        type="text"
                                        name="gl_code"
                                        className="pr-input"
                                        required
                                        />
                                        <span className="error-message"></span>
                                    </div>

                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="or_no">OR Number</label>
                                        <input
                                        type="text"
                                        name="or_no"
                                        className="pr-input"
                                        required
                                        />
                                        <span className="error-message"></span>
                                    </div>
                                    </div>

                                    <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="gl_amount">Amount</label>
                                        <input
                                        type="text"
                                        name="gl_amount"
                                        className="pr-input"
                                        required
                                        />
                                        <span className="error-message"></span>
                                    </div>

                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="check_number">Check Number</label>
                                        <input
                                        type="text"
                                        name="check_number"
                                        className="pr-input"
                                        required
                                        />
                                        <span className="error-message"></span>
                                    </div>
                                    </div>
                                </section>

                                <div className="footer-modal">
                                    <button
                                    type="button"
                                    className="admin-success-btn"
                                    disabled={isCompleting}
                                    onClick={async () => {
                                        setIsCompleting(true);
                                        const form = document.querySelector(".request-footer-form-accounting");
                                        const inputs = form.querySelectorAll("input[required]");
                                        let valid = true;

                                        // Reset all previous errors
                                        form.querySelectorAll(".error-message").forEach(el => (el.textContent = ""));
                                        inputs.forEach(input => input.classList.remove("input-error"));

                                        // Validate each required input
                                        inputs.forEach(input => {
                                        if (!input.value.trim()) {
                                            valid = false;
                                            input.classList.add("input-error");
                                            input.nextElementSibling.textContent = "Required field";
                                        }
                                        });

                                        if (!valid) {
                                        setIsCompleting(false);
                                        return; // stop submission
                                        }

                                        // Continue if valid
                                        const formData = new FormData(form);
                                        formData.append("prf_request_code", modalRequest.prf_request_code);
                                        formData.append("status", "Completed");
                                        setShowLoadingModal(true);

                                        try {
                                        const response = await fetch(`${API_BASE_URL}/api/update_payment_request_accounting`, {
                                            method: "PUT",
                                            body: formData,
                                        });

                                        if (!response.ok) throw new Error("Failed to complete request");

                                        setStatus({
                                            type: "info",
                                            message: "Payment request completed successfully.",
                                        });
                                        handleCloseModalReceived();
                                        fetchRequests();
                                        } catch (err) {
                                        console.error(err);
                                        setStatus({ type: "error", message: err.message });
                                        } finally {
                                        setIsCompleting(false);
                                        setShowLoadingModal(false);
                                        }
                                    }}
                                    >
                                    {isCompleting ? "Submitting..." : "✅ Submit"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default PaymentRequest;
