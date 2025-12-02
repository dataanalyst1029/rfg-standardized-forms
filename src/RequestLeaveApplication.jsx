import { useEffect, useMemo, useState } from "react";
import "./styles/RequestCashAdvance.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

function RequestLeaveApplication() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalRequest, setModalRequest] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [isEndorsing, setIsEndorsing] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);
    const [declineReason, setDeclineReason] = useState("");

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/leave_application`);
            if (!response.ok) throw new Error("Failed to fetch leave application");
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

    const storedId = sessionStorage.getItem("id");
    const [userData, setUserData] = useState({ name: "", signature: "" });
    const [userAccess, setUserAccess] = useState([]);
    const [userRole, setUserRole] = useState("staff");
    const [showLoadingModal, setShowLoadingModal] = useState(false);
    const [showConfirmDecline, setShowConfirmDecline] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const [leaveBalances, setLeaveBalances] = useState({
        vacation: 0,
        sick: 0,
        emergency: 0,
    });

    const fetchLeaveBalances = async (userId) => {
        try {
            const types = [
            { key: "vacation", name: "Vacation Leave" },
            { key: "sick", name: "Sick Leave" },
            { key: "emergency", name: "Emergency Leave" },
            ];

            const balances = {};

            for (const t of types) {
            const res = await fetch(`${API_BASE_URL}/api/user_leaves/${userId}/${encodeURIComponent(t.name)}`);
            const data = await res.json();
            balances[t.key] = data.leave_days || 0;
            }

            setLeaveBalances(balances);

        } catch (error) {
            console.error("Error loading leave balances:", error);
        }
    };

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
            "laf_request_code",
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

    const endorsedRequests = useMemo(() => {
        return requests.filter(
            (req) => req.status?.toLowerCase() === "endorsed"
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
        setModalType("pen");
        setModalOpen(true);
    };
     const openModalEndorsed = (request) => {
        setModalRequest(request);
        setModalType("end");

        fetchLeaveBalances(request.user_id);

        setModalOpen(true);
    };


    const handleCloseModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setModalOpen(false);
            setModalRequest(null);
            setModalType(null);
        }, 300);
    };

    const handleCloseModalEndorsed = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setModalOpen(false);
            setModalRequest(null);
            setModalType(null);
        }, 300);
    };

    return (
        <div className="admin-view">
            <div className="admin-toolbar">
                <div className="admin-toolbar-title">
                <h2>Leave Application</h2>
                <p>View and manage all leave application in the system.</p>
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

            {userRole?.toLowerCase() === "endorse" && userAccess?.includes("HR Leave Application") && (
                <div className="admin-table-wrapper">
                    <table className="admin-table purchase-table">
                    <thead>
                        <tr>
                            <th className="text-center">Ref. No.</th>
                            <th className="text-center">Date Request</th>
                            <th className="text-center">Name</th>
                            <th className="text-left">Leave Type</th>
                            <th className="text-center">Leave Date</th>
                            <th className="text-center">Action</th>
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
                            {search
                                ? "No requests match your search."
                                : "No leave application requests found."}
                            </td>
                        </tr>
                        ) : (
                        visibleRequests.map((req) => (
                            <tr key={req.id}>
                                <td className="text-center">
                                    {req.laf_request_code}
                                </td>
                                <td className="text-center">
                                    {new Date(req.request_date).toLocaleDateString()}
                                </td>
                                <td className="text-center">{req.name}</td>
                                <td className="text-left">{req.leave_type}</td>
                                <td className="text-center">{new Date(req.leave_date_from).toLocaleDateString()} - {new Date(req.leave_date_to).toLocaleDateString()}</td>
                                <td className="text-center">
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

            {userRole?.toLowerCase() === "approve" && userAccess?.includes("HR Leave Application") && (
                <div className="admin-table-wrapper">
                    <table className="admin-table purchase-table">
                    <thead>
                        <tr>
                            <th className="text-center">Ref. No.</th>
                            <th className="text-center">Date Request</th>
                            <th className="text-center">Name</th>
                            <th className="text-left">Leave Type</th>
                            <th className="text-center">Leave Date</th>
                            <th className="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            Loading leave application requests...
                            </td>
                        </tr>
                        ) : endorsedRequests.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            {search
                                ? "No requests match your search."
                                : "No leave application requests found."}
                            </td>
                        </tr>
                        ) : (
                        endorsedRequests.map((req) => (
                            <tr key={req.id}>
                                <td className="text-center">
                                    {req.laf_request_code}
                                </td>
                                <td className="text-center">
                                    {new Date(req.request_date).toLocaleDateString()}
                                </td>
                                <td className="text-center">{req.name}</td>
                                <td className="text-left">{req.leave_type}</td>
                                <td className="text-center">{new Date(req.leave_date_from).toLocaleDateString()} - {new Date(req.leave_date_to).toLocaleDateString()}</td>
                                <td className="text-center">
                                    <button
                                    className="admin-primary-btn"
                                    onClick={() => openModalEndorsed(req)}
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

            {modalOpen && modalRequest && modalType === "pen" && (
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

                            <h2><small>Reference Number - </small><small style={{textDecoration: 'underline', color: '#305ab5ff'}}>{modalRequest.laf_request_code}</small></h2>
                            <section className="pr-form-section">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Date</label>
                                        <input type="text" className="pr-input" value={new Date(modalRequest.request_date).toLocaleDateString()} readOnly />
                                    </div>
                                    <div className="pr-field">
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Name</label>
                                        <input type="text" className="pr-input" value={modalRequest.name} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Employee ID</label>
                                        <input type="text" className="pr-input" value={modalRequest.employee_id} readOnly />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Branch</label>
                                        <input type="text" className="pr-input" value={modalRequest.branch} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Department</label>
                                        <input type="text" className="pr-input" value={modalRequest.department} readOnly />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Position</label>
                                        <input type="text" className="pr-input" value={modalRequest.position} readOnly />
                                    </div>
                                    <div className="pr-field">
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Leave Date</label>
                                        <input
                                            className="pr-input"
                                            value={`${new Date(modalRequest.leave_date_from).toLocaleDateString()} - ${new Date(modalRequest.leave_date_to).toLocaleDateString()}`}
                                            readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Leave Type</label>
                                        <input type="text" className="pr-input" value={modalRequest.leave_type} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        {modalRequest.leave_type === "Others" && (
                                            <>
                                                <label className="pr-label">Specify Other Leave Type</label>
                                                <input
                                                    type="text"
                                                    className="pr-input"
                                                    value={modalRequest.specify_other_leave_type}
                                                    readOnly
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                                <section className="pr-form-section" id="details">
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label className="pr-label">Requested by</label>
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
                                                name="requested_signature"
                                                value={modalRequest.requested_signature || ""}
                                                className="car-input received-signature"
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
                                                type="text"
                                                name="endorsed_by"
                                                value={userData.name || ""}
                                                className="car-input"
                                                readOnly
                                            />
                                        </div>

                                        <div className="pr-field receive-signature">
                                            <label className="pr-label">Signature</label>
                                            <input
                                                type="text"
                                                name="endorsed_signature"
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
                                                <p></p>
                                            )}
                                        </div>
                                    </div>
                                </section>
                                <div className="footer-modal">
                                  <button
                                      type="button"
                                      className="admin-success-btn"
                                      disabled={isEndorsing}
                                      onClick={async () => {
                                      setIsEndorsing(true);
                                      const form = document.querySelector(".request-footer-form");
                                      const formData = new FormData(form);

                                      formData.append("laf_request_code", modalRequest.laf_request_code);
                                      formData.append("status", "Endorsed");

                                      setShowLoadingModal(true);

                                      try {
                                          const response = await fetch(`${API_BASE_URL}/api/update_leave_application`, {
                                          method: "PUT",
                                          body: formData,
                                          });

                                          if (!response.ok) throw new Error("Failed to endorse request");

                                          setStatus({
                                          type: "info",
                                          message: "Leave application endorse successfully.",
                                          });
                                          handleCloseModal();
                                          fetchRequests();
                                      } catch (err) {
                                          console.error(err);
                                          setStatus({ type: "error", message: err.message });
                                      } finally {
                                          setIsEndorsing(false);
                                          setShowLoadingModal(false);
                                      }
                                      }}
                                  >
                                      {isEndorsing ? "Endorsing..." : "✅ Endorse"}
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
                                                          "laf_request_code",
                                                          modalRequest.laf_request_code
                                                          );
                                                          formData.append("status", "Declined");
                                                          formData.append("declined_reason", declineReason.trim());

                                                          setShowLoadingModal(true);

                                                          try {
                                                          const response = await fetch(
                                                              `${API_BASE_URL}/api/update_leave_application`,
                                                              {
                                                              method: "PUT",
                                                              body: formData,
                                                              }
                                                          );

                                                          if (!response.ok)
                                                              throw new Error("Failed to decline request");

                                                          setStatus({
                                                              type: "info",
                                                              message: "Leave application request declined successfully.",
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

            {modalOpen && modalRequest && modalType === "end" && (
                <div className={`modal-overlay ${isClosing ? "fade-out" : ""}`}>
                    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
                        <div className="admin-modal-panel request-modals">
                            <button
                                className="admin-close-btn"
                                onClick={handleCloseModalEndorsed}
                                aria-label="Close"
                                >
                                ×
                            </button>

                            <h2><small>Reference Number - </small><small style={{textDecoration: 'underline', color: '#305ab5ff'}}>{modalRequest.laf_request_code}</small></h2>
                            <section className="pr-form-section">
                                <h2 className="pr-label">Requestor Details</h2>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Date</label>
                                        <input type="text" className="pr-input" value={new Date(modalRequest.request_date).toLocaleDateString()} readOnly />
                                    </div>
                                    <div className="pr-field">
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Name</label>
                                        <input type="text" className="pr-input" value={modalRequest.name} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Employee ID</label>
                                        <input type="text" className="pr-input" value={modalRequest.employee_id} readOnly />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Branch</label>
                                        <input type="text" className="pr-input" value={modalRequest.branch} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Department</label>
                                        <input type="text" className="pr-input" value={modalRequest.department} readOnly />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Position</label>
                                        <input type="text" className="pr-input" value={modalRequest.position} readOnly />
                                    </div>
                                    <div className="pr-field">
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Leave Date</label>
                                        <input
                                            className="pr-input"
                                            value={`${new Date(modalRequest.leave_date_from).toLocaleDateString()} - ${new Date(modalRequest.leave_date_to).toLocaleDateString()}`}
                                            readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Leave Type</label>
                                        <input type="text" className="pr-input" value={modalRequest.leave_type} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        {modalRequest.leave_type === "Others" && (
                                            <>
                                                <label className="pr-label">Specify Other Leave Type</label>
                                                <input
                                                    type="text"
                                                    className="pr-input"
                                                    value={modalRequest.specify_other_leave_type}
                                                    readOnly
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section">
                                <h2 className="pr-label">For HR</h2>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Remarks</label>
                                        <textarea name="remarks" id="remarks" className="pr-input" rows={1} required></textarea>
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Date Received</label>
                                        <input type="date" className="pr-input" name="date_received" value={new Date().toISOString().split("T")[0]} required/>
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Available Leave Days</label>

                                        <div className="pr-input">
                                            <div style={{ display: 'grid', gridTemplateColumns: '150px auto', justifyContent: 'center', rowGap: '6px'}}>
                                                
                                                <span className="pr-label">Vacation Leave:</span>
                                                <span>{leaveBalances.vacation}</span>

                                                <span className="pr-label">Sick Leave:</span>
                                                <span>{leaveBalances.sick}</span>

                                                <span className="pr-label">Emergency Leave:</span>
                                                <span>{leaveBalances.emergency}</span>

                                            </div>
                                        </div>

                                    </div>
                                    <div className="pr-field">

                                    </div>
                                </div>
                            </section>

                            <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                                <section className="pr-form-section" id="details">
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label className="pr-label">Requested by</label>
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
                                                name="requested_signature"
                                                value={modalRequest.requested_signature || ""}
                                                className="car-input received-signature"
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
                                            <label className="pr-label">Approved by</label>
                                            <input
                                                type="text"
                                                name="approve_by"
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
                                                <p></p>
                                            )}
                                        </div>
                                    </div>
                                </section>
                                <div className="footer-modal">
                                    <button
                                        type="button"
                                        className="admin-success-btn"
                                        disabled={isApproving}
                                        onClick={async () => {
                                            const remarks = document.querySelector("textarea[name='remarks']").value.trim();
                                            const date_received = document.querySelector("input[name='date_received']").value;

                                            // ⭐ REQUIRED VALIDATION
                                            if (!remarks) {
                                                setStatus({ type: "error", message: "Remarks is required." });
                                                return;
                                            }
                                            if (!date_received) {
                                                setStatus({ type: "error", message: "Date received is required." });
                                                return;
                                            }

                                            setIsApproving(true);
                                            setShowLoadingModal(true);

                                            try {
                                                const response = await fetch(
                                                    `${API_BASE_URL}/api/leave_application/${modalRequest.id}/approve`,
                                                    {
                                                        method: "PUT",
                                                        headers: {
                                                            "Content-Type": "application/json",
                                                        },
                                                        body: JSON.stringify({
                                                            approve_by: userData.name,
                                                            approve_signature: userData.signature,
                                                            remarks,
                                                            date_received,
                                                        }),
                                                    }
                                                );

                                                if (!response.ok) throw new Error("Failed to approve request");

                                                setStatus({
                                                    type: "info",
                                                    message: "Leave application approved successfully.",
                                                });

                                                handleCloseModalEndorsed();
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
                                                            "laf_request_code",
                                                            modalRequest.laf_request_code
                                                            );
                                                            formData.append("status", "Declined");
                                                            formData.append("declined_reason", declineReason.trim());

                                                            setShowLoadingModal(true);

                                                            try {
                                                            const response = await fetch(
                                                                `${API_BASE_URL}/api/update_leave_application`,
                                                                {
                                                                method: "PUT",
                                                                body: formData,
                                                                }
                                                            );

                                                            if (!response.ok)
                                                                throw new Error("Failed to decline request");

                                                            setStatus({
                                                                type: "info",
                                                                message: "Leave application request declined successfully.",
                                                            });
                                                            handleCloseModalEndorsed();
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
export default RequestLeaveApplication;
