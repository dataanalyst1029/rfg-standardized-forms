import { useEffect, useMemo, useState } from "react";
import "./styles/RequestCashAdvance.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

function CashAdvanceRequest() {
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
    const [isCompleting, setIsCompleting] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);
    const [declineReason, setDeclineReason] = useState("");

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/cash_advance_request`);
            if (!response.ok) throw new Error("Failed to fetch cash advance budget requests");
            const data = await response.json();

            const sortedData = data.sort((a, b) =>
            b.ca_request_code.localeCompare(a.ca_request_code)
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
    const [formData, setFormData] = useState({ check: false });

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
            "ca_request_code",
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
        setModalType("ca");
        setModalOpen(true);
    };

    const openModalReceived = (request) => {
        setModalRequest(request);
        setModalType("received"); 
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

    const handleCloseModalReceived = () => {
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
                {userRole.toLowerCase() === "approve" && (
                    <div className="admin-toolbar-title">
                        <h2>Cash Advance Budget Requests</h2>
                        <p>View and manage all cash advance budget requests in the system.</p>
                    </div>
                )}

                {userRole.toLowerCase() === "accounting" && (
                    <div className="admin-toolbar-title">
                        <h2>Received Cash Advance Budget Requests</h2>
                        <p>View and manage all received cash advance budget requests in the system.</p>
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
                        <th style={{ textAlign: "left" }}>Employee ID</th>
                        <th style={{ textAlign: "left" }}>Name</th>
                        <th style={{ textAlign: "left" }}>Branch</th>
                        <th style={{ textAlign: "left" }}>Department</th>
                        <th style={{ textAlign: "left" }}>Nature of Activity</th>
                        <th style={{ textAlign: "center" }}>Status</th>
                        <th style={{ textAlign: "center" }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            Loading cash advance budget requests...
                            </td>
                        </tr>
                        ) : visibleRequests.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            {search
                                ? "No requests match your search."
                                : "No cash advance budget requests found."}
                            </td>
                        </tr>
                        ) : (
                        visibleRequests.map((req) => (
                            <tr key={req.id}>
                            <td style={{ textAlign: "center" }}>
                                {req.ca_request_code}
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
            )}
            {userRole.toLowerCase() === "accounting" && (
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
                        <th style={{ textAlign: "left" }}>Nature of Activity</th>
                        <th style={{ textAlign: "center" }}>Status</th>
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
                                : "No received cash advance budget requests found."}
                            </td>
                        </tr>
                        ) : (
                        receivedRequests.map((req) => (
                            <tr key={req.id}>
                            <td style={{ textAlign: "center" }}>
                                {req.ca_request_code}
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

            {modalOpen && modalRequest && modalType === "ca" && (
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

                            <h2>Cash Advance Budget Request - {modalRequest.ca_request_code}</h2>

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
                                            Nature of Activity
                                        </label>
                                        <input
                                        value={modalRequest.nature_activity}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Purpose
                                        </label>
                                        <textarea
                                        value={modalRequest.purpose}
                                        className="pr-input"
                                        rows={1}
                                        readOnly
                                        />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="inclusiveDates">
                                            Inclusive date(s)
                                        </label>
                                        <input
                                            type="text"
                                            id="inclusiveDates"
                                            className="pr-input"
                                            value={`${new Date(modalRequest.inclusive_date_from).toLocaleDateString()} - ${new Date(modalRequest.inclusive_date_to).toLocaleDateString()}`}
                                            readOnly
                                        />
                                    </div>

                                    <div className="pr-field">
                                        
                                    </div>
                                </div>
                            </section>

                            {modalRequest.items && modalRequest.items.length > 0 ? (
                            <table className="request-items-table">
                                <thead>
                                <tr>
                                    <th className="text-center">DESCRIPTION</th>
                                    <th className="text-center">AMOUNT</th>
                                    <th className="text-center">EXPENSE CATEGORY</th>
                                    <th className="text-center">STORE / BRANCH</th>
                                    <th>REMARKS</th>
                                </tr>
                                </thead>
                                <tbody>
                                {modalRequest.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="text-center">{item.description}</td>
                                        <td className="text-center">{item.amount}</td>
                                        <td className="text-center">{item.exp_cat}</td>
                                        <td className="text-center">{item.store_branch}</td>
                                        <td>{item.remarks}</td>
                                    </tr>
    
                                ))}
                                <tr>
                                    <td className="text-center">Grand Total</td>
                                    <td className="text-center">{modalRequest.total_amount
                                            ? Number(modalRequest.total_amount).toLocaleString("en-PH", {
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

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="car-reference-value">Requested by:</label>
                                        <input type="text" name="requested_by" className="car-input" value={modalRequest.requested_by} required readOnly/>
                                    </div>

                                    <div className="pr-field receive-signature">
                                        <label className="car-reference-value">Signature</label>
                                        <input type="text" name="request_signature" className="car-input received-signature" value={modalRequest.request_signature}  readOnly />
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
                                

                                {/* <div className="submit-content">
                                <div className="submit-by-content">
                                    <div>
                                    <span>{modalRequest.requested_by}</span>
                                    <p>Requested by</p>
                                    </div>

                                    <div className="signature-content">
                                    <input className="submit-sign" type="text" value={modalRequest.request_signature} readOnly />
                                    {modalRequest.request_signature ? (
                                        <>
                                        <img
                                            src={`${API_BASE_URL}/uploads/signatures/${modalRequest.request_signature}`}
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
                                </div> */}

                                <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label className="car-reference-value">Approved by:</label>
                                            <input
                                                type="text"
                                                name="approved_by"
                                                value={userData.name || ""}
                                                className="car-input"
                                                readOnly
                                                />
                                        </div>

                                        <div className="pr-field receive-signature">
                                            <label className="car-reference-value">Signature</label>
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
                                <div className="footer-modal">
                                    <button
                                        type="button"
                                        className="admin-success-btn"
                                        disabled={isApproving}
                                        onClick={async () => {
                                        setIsApproving(true);
                                        const form = document.querySelector(".request-footer-form");
                                        const formData = new FormData(form);

                                        formData.append("ca_request_code", modalRequest.ca_request_code);
                                        formData.append("status", "Approved");

                                        setShowLoadingModal(true);

                                        try {
                                            const response = await fetch(`${API_BASE_URL}/api/update_cash_advance_request`, {
                                            method: "PUT",
                                            body: formData,
                                            });

                                            if (!response.ok) throw new Error("Failed to approve request");

                                            setStatus({
                                            type: "info",
                                            message: "Cash advance budget request approved successfully.",
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
                                                            "ca_request_code",
                                                            modalRequest.ca_request_code
                                                            );
                                                            formData.append("status", "Declined");
                                                            formData.append("declined_reason", declineReason.trim());

                                                            setShowLoadingModal(true);

                                                            try {
                                                            const response = await fetch(
                                                                `${API_BASE_URL}/api/update_cash_advance_request`,
                                                                {
                                                                method: "PUT",
                                                                body: formData,
                                                                }
                                                            );

                                                            if (!response.ok)
                                                                throw new Error("Failed to decline request");

                                                            setStatus({
                                                                type: "info",
                                                                message: "Cash advance budget request declined successfully.",
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

            {/* Accounting Dept */}
            {modalOpen && modalRequest && modalType === "received" && (
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

                            <h2>Cash Advance Budget Request - {modalRequest.ca_request_code}</h2>

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
                                            Nature of Activity
                                        </label>
                                        <input
                                        value={modalRequest.nature_activity}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Purpose
                                        </label>
                                        <textarea
                                        value={modalRequest.purpose}
                                        className="pr-input"
                                        rows={1}
                                        readOnly
                                        />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="inclusiveDates">
                                            Inclusive date(s)
                                        </label>
                                        <input
                                            type="text"
                                            id="inclusiveDates"
                                            className="pr-input"
                                            value={`${new Date(modalRequest.inclusive_date_from).toLocaleDateString()} - ${new Date(modalRequest.inclusive_date_to).toLocaleDateString()}`}
                                            readOnly
                                        />
                                    </div>

                                    <div className="pr-field">
                                        
                                    </div>
                                </div>
                            </section>

                            {modalRequest.items && modalRequest.items.length > 0 ? (
                            <table className="request-items-table">
                                <thead>
                                <tr>
                                    <th className="text-center">DESCRIPTION</th>
                                    <th className="text-center">AMOUNT</th>
                                    <th className="text-center">EXPENSE CATEGORY</th>
                                    <th className="text-center">STORE / BRANCH</th>
                                    <th>REMARKS</th>
                                </tr>
                                </thead>
                                <tbody>
                                {modalRequest.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="text-center">{item.description}</td>
                                        <td className="text-center">{item.amount}</td>
                                        <td className="text-center">{item.exp_cat}</td>
                                        <td className="text-center">{item.store_branch}</td>
                                        <td>{item.remarks}</td>
                                    </tr>
    
                                ))}
                                <tr>
                                    <td className="text-center">Grand Total</td>
                                    <td className="text-center">{modalRequest.total_amount
                                            ? Number(modalRequest.total_amount).toLocaleString("en-PH", {
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

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="car-reference-value">Requested by:</label>
                                        <input type="text" name="requested_by" className="car-input" value={modalRequest.requested_by} required readOnly/>
                                    </div>

                                    <div className="pr-field receive-signature">
                                        <label className="car-reference-value">Signature</label>
                                        <input type="text" name="request_signature" className="car-input received-signature" value={modalRequest.request_signature}  readOnly />
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
                                        <label className="car-reference-value">Approved by:</label>
                                        <input type="text" name="approved_by" className="car-input" value={modalRequest.approved_by} required readOnly/>
                                    </div>

                                    <div className="pr-field receive-signature">
                                        <label className="car-reference-value">Signature</label>
                                        <input type="text" name="approve_signature" className="car-input received-signature" value={modalRequest.approve_signature}  readOnly />
                                        {modalRequest.approve_signature ? (
                                            <img
                                            src={`${API_BASE_URL}/uploads/signatures/${modalRequest.approve_signature}`}
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
                                

                                {/* <div className="submit-content">
                                <div className="submit-by-content">
                                    <div>
                                    <span>{modalRequest.requested_by}</span>
                                    <p>Requested by</p>
                                    </div>

                                    <div className="signature-content">
                                    <input className="submit-sign" type="text" value={modalRequest.request_signature} readOnly />
                                    {modalRequest.request_signature ? (
                                        <>
                                        <img
                                            src={`${API_BASE_URL}/uploads/signatures/${modalRequest.request_signature}`}
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
                                </div> */}
                            </section>

                            <form className="request-footer-form-accounting" onSubmit={(e) => e.preventDefault()}>
                                <section className="pr-form-section" id="details">
                                    <div className="accounting-only">
                                    <strong>ACCOUNTING DEPARTMENT USE ONLY</strong>
                                    </div>

                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label className="pr-label" htmlFor="check">Check**</label>
                                            <input
                                            type="checkbox"
                                            name="check"
                                            id="check"
                                            className="checkbox"
                                            value={true}
                                            checked={formData.check}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                setFormData({
                                                ...formData,
                                                check: isChecked,
                                                check_no: isChecked ? formData.check_no : "",
                                                });
                                            }}
                                            />
                                            <span className="error-message"></span>
                                        </div>

                                        <div className="pr-field">
                                            {formData.check && (
                                                <div className="pr-field">
                                                <label className="pr-label" htmlFor="check_no">Check Number</label>
                                                <input
                                                    type="text"
                                                    name="check_no"
                                                    id="check_no"
                                                    className="pr-input"
                                                    value={formData.check_no || ""}
                                                    onChange={(e) =>
                                                    setFormData({ ...formData, check_no: e.target.value })
                                                    }
                                                    required
                                                />
                                                <span className="error-message"></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                                <label className="pr-label" htmlFor="voucher_petty_cash">Petty Cash Voucher</label>
                                                <input
                                                type="checkbox"
                                                name="voucher_petty_cash"
                                                id="voucher_petty_cash"
                                                className="checkbox"
                                                value={true}
                                                checked={formData.voucher_petty_cash}
                                                onChange={(e) => {
                                                    const isChecked = e.target.checked;
                                                    setFormData({
                                                    ...formData,
                                                    voucher_petty_cash: isChecked,
                                                    bank_gl_code: isChecked ? formData.bank_gl_code : "", 
                                                    });
                                                }}
                                                required
                                            />
                                            <span className="error-message"></span>
                                        </div>

                                        <div className="pr-field">
                                            {formData.voucher_petty_cash && (
                                                <div className="pr-field">
                                                    <label className="pr-label" htmlFor="bank_gl_code">Bank G/L Code</label>
                                                    <input
                                                        type="text"
                                                        name="bank_gl_code"
                                                        id="bank_gl_code"
                                                        className="pr-input"
                                                        value={formData.bank_gl_code || ""}
                                                        onChange={(e) =>
                                                        setFormData({ ...formData, bank_gl_code: e.target.value })
                                                        }
                                                        required
                                                    />
                                                    <span className="error-message"></span>
                                                </div>
                                            )}
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
                                        const errorMessages = form.querySelectorAll(".error-message");
                                        errorMessages.forEach(el => (el.textContent = ""));
                                        form.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"));

                                        let valid = true;

                                        if (formData.check && !formData.check_no?.trim()) {
                                        valid = false;
                                        const checkNoInput = form.querySelector("#check_no");
                                        checkNoInput.classList.add("input-error");
                                        checkNoInput.nextElementSibling.textContent = "Required field";
                                        }

                                        if (formData.voucher_petty_cash && !formData.bank_gl_code?.trim()) {
                                        valid = false;
                                        const bankGLInput = form.querySelector("#bank_gl_code");
                                        bankGLInput.classList.add("input-error");
                                        bankGLInput.nextElementSibling.textContent = "Required field";
                                        }

                                        if (!valid) {
                                        setIsCompleting(false);
                                        return;
                                        }

                                        const formDataToSend = new FormData(form);
                                        formDataToSend.append("ca_request_code", modalRequest.ca_request_code);
                                        formDataToSend.append("status", "Completed");
                                        setShowLoadingModal(true);

                                        try {
                                        const response = await fetch(`${API_BASE_URL}/api/update_cash_advance_budget_request_accounting`, {
                                            method: "PUT",
                                            body: formDataToSend,
                                        });

                                        if (!response.ok) throw new Error("Failed to complete request");

                                        setStatus({
                                            type: "info",
                                            message: "Cash advance budget request completed successfully.",
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
export default CashAdvanceRequest;
