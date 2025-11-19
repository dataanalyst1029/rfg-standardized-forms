import { useEffect, useMemo, useState } from "react";
import "./styles/RequestMaintenanceRepair.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

function MaintenanceRepair() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalRequest, setModalRequest] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [isApproving, setIsApproving] = useState(false);
    const [isAccomplishing, setIsAccomplishing] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);
    const [declineReason, setDeclineReason] = useState("");
    const [isAccomplish, setIsAccomplish] = useState(false);

        const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/maintenance_repair_request`);
            if (!response.ok) throw new Error("Failed to fetch maintenance / repair request");
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
    const [userAccess, setUserAccess] = useState([]);
    const [userRole, setUserRole] = useState("staff");
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
            "mrr_request_code",
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

    // Separate list for accounting — show only approved requests
    const approvedRequests = useMemo(() => {
        return requests.filter(
            (req) => req.status?.toLowerCase() === "approved"
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

    const openModalAccomplish = (request) => {
        setModalRequest(request);
        setModalType("app"); 
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

    const handleCloseModalAccomplish = () => {
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
                <h2>Maintenance or Repair</h2>
                <p>View and manage all maintenance/repair requests in the system.</p>
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

            {userRole.toLowerCase() === "approve" && (
                <div className="admin-table-wrapper">
                    <table className="admin-table purchase-table">
                    <thead>
                        <tr>
                        <th style={{ textAlign: "center" }}>Ref. No.</th>
                        <th style={{ textAlign: "center" }}>Date Request</th>
                        <th style={{ textAlign: "center" }}>Employee ID</th>
                        <th style={{ textAlign: "center" }}>Name</th>
                        <th style={{ textAlign: "center" }}>Description of Work</th>
                        {/* <th style={{ textAlign: "center" }}>Status</th> */}
                        <th style={{ textAlign: "center" }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            Loading maintenance / repair requests...
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
                                {req.mrr_request_code}
                            </td>
                            <td style={{ textAlign: "center" }}>
                                {new Date(req.request_date).toLocaleDateString()}
                            </td>
                            <td style={{ textAlign: "center" }}>{req.employee_id}</td>
                            <td style={{ textAlign: "center" }}>{req.name}</td>
                            <td style={{ textAlign: "center" }}>{req.work_description}</td>
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

            {userRole.toLowerCase() === "accomplish" && (
                <div className="admin-table-wrapper">
                    <table className="admin-table purchase-table">
                    <thead>
                        <tr>
                        <th style={{ textAlign: "center" }}>Ref. No.</th>
                        <th style={{ textAlign: "center" }}>Date Request</th>
                        <th style={{ textAlign: "center" }}>Employee ID</th>
                        <th style={{ textAlign: "center" }}>Name</th>
                        <th style={{ textAlign: "center" }}>Description of Work</th>
                        {/* <th style={{ textAlign: "center" }}>Status</th> */}
                        <th style={{ textAlign: "center" }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                         {loading ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            Loading maintenance / repair requests...
                            </td>
                        </tr>
                        ) : approvedRequests.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            {search
                                ? "No approved requests match your search."
                                : "No approved cash advance budget requests found."}
                            </td>
                        </tr>
                        ) : (
                        approvedRequests.map((req) => (
                            <tr key={req.id}>
                            <td style={{ textAlign: "center" }}>
                                {req.mrr_request_code}
                            </td>
                            <td style={{ textAlign: "center" }}>
                                {new Date(req.request_date).toLocaleDateString()}
                            </td>
                            <td style={{ textAlign: "center" }}>{req.employee_id}</td>
                            <td style={{ textAlign: "center" }}>{req.name}</td>
                            <td style={{ textAlign: "center" }}>{req.work_description}</td>
                            {/* <td style={{ textAlign: "center" }}>
                                {req.status.toUpperCase()}
                            </td> */}
                            <td style={{ textAlign: "center" }}>
                                <button
                                className="admin-primary-btn"
                                onClick={() => openModalAccomplish(req)}
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

                            <h2>{modalRequest.mrr_request_code}</h2>
                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <small style={{background: '#000', padding: '.5rem', color: '#fff'}}>Requestor Details</small>
                                    </div>
                                    <div className="pr-field">
                                        <label><strong>Date</strong></label>
                                        <input type="text" className="pr-input" value={new Date(modalRequest.request_date).toLocaleDateString()} readOnly />
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label><strong>Employee ID</strong></label>
                                        <input type="text" className="pr-input" value={modalRequest.employee_id} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label><strong>Name</strong></label>
                                        <input type="text" className="pr-input" value={modalRequest.name} readOnly />
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label><strong>Branch</strong></label>
                                        <input type="text" className="pr-input" value={modalRequest.branch} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label><strong>Department</strong></label>
                                        <input type="text" className="pr-input" value={modalRequest.department} readOnly />
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label><strong>Date Needed</strong></label>
                                        <input type="text" className="pr-input" value={new Date(modalRequest.date_needed).toLocaleDateString()} readOnly />
                                    </div>
                                    <div className="pr-field">
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label><strong>Description of Work Required</strong></label>
                                        <textarea
                                            value={modalRequest.work_description}
                                            className="car-textarea pr-input"
                                            rows={4}
                                            readOnly
                                        />
                                    </div>
                                </div>

                                 <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label><strong>Asset Tag / Code (if Applicable)</strong></label>
                                        <input type="text" className="pr-input" value={modalRequest.asset_tag} readOnly />
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label><strong>Requested by</strong></label>
                                        <input type="text" name="requested_by" className="car-input" value={modalRequest.requested_by} required readOnly/>
                                    </div>

                                    <div className="pr-field receive-signature">
                                        <label><strong>Signature</strong></label>
                                        <input type="text" name="request_signature" className="car-input received-signature" value={modalRequest.request_signature}  readOnly />
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

                                <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label><strong>Approved by</strong></label>
                                            <input
                                                type="text"
                                                name="approved_by"
                                                value={userData.name || ""}
                                                className="car-input"
                                                readOnly
                                                />
                                        </div>

                                        <div className="pr-field receive-signature">
                                            <label><strong>Signature</strong></label>
                                            <input
                                                type="text"
                                                name="approved_signature"
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
                                    <div className="footer-modal">
                                        <button
                                            type="button"
                                            className="admin-success-btn"
                                            disabled={isApproving}
                                            onClick={async () => {
                                            setIsApproving(true);
                                            const form = document.querySelector(".request-footer-form");
                                            const formData = new FormData(form);

                                            formData.append("mrr_request_code", modalRequest.mrr_request_code);
                                            formData.append("status", "Approved");

                                            setShowLoadingModal(true);

                                            try {
                                                const response = await fetch(`${API_BASE_URL}/api/update_maintenance_repair_request`, {
                                                method: "PUT",
                                                body: formData,
                                                });

                                                if (!response.ok) throw new Error("Failed to approve request");

                                                setStatus({
                                                type: "info",
                                                message: "Maintenance / Repair Request Approved Successfully.",
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
                                        <div className={`confirm-modal-overlay-mrr ${isClosing ? "fade-out" : ""}`}>
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
                                                                "mrr_request_code",
                                                                modalRequest.mrr_request_code
                                                                );
                                                                formData.append("status", "Declined");
                                                                formData.append("declined_reason", declineReason.trim());

                                                                setShowLoadingModal(true);

                                                                try {
                                                                const response = await fetch(
                                                                    `${API_BASE_URL}/api/update_maintenance_repair_request`,
                                                                    {
                                                                    method: "PUT",
                                                                    body: formData,
                                                                    }
                                                                );

                                                                if (!response.ok)
                                                                    throw new Error("Failed to decline request");

                                                                setStatus({
                                                                    type: "info",
                                                                    message: "Maintenance / Repair Request Declined Successfully.",
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
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {modalOpen && modalRequest && modalType === "app" && (
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

                            <h2>{modalRequest.mrr_request_code}</h2>
                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <small style={{background: '#000', padding: '.5rem', color: '#fff'}}>Requestor Details</small>
                                    </div>
                                    <div className="pr-field">
                                        <label><strong>Date</strong></label>
                                        <input type="text" className="pr-input" value={new Date(modalRequest.request_date).toLocaleDateString()} readOnly />
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label><strong>Employee ID</strong></label>
                                        <input type="text" className="pr-input" value={modalRequest.employee_id} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label><strong>Name</strong></label>
                                        <input type="text" className="pr-input" value={modalRequest.name} readOnly />
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label><strong>Branch</strong></label>
                                        <input type="text" className="pr-input" value={modalRequest.branch} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label><strong>Department</strong></label>
                                        <input type="text" className="pr-input" value={modalRequest.department} readOnly />
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label><strong>Date Needed</strong></label>
                                        <input type="text" className="pr-input" value={new Date(modalRequest.date_needed).toLocaleDateString()} readOnly />
                                    </div>
                                    <div className="pr-field">
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label><strong>Description of Work Required</strong></label>
                                        <textarea
                                            value={modalRequest.work_description}
                                            className="car-textarea pr-input"
                                            rows={4}
                                            readOnly
                                        />
                                    </div>
                                </div>

                                 <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label><strong>Asset Tag / Code (if Applicable)</strong></label>
                                        <input type="text" className="pr-input" value={modalRequest.asset_tag} readOnly />
                                    </div>
                                </div>
                            </section>
                            <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                                <section className="pr-form-section" id="details">
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <small style={{background: '#000', padding: '.5rem', color: '#fff'}}>Completion Information</small>
                                        </div>
                                        <div className="pr-field">
                                        </div>
                                    </div>
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label><strong>Performed By</strong></label>
                                            <input
                                                type="text"
                                                name="performed_by"
                                                className="pr-input"
                                                value={modalRequest.performed_by || ""}
                                                onChange={(e) =>
                                                    setModalRequest({ ...modalRequest, performed_by: e.target.value })
                                                }
                                                required={isAccomplish}
                                            />
                                        </div>
                                        <div className="pr-field">
                                            <label><strong>Date Completed</strong></label>
                                            <input
                                                type="date"
                                                name="date_completed"
                                                className="pr-input"
                                                value={
                                                    modalRequest.date_completed
                                                    ? new Date(modalRequest.date_completed).toISOString().split("T")[0]
                                                    : new Date().toISOString().split("T")[0]
                                                }
                                                onChange={(e) =>
                                                    setModalRequest({ ...modalRequest, date_completed: e.target.value })
                                                }
                                                required={isAccomplish}
                                            />
                                        </div>
                                    </div>
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label><strong>Remarks</strong></label>
                                            <textarea
                                                name="remarks"
                                                className="car-textarea pr-input"
                                                rows={4}
                                                value={modalRequest.remarks || ""}
                                                onChange={(e) =>
                                                    setModalRequest({ ...modalRequest, remarks: e.target.value })
                                                }
                                                required={isAccomplish}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="pr-form-section" id="details">
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label><strong>Requested by</strong></label>
                                            <input type="text" className="car-input" value={modalRequest.requested_by} required readOnly/>
                                        </div>

                                        <div className="pr-field receive-signature">
                                            <label><strong>Signature</strong></label>
                                            <input type="text" className="car-input received-signature" value={modalRequest.request_signature}  readOnly />
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
                                            <label><strong>Approved by</strong></label>
                                            <input type="text" className="car-input" value={modalRequest.approved_by} required readOnly/>
                                        </div>

                                        <div className="pr-field receive-signature">
                                            <label><strong>Signature</strong></label>
                                            <input type="text" className="car-input received-signature" value={modalRequest.approved_signature}  readOnly />
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
                                            <label><strong>Accomplished by</strong></label>
                                            <input
                                                type="text"
                                                name="accomplished_by"
                                                value={userData.name || ""}
                                                className="car-input"
                                                readOnly
                                            />
                                        </div>

                                        <div className="pr-field receive-signature">
                                            <label><strong>Signature</strong></label>
                                            <input
                                                type="text"
                                                name="accomplished_signature"
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
                                    <div className="footer-modal">
                                        <button
                                            type="button"
                                            className="admin-success-btn"
                                            disabled={isAccomplishing}
                                            onClick={async () => {

                                                setIsAccomplish(true);

                                                if (!modalRequest.performed_by?.trim()) {
                                                    alert("Performed By is required.");
                                                    return;
                                                }

                                                if (!modalRequest.remarks?.trim()) {
                                                    alert("Remarks is required.");
                                                    return;
                                                }

                                                const form = document.querySelector(".request-footer-form");
                                                if (!form.checkValidity()) {
                                                    form.reportValidity();
                                                    return;
                                                }

                                                setIsApproving(true);

                                                const formData = new FormData(form);
                                                formData.append("mrr_request_code", modalRequest.mrr_request_code);
                                                // formData.append("performed_by", modalRequest.performed_by);
                                                // formData.append("date_completed", modalRequest.date_completed);
                                                // formData.append("remarks", modalRequest.remarks);
                                                // formData.append("accomplished_by", userData.name);
                                                // formData.append("accomplished_signature", userData.signature);
                                                formData.append("status", "Accomplished");

                                                setShowLoadingModal(true);

                                                try {
                                                    const response = await fetch(
                                                        `${API_BASE_URL}/api/update_maintenance_repair_request_accomplish`,
                                                        {
                                                            method: "PUT",
                                                            body: formData,
                                                        }
                                                    );

                                                    if (!response.ok) throw new Error("Failed to accomplished request");

                                                    setStatus({
                                                        type: "info",
                                                        message: "Maintenance / Repair Request Accomplished Successfully.",
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
                                            {isApproving ? "Accomplishing..." : "✅ Accomplish"}
                                        </button>
                                    </div>
                                </section>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default MaintenanceRepair;
