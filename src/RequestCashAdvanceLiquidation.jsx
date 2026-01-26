import { useEffect, useMemo, useState } from "react";
import "./styles/RequestLiquidation.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

function CALiquidation() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalRequest, setModalRequest] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [isEndorsing, setIsApproving] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);
    const [declineReason, setDeclineReason] = useState("");

        const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/cash_advance_liquidation`);
            if (!response.ok) throw new Error("Failed to fetch cash advance liquidation request");
            const data = await response.json();

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
            "cal_request_code",
            "request_date",
            "employee_id",
            "name",
            "branch",
            "department",
            "prepared_by",
            "endorsed_by",
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

    const hasSignature = Boolean(userData.signature && userData.signature.trim());
    
    return (
        <div className="admin-view">
            <div className="admin-toolbar">
                <div className="admin-toolbar-title">
                <h2>Cash Advance Liquidation</h2>
                <p>View and manage all cash advance liquidation in the system.</p>
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

            {userRole?.toLowerCase() === "endorse" && userAccess?.includes("Cash Advance Liquidation") && (
                <div className="admin-table-wrapper">
                    <table className="admin-table purchase-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: "center" }}>Ref. No.</th>
                                <th style={{ textAlign: "center" }}>Date Request</th>
                                <th style={{ textAlign: "center" }}>Cash Advance No.</th>
                                <th className="text-left">Prepared by</th>
                                {/* <th style={{ textAlign: "center" }}>Status</th> */}
                                <th style={{ textAlign: "center" }}>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="admin-empty-state">
                                        Loading cash advance liquidation...
                                    </td>
                                </tr>
                            ) : visibleRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="admin-empty-state">
                                        {search
                                            ? "No requests match your search."
                                            : "No cash advance liquidation requests found."}
                                    </td>
                                </tr>
                            ) : (
                                visibleRequests.map((req) => (
                                    <tr key={req.id}>
                                        <td style={{ textAlign: "center" }}>{req.cal_request_code}</td>
                                        <td style={{ textAlign: "center" }}>
                                            {new Date(req.request_date).toLocaleDateString()}
                                        </td>
                                        <td style={{ textAlign: "center" }}>{req.cash_advance_no}</td>
                                        <td className="text-left">{req.prepared_by}</td>
                                        {/* <td style={{ textAlign: "center" }}>{req.status.toUpperCase()}</td> */}
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

             {userRole?.toLowerCase() === "approve" && userAccess?.includes("Cash Advance Liquidation") && (
                <div className="admin-table-wrapper">
                    <table className="admin-table purchase-table">
                        <thead>
                            <tr>
                                <th className="text-center">Ref. No.</th>
                                <th className="text-center">Date Request</th>
                                <th className="text-center">Cash Advance No.</th>
                                <th className="text-left">Prepared by</th>
                                <th className="text-left">Endorsed by</th>
                                <th className="text-center">Status</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="admin-empty-state">
                                        Loading cash advance liquidation...
                                    </td>
                                </tr>
                            ) : endorsedRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="admin-empty-state">
                                        {search
                                            ? "No requests match your search."
                                            : "No cash advance liquidation requests found."}
                                    </td>
                                </tr>
                            ) : (
                                endorsedRequests.map((req) => (
                                    <tr key={req.id}>
                                        <td className="text-center">{req.cal_request_code}</td>
                                        <td className="text-center">
                                            {new Date(req.request_date).toLocaleDateString()}
                                        </td>
                                        <td className="text-center">{req.cash_advance_no}</td>
                                        <td className="text-left">{req.prepared_by}</td>
                                        <td className="text-left">{req.endorsed_by}</td>
                                        <td className="text-center">{req.status.toUpperCase()}</td>
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

                            <h2><small>Reference Number - </small><small style={{textDecoration: 'underline', color: '#305ab5ff'}}>{modalRequest.cal_request_code}</small></h2>
                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Date</label>
                                        <input type="text" className="pr-input" value={new Date(modalRequest.request_date).toLocaleDateString()} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Cash Advance No</label>
                                        <input type="text" className="pr-input" value={modalRequest.cash_advance_no} readOnly />
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Employee ID</label>
                                        <input type="text" className="pr-input" value={modalRequest.employee_id} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Name</label>
                                        <input type="text" className="pr-input" value={modalRequest.name} readOnly />
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
                            </section>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Check / PCV No.</label>
                                        <input type="text" className="pr-input" value={modalRequest.check_pcv_no} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Cut-off Date</label>
                                        <input type="text" className="pr-input" value={new Date(modalRequest.cutoff_date).toLocaleDateString()} readOnly />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Nature of activity</label>
                                        <input type="text" className="pr-input" value={modalRequest.nature_activity} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Inclusive Date(s)</label>
                                        <input type="text" className="pr-input" value={`${new Date(modalRequest.inclusive_date_from).toLocaleDateString()} - ${new Date(modalRequest.inclusive_date_to).toLocaleDateString()}`} readOnly />
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">
                                <table className="request-items-table">
                                    <thead>
                                        <tr>
                                            <th className="text-center">TRANSACTION DATE</th>
                                            <th className="text-center">DESCRIPTION</th>
                                            <th className="text-center">OR NO.</th>
                                            <th className="text-center">AMOUNT</th>
                                            <th className="text-center">Expense Charges</th>
                                            <th className="text-center">STORE/BRANCH</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    {modalRequest.items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="text-center">{item.transaction_date}</td>
                                            <td className="text-center">{item.description}</td>
                                            <td className="text-center">{item.or_no}</td>
                                            <td className="text-center">{item.amount
                                                    ? Number(item.amount).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"}
                                            </td>
                                            <td className="text-center">{item.exp_charges
                                                    ? Number(item.exp_charges).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"}
                                            </td>
                                            <td className="text-center">{item.store_branch}</td>
                                        </tr>
        
                                    ))}
                                    <tr>
                                        <td colSpan={3} className="text-center pr-label">Total Expenses</td>
                                        <td className="text-center pr-label">{modalRequest.total_expense
                                                ? Number(modalRequest.total_expense).toLocaleString("en-PH", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })
                                            : "0.00"}
                                        </td>
                                        <td colSpan={3}></td>
                                    </tr>
                                    </tbody>
                                </table>
                            </section>

                            <section className="pr-form-section" id="details">
                                <table className="request-items-table">
                                    <thead>
                                        <tr>
                                            <th className="text-center">BUDGETED</th>
                                            <th className="text-center">ACTUAL</th>
                                            <th className="text-center">DIFFERENCE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="text-center">{modalRequest.budgeted}</td>
                                            <td className="text-center">{modalRequest.actual}</td>
                                            <td className="text-center">{modalRequest.difference}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </section>

                            <section className="pr-form-section">
                                <div className="pr-flex-container">
                                    <div className="pr-section">
                                        <h2 className="pr-section-title">When Budgeted Exceeds Actual</h2>
                                        <div>
                                        <span>Deposit of Excess</span>
                                        <input
                                            value={modalRequest.excess_deposit || ""}
                                            readOnly
                                        />
                                        </div>
                                        <div>
                                        <span>Date</span>
                                        <input
                                            value={new Date(modalRequest.date_excess).toLocaleDateString()}
                                            readOnly
                                        />
                                        </div>
                                        <div>
                                        <span>Acknowledgement Receipt No.</span>
                                        <input
                                            value={modalRequest.ack_rcpt_no || ""}
                                            readOnly
                                        />
                                        </div>
                                        <div>
                                            <span>Amount</span>
                                            <input
                                            value={modalRequest.exceed_amount
                                                    ? Number(modalRequest.exceed_amount).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"}
                                            readOnly
                                            />
                                        </div>
                                    </div>
                                    <div className="pr-section" >
                                        <h2 className="pr-section-title">When Actual Exceeds Budgeted</h2>
                                        <div>
                                            <span>Reimbursable Amount</span>
                                            <input
                                            value={modalRequest.rb_amount
                                                    ? Number(modalRequest.rb_amount).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"}
                                            readOnly
                                            />
                                        </div>
                                        </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">
                                <form className="request-footer-form" onSubmit={(e) => e.preventDefault()}>
                                    <div className="pr-grid-two">
                                        <div className="pr-field">
                                            <label><strong>Endorse by</strong></label>
                                            <input
                                                type="text"
                                                name="endorsed_by"
                                                value={userData.name || ""}
                                                className="car-input"
                                                readOnly
                                                />
                                        </div>

                                        <div className="pr-field receive-signature">
                                            <label><strong>Signature</strong></label>
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
                                                <p>No signature available</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="footer-modal">
                                        <button
                                            type="button"
                                            className="admin-success-btn"
                                            disabled={isEndorsing}
                                            onClick={async () => {
                                            setIsApproving(true);
                                            const form = document.querySelector(".request-footer-form");
                                            const formData = new FormData(form);

                                            formData.append("cal_request_code", modalRequest.cal_request_code);
                                            formData.append("status", "Endorsed");

                                            setShowLoadingModal(true);

                                            try {
                                                const response = await fetch(`${API_BASE_URL}/api/update_cash_advance_liquidation`, {
                                                method: "PUT",
                                                body: formData,
                                                });

                                                if (!response.ok) throw new Error("Failed to endorse request");

                                                setStatus({
                                                type: "info",
                                                message: "CA Liquidation Endorse Successfully.",
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
                                        <div className={`confirm-modal-overlay-cal ${isClosing ? "fade-out" : ""}`}>
                                            <div className="admin-modal-backdrop">
                                                <div
                                                    className="admin-modal-panel-liquidation"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <h3>Confirm Decline</h3>
                                                    <p>Please provide a reason for declining this cash advance liquidation:</p>

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
                                                                "cal_request_code",
                                                                modalRequest.cal_request_code
                                                                );
                                                                formData.append("status", "Declined");
                                                                formData.append("declined_reason", declineReason.trim());

                                                                setShowLoadingModal(true);

                                                                try {
                                                                const response = await fetch(
                                                                    `${API_BASE_URL}/api/update_cash_advance_liquidation`,
                                                                    {
                                                                    method: "PUT",
                                                                    body: formData,
                                                                    }
                                                                );

                                                                if (!response.ok)
                                                                    throw new Error("Failed to decline request");

                                                                setStatus({
                                                                    type: "info",
                                                                    message: "CA Liquidation Declined Successfully.",
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

                            <h2><small>Reference Number - </small><small style={{textDecoration: 'underline', color: '#305ab5ff'}}>{modalRequest.cal_request_code}</small></h2>
                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Date</label>
                                        <input type="text" className="pr-input" value={new Date(modalRequest.request_date).toLocaleDateString()} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Cash Advance No</label>
                                        <input type="text" className="pr-input" value={modalRequest.cash_advance_no} readOnly />
                                    </div>
                                </div>
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Employee ID</label>
                                        <input type="text" className="pr-input" value={modalRequest.employee_id} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Name</label>
                                        <input type="text" className="pr-input" value={modalRequest.name} readOnly />
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
                            </section>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Check / PCV No.</label>
                                        <input type="text" className="pr-input" value={modalRequest.check_pcv_no} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Cut-off Date</label>
                                        <input type="text" className="pr-input" value={new Date(modalRequest.cutoff_date).toLocaleDateString()} readOnly />
                                    </div>
                                </div>

                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label className="pr-label">Nature of activity</label>
                                        <input type="text" className="pr-input" value={modalRequest.nature_activity} readOnly />
                                    </div>
                                    <div className="pr-field">
                                        <label className="pr-label">Inclusive Date(s)</label>
                                        <input type="text" className="pr-input" value={`${new Date(modalRequest.inclusive_date_from).toLocaleDateString()} - ${new Date(modalRequest.inclusive_date_to).toLocaleDateString()}`} readOnly />
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">
                                <table className="request-items-table">
                                    <thead>
                                        <tr>
                                            <th className="text-center">TRANSACTION DATE</th>
                                            <th className="text-center">DESCRIPTION</th>
                                            <th className="text-center">OR NO.</th>
                                            <th className="text-center">AMOUNT</th>
                                            <th className="text-center">Expense Charges</th>
                                            <th className="text-center">STORE/BRANCH</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    {modalRequest.items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="text-center">{item.transaction_date}</td>
                                            <td className="text-center">{item.description}</td>
                                            <td className="text-center">{item.or_no}</td>
                                            <td className="text-center">{item.amount
                                                    ? Number(item.amount).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"}
                                            </td>
                                            <td className="text-center">{item.exp_charges
                                                    ? Number(item.exp_charges).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"}
                                            </td>
                                            <td className="text-center">{item.store_branch}</td>
                                        </tr>
        
                                    ))}
                                    <tr>
                                        <td colSpan={3} className="text-center pr-label">Total Expenses</td>
                                        <td className="text-center pr-label">{modalRequest.total_expense
                                                ? Number(modalRequest.total_expense).toLocaleString("en-PH", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })
                                            : "0.00"}
                                        </td>
                                        <td colSpan={3}></td>
                                    </tr>
                                    </tbody>
                                </table>
                            </section>

                            <section className="pr-form-section" id="details">
                                <table className="request-items-table">
                                    <thead>
                                        <tr>
                                            <th className="text-center">BUDGETED</th>
                                            <th className="text-center">ACTUAL</th>
                                            <th className="text-center">DIFFERENCE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="text-center">{modalRequest.budgeted}</td>
                                            <td className="text-center">{modalRequest.actual}</td>
                                            <td className="text-center">{modalRequest.difference}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </section>

                            <section className="pr-form-section">
                                <div className="pr-flex-container">
                                    <div className="pr-section">
                                        <h2 className="pr-section-title">When Budgeted Exceeds Actual</h2>
                                        <div>
                                        <span>Deposit of Excess</span>
                                        <input
                                            value={modalRequest.excess_deposit || ""}
                                            readOnly
                                        />
                                        </div>
                                        <div>
                                        <span>Date</span>
                                        <input
                                            value={new Date(modalRequest.date_excess).toLocaleDateString()}
                                            readOnly
                                        />
                                        </div>
                                        <div>
                                        <span>Acknowledgement Receipt No.</span>
                                        <input
                                            value={modalRequest.ack_rcpt_no || ""}
                                            readOnly
                                        />
                                        </div>
                                        <div>
                                            <span>Amount</span>
                                            <input
                                            value={modalRequest.exceed_amount
                                                    ? Number(modalRequest.exceed_amount).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"}
                                            readOnly
                                            />
                                        </div>
                                    </div>
                                    <div className="pr-section" >
                                        <h2 className="pr-section-title">When Actual Exceeds Budgeted</h2>
                                        <div>
                                            <span>Reimbursable Amount</span>
                                            <input
                                            value={modalRequest.rb_amount
                                                    ? Number(modalRequest.rb_amount).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })
                                                : "0.00"}
                                            readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="pr-form-section" id="details">
                                <div className="pr-grid-two">
                                    <div className="pr-field">
                                        <label><strong>Endorsed by</strong></label>
                                        <input type="text" className="car-input" value={modalRequest.endorsed_by} required readOnly/>
                                    </div>

                                    <div className="pr-field receive-signature">
                                        <label><strong>Signature</strong></label>
                                        <input type="text" name="endorsed_signature" className="car-input received-signature" value={modalRequest.endorsed_signature}  readOnly />
                                        {modalRequest.endorsed_signature ? (
                                            <img
                                            src={`${API_BASE_URL}/uploads/signatures/${modalRequest.endorsed_signature}`}
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
                                            <label><strong>Approve by</strong></label>
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
                                    <div className="footer-modal">
                                        <button
                                            type="button"
                                            className="admin-success-btn"
                                            disabled={isEndorsing}
                                            onClick={async () => {
                                            setIsApproving(true);
                                            const form = document.querySelector(".request-footer-form");
                                            const formData = new FormData(form);

                                            formData.append("cal_request_code", modalRequest.cal_request_code);
                                            formData.append("status", "Approved");

                                            setShowLoadingModal(true);

                                            try {
                                                const response = await fetch(`${API_BASE_URL}/api/update_cash_advance_liquidation_approving`, {
                                                method: "PUT",
                                                body: formData,
                                                });

                                                if (!response.ok) throw new Error("Failed to approve request");

                                                setStatus({
                                                type: "info",
                                                message: "CA Liquidation Approve Successfully.",
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
                                            {isEndorsing ? "Approving..." : "✅ Approve"}
                                        </button>
                                    </div>
                                </form>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default CALiquidation;
