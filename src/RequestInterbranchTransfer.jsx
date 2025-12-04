import { useEffect, useMemo, useState } from "react";
import "./styles/AdminView.css";
import "./styles/RequestPurchase.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

function RequestInterbranchTransfer() {
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
            const response = await fetch(`${API_BASE_URL}/api/interbranch_transfer`);
            if (!response.ok) throw new Error("Failed to fetch interbranch transfer requests");
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
            "its_request_code",
            "branch_from",
            "branch_to",
            "department",
            "purpose",
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
        setModalType("pr");
        setModalOpen(true);
    };

    const openModalApproved = (request) => {
        setModalRequest(request);
        setModalType("appr"); 
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

    const handleCloseModalApproved = () => {
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
                <h2>Interbranch Transfer Slip</h2>
                <p>View and manage all interbranh transfer requests in the system.</p>
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

            {userRole?.toLowerCase() === "approve" && userAccess?.includes("Interbranch Transfer Slip") && (
                <div className="admin-table-wrapper">
                    <table className="admin-table purchase-table">
                    <thead>
                        <tr>
                        <th style={{ textAlign: "center" }}>Ref. No.</th>
                        <th style={{ textAlign: "center" }}>Date Request</th>
                        <th style={{ textAlign: "left" }}>Branch</th>
                        <th style={{ textAlign: "left" }}>Prepared by</th>
                        {/* <th style={{ textAlign: "center" }}>Status</th> */}
                        <th style={{ textAlign: "center" }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                         {loading ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            Loading interbranch transfer requests...
                            </td>
                        </tr>
                        ) : visibleRequests.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            {search
                                ? "No requests match your search."
                                : "No interbranch transfer requests found."}
                            </td>
                        </tr>
                        ) : (
                        visibleRequests.map((req) => (
                            <tr key={req.id}>
                                <td style={{ textAlign: "center" }}>
                                    {req.its_request_code}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                    {new Date(req.request_date).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: "left" }}>{req.from_branch} - {req.to_branch}</td>
                                <td style={{ textAlign: "left" }}>{req.prepared_by}</td>
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

            {userRole?.toLowerCase() === "dispatch" && userAccess?.includes("Interbranch Transfer Slip") && (
                <div className="admin-table-wrapper">
                    <table className="admin-table purchase-table">
                    <thead>
                        <tr>
                        <th style={{ textAlign: "center" }}>Ref. No.</th>
                        <th style={{ textAlign: "center" }}>Date Request</th>
                        <th style={{ textAlign: "left" }}>Branch</th>
                        <th style={{ textAlign: "left" }}>Prepared by</th>
                        {/* <th style={{ textAlign: "center" }}>Status</th> */}
                        <th style={{ textAlign: "center" }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            Loading purchase requests...
                            </td>
                        </tr>
                        ) : approvedRequests.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="admin-empty-state">
                            {search
                                ? "No received requests match your search."
                                : "No received purchase requests found."}
                            </td>
                        </tr>
                        ) : (
                        approvedRequests.map((req) => (
                            <tr key={req.id}>
                                <td style={{ textAlign: "center" }}>
                                    {req.its_request_code}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                    {new Date(req.request_date).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: "left" }}>{req.from_branch} - {req.to_branch}</td>
                                <td style={{ textAlign: "left" }}>{req.prepared_by}</td>
                                {/* <td style={{ textAlign: "center" }}>
                                    {req.status.toUpperCase()}
                                </td> */}
                                <td style={{ textAlign: "center" }}>
                                    <button
                                    className="admin-primary-btn"
                                    onClick={() => openModalApproved(req)}
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

            {modalOpen && modalRequest && modalType === "pr" && (
                <div className={`modal-overlay ${isClosing ? "fade-out" : ""}`}>
                    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
                        <div className="admin-modal-panel request-modal">
                            <button
                                className="admin-close-btn"
                                onClick={handleCloseModal}
                                aria-label="Close"
                                >
                                ×
                            </button>

                            <h2><small className="ref-no">Reference Number - </small><small style={{textDecoration: 'underline', color: '#305ab5ff'}}>{modalRequest.its_request_code}</small></h2>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Date Transferred
                                        </label>
                                        <input
                                        value={new Date(modalRequest.date_transferred).toLocaleDateString()}
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
                                            FROM (Branch Name)
                                        </label>
                                        <input
                                        value={modalRequest.from_branch}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            TO (Branch Name)
                                        </label>
                                        <input
                                        value={modalRequest.to_branch}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Address
                                        </label>
                                        <input
                                        value={modalRequest.address_from}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Address
                                        </label>
                                        <input
                                        value={modalRequest.address_to}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Area Operations Controller
                                        </label>
                                        <input
                                            value={modalRequest.aoc}
                                            className="pr-input"
                                            readOnly
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">
                                <h3 className="pr-label">TRANSFER DETAILS</h3>
                                {modalRequest.items && modalRequest.items.length > 0 ? (
                                    <table className="request-items-table">
                                        <thead>
                                        <tr>
                                            <th><small>Item Code</small></th>
                                            <th><small>Item Description</small></th>
                                            <th className="text-center"><small>Quantity</small></th>
                                            <th className="text-center"><small>Unit of Measure</small></th>
                                            <th><small>Remarks</small></th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                            {modalRequest.items.map((item) => (
                                                <tr key={item.id}>
                                                    <td>{item.item_code}</td>
                                                    <td>{item.item_description}</td>
                                                    <td className="text-center">{item.quantity}</td>
                                                    <td className="text-center">{item.uom}</td>
                                                    <td>{item.remarks}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    ) : (
                                    <p>—</p>
                                )}
                            </section>

                            <section className="pr-form-section">
                                <h3 className="pr-label">MODE OF TRANSPORT</h3>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Vehicle Use
                                        </label>
                                        <input
                                        value={modalRequest.vehicle_use}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                   <div className="pr-field">
                                        {modalRequest.vehicle_use === "Other" && (
                                            <>
                                                <label className="pr-label" htmlFor="employeeID">
                                                    Specify if Others
                                                </label>
                                                <input
                                                    value={modalRequest.specify_if_others}
                                                    className="pr-input"
                                                    readOnly
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Vehicle No
                                        </label>
                                        <input
                                        value={modalRequest.vehicle_no}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Driver Name
                                        </label>
                                        <input
                                        value={modalRequest.driver_name}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Driver Contact No
                                        </label>
                                        <input
                                        value={modalRequest.driver_contact_no}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Expected Delivery Date
                                        </label>
                                        <input
                                        value={new Date(modalRequest.expected_delivery_date).toLocaleDateString()}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                </div>
                            </section>

                            <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                                <section className="pr-form-section" id="details">
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label className="pr-label">Approved by</label>
                                            <input
                                                type="text"
                                                name="approved_by"
                                                value={userData.name || ""}
                                                className="pr-input"
                                                readOnly
                                                />
                                        </div>

                                        <div className="pr-field receive-signature">
                                            <label className="pr-label">Signature</label>
                                            <input
                                                type="text"
                                                name="approved_signature"
                                                value={userData.signature || ""}
                                                className="pr-input received-signature"
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
                                </section>
                                
                                <div className="admin-modal-footer">
                                    <button
                                        type="button"
                                        className="admin-success-btn"
                                        disabled={isApproving}
                                        onClick={async () => {
                                        setIsApproving(true);
                                        const form = document.querySelector(".request-footer-form");
                                        const formData = new FormData(form);

                                        formData.append("its_request_code", modalRequest.its_request_code);
                                        formData.append("status", "Approved");

                                        setShowLoadingModal(true);

                                        try {
                                            const response = await fetch(`${API_BASE_URL}/api/update_interbranch_transfer_request`, {
                                            method: "PUT",
                                            body: formData,
                                            });

                                            if (!response.ok) throw new Error("Failed to approve request");

                                            setStatus({
                                            type: "info",
                                            message: "Interbranch transfer request approved successfully.",
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
                                    <div className={`modal-overlay ${isClosing ? "fade-out" : ""}`}>
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
                                                            "its_request_code",
                                                            modalRequest.its_request_code
                                                            );
                                                            formData.append("status", "Declined");
                                                            formData.append("declined_reason", declineReason.trim());

                                                            setShowLoadingModal(true);

                                                            try {
                                                            const response = await fetch(
                                                                `${API_BASE_URL}/api/update_interbranch_transfer_request`,
                                                                {
                                                                method: "PUT",
                                                                body: formData,
                                                                }
                                                            );

                                                            if (!response.ok)
                                                                throw new Error("Failed to decline request");

                                                            setStatus({
                                                                type: "info",
                                                                message: "Interbranch transfer request has been declined.",
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

            {modalOpen && modalRequest && modalType === "appr" && (
                <div className={`modal-overlay ${isClosing ? "fade-out" : ""}`}>
                    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
                        <div className="admin-modal-panel request-modal">
                            <button
                                className="admin-close-btn"
                                onClick={handleCloseModalApproved}
                                aria-label="Close"
                                >
                                ×
                            </button>

                            <h2><small className="ref-no">Reference Number - </small><small style={{textDecoration: 'underline', color: '#305ab5ff'}}>{modalRequest.its_request_code}</small></h2>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Date Transferred
                                        </label>
                                        <input
                                        value={new Date(modalRequest.date_transferred).toLocaleDateString()}
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
                                            FROM (Branch Name)
                                        </label>
                                        <input
                                        value={modalRequest.from_branch}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            TO (Branch Name)
                                        </label>
                                        <input
                                        value={modalRequest.to_branch}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Address
                                        </label>
                                        <input
                                        value={modalRequest.address_from}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Address
                                        </label>
                                        <input
                                        value={modalRequest.address_to}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Area Operations Controller
                                        </label>
                                        <input
                                            value={modalRequest.aoc}
                                            className="pr-input"
                                            readOnly
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">
                                <h3 className="pr-label">TRANSFER DETAILS</h3>
                                {modalRequest.items && modalRequest.items.length > 0 ? (
                                    <table className="request-items-table">
                                        <thead>
                                        <tr>
                                            <th><small>Item Code</small></th>
                                            <th><small>Item Description</small></th>
                                            <th className="text-center"><small>Quantity</small></th>
                                            <th className="text-center"><small>Unit of Measure</small></th>
                                            <th><small>Remarks</small></th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                            {modalRequest.items.map((item) => (
                                                <tr key={item.id}>
                                                    <td>{item.item_code}</td>
                                                    <td>{item.item_description}</td>
                                                    <td className="text-center">{item.quantity}</td>
                                                    <td className="text-center">{item.uom}</td>
                                                    <td>{item.remarks}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    ) : (
                                    <p>—</p>
                                )}
                            </section>

                            <section className="pr-form-section">
                                <h3 className="pr-label">MODE OF TRANSPORT</h3>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Vehicle Use
                                        </label>
                                        <input
                                        value={modalRequest.vehicle_use}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                   <div className="pr-field">
                                        {modalRequest.vehicle_use === "Other" && (
                                            <>
                                                <label className="pr-label" htmlFor="employeeID">
                                                    Specify if Others
                                                </label>
                                                <input
                                                    value={modalRequest.specify_if_others}
                                                    className="pr-input"
                                                    readOnly
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Vehicle No
                                        </label>
                                        <input
                                        value={modalRequest.vehicle_no}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Driver Name
                                        </label>
                                        <input
                                        value={modalRequest.driver_name}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Driver Contact No
                                        </label>
                                        <input
                                        value={modalRequest.driver_contact_no}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label" htmlFor="employeeID">
                                            Expected Delivery Date
                                        </label>
                                        <input
                                        value={new Date(modalRequest.expected_delivery_date).toLocaleDateString()}
                                        className="pr-input"
                                        readOnly
                                        />
                                    </div>
                                </div>
                            </section>

                            <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                                <section className="pr-form-section" id="details">
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label className="pr-label">Prepared by</label>
                                            <input 
                                                value={modalRequest.prepared_by} 
                                                className="pr-input"
                                                readOnly                                                   
                                            />
                                        </div>
                                        <div className="pr-field receive-signature">
                                            <label className="pr-label">Signature</label>
                                            <input
                                                value={modalRequest.prepared_signature || ""}
                                                className="pr-input received-signature"
                                                required
                                                readOnly
                                            />
                                                {modalRequest.prepared_signature ? (
                                                <img
                                                src={`${API_BASE_URL}/uploads/signatures/${modalRequest.prepared_signature}`}
                                                alt="Signature"
                                                className="img-sign"/>
                                                ) : (
                                                <p hidden>No signature available</p>
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
                                                value={modalRequest.approved_signature || ""}
                                                className="pr-input received-signature"
                                                required
                                                readOnly
                                            />
                                                {modalRequest.approved_signature ? (
                                                <img
                                                src={`${API_BASE_URL}/uploads/signatures/${modalRequest.approved_signature}`}
                                                alt="Signature"
                                                className="img-sign"/>
                                                ) : (
                                                <p hidden>No signature available</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label className="pr-label">Dispatched by</label>
                                            <input
                                                type="text"
                                                name="dispatched_by"
                                                value={userData.name || ""}
                                                className="pr-input"
                                                readOnly
                                                />
                                        </div>

                                        <div className="pr-field receive-signature">
                                            <label className="pr-label">Signature</label>
                                            <input
                                                type="text"
                                                name="dispatched_signature"
                                                value={userData.signature || ""}
                                                className="pr-input received-signature"
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
                                </section>
                                
                                <div className="admin-modal-footer">
                                    <button
                                        type="button"
                                        className="admin-success-btn"
                                        disabled={isApproving}
                                        onClick={async () => {
                                        setIsApproving(true);
                                        const form = document.querySelector(".request-footer-form");
                                        const formData = new FormData(form);

                                        formData.append("its_request_code", modalRequest.its_request_code);
                                        formData.append("status", "Dispatched");

                                        setShowLoadingModal(true);

                                        try {
                                            const response = await fetch(`${API_BASE_URL}/api/dispatch_interbranch_transfer_request`, {
                                            method: "PUT",
                                            body: formData,
                                            });

                                            if (!response.ok) throw new Error("Failed to approve request");

                                            setStatus({
                                            type: "info",
                                            message: "Interbranch transfer request has been dispatched.",
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
                                        {isApproving ? "Dispatching..." : "✅ Dispatch"}
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
                                    <div className={`modal-overlay ${isClosing ? "fade-out" : ""}`}>
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
                                                            "its_request_code",
                                                            modalRequest.its_request_code
                                                            );
                                                            formData.append("status", "Declined");
                                                            formData.append("declined_reason", declineReason.trim());

                                                            setShowLoadingModal(true);

                                                            try {
                                                            const response = await fetch(
                                                                `${API_BASE_URL}/api/update_interbranch_transfer_request`,
                                                                {
                                                                method: "PUT",
                                                                body: formData,
                                                                }
                                                            );

                                                            if (!response.ok)
                                                                throw new Error("Failed to decline request");

                                                            setStatus({
                                                                type: "info",
                                                                message: "Interbranch transfer request has been declined.",
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

                            {/* <form className="request-footer-form-accounting" onSubmit={(e) => e.preventDefault()}>
                                <section className="pr-form-section" id="details">
                                    <div className="accounting-only">
                                    <strong>ACCOUNTING DEPARTMENT USE ONLY</strong>
                                    </div>

                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label className="pr-label" htmlFor="date_ordered">Date ordered</label>
                                            <input
                                                type="date"
                                                name="date_ordered"
                                                className="pr-input"
                                                value={
                                                formData.date_ordered ||
                                                new Date().toISOString().split("T")[0] 
                                                }
                                                onChange={(e) =>
                                                setFormData({ ...formData, date_ordered: e.target.value })
                                                }
                                                required
                                            />
                                            <span className="error-message"></span>
                                        </div>

                                        <div className="pr-field">
                                            <label className="pr-label" htmlFor="po_number">PO Number</label>
                                            <input
                                                type="text"
                                                name="po_number"
                                                id="po_number"
                                                className="pr-input"
                                                value={formData.po_number || ""}
                                                onChange={(e) =>
                                                setFormData({ ...formData, po_number: e.target.value })
                                                }
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
                                        formDataToSend.append("its_request_code", modalRequest.its_request_code);
                                        formDataToSend.append("status", "Completed");
                                        setShowLoadingModal(true);

                                        try {
                                        const response = await fetch(`${API_BASE_URL}/api/update_purchase_request_accounting`, {
                                            method: "PUT",
                                            body: formDataToSend,
                                        });

                                        if (!response.ok) throw new Error("Failed to complete request");

                                        setStatus({
                                            type: "info",
                                            message: "Purchase request completed successfully.",
                                        });
                                        handleCloseModalApproved();
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
                            </form> */}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default RequestInterbranchTransfer;
