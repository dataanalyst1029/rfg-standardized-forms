import { useEffect, useMemo, useState } from "react";
import "./styles/AdminView.css";
import "./styles/RequestPurchase.css";
import { API_BASE_URL } from "./config/api.js";

const PAGE_SIZES = [5, 10, 20];

function RequestPurchase() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalRequest, setModalRequest] = useState(null);
    

    const fetchRequests = async () => {
        setLoading(true);
        try {
        const response = await fetch(`${API_BASE_URL}/api/purchase_request`);
        if (!response.ok) throw new Error("Failed to fetch purchase requests");
        const data = await response.json();

        const sortedData = data.sort((a, b) =>
            b.purchase_request_code.localeCompare(a.purchase_request_code)
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
        if (!status) return undefined;
        const timeout = setTimeout(() => setStatus(null), 4000);
        return () => clearTimeout(timeout);
    }, [status]);

    useEffect(() => {
        setPage(1);
    }, [search, rowsPerPage]);

    const filteredRequests = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return requests;
        return requests.filter((req) =>
            [
            "purchase_request_code",
            "request_by",
            "branch",
            "department",
            "purpose",
            "status",
            ].some((key) => req[key]?.toString().toLowerCase().includes(term))
        );
    }, [requests, search]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredRequests.length / rowsPerPage) || 1
    );

    const visibleRequests = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    
    // Filter for Pending only
    const pendingRequests = filteredRequests.filter(
        (req) => req.status?.toLowerCase() === "pending"
    );

    return pendingRequests.slice(start, start + rowsPerPage);
    }, [filteredRequests, page, rowsPerPage]);


    const openModal = (request) => {
        setModalRequest(request);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalRequest(null);
        setModalOpen(false);
    };

    return (
        <div className="admin-view">
        <div className="admin-toolbar">
            <div className="admin-toolbar-title">
            <h2>Purchase Requests</h2>
            <p>View and manage all purchase requests in the system.</p>
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
                <th style={{ textAlign: "center" }}>Request Date</th>
                <th style={{ textAlign: "left" }}>Requested By</th>
                <th style={{ textAlign: "left" }}>Branch</th>
                <th style={{ textAlign: "left" }}>Department</th>
                <th style={{ textAlign: "left" }}>Purpose</th>
                <th style={{ textAlign: "center" }}>Status</th>
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
                ) : visibleRequests.length === 0 ? (
                <tr>
                    <td colSpan={8} className="admin-empty-state">
                    {search
                        ? "No requests match your search."
                        : "No purchase requests found."}
                    </td>
                </tr>
                ) : (
                visibleRequests.map((req) => (
                    <tr key={req.id}>
                    <td style={{ textAlign: "center" }}>{req.purchase_request_code}</td>
                    <td style={{ textAlign: "center" }}>
                        {new Date(req.request_date).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "left" }}>{req.request_by}</td>
                    <td style={{ textAlign: "left" }}>{req.branch}</td>
                    <td style={{ textAlign: "left" }}>{req.department}</td>
                    <td style={{ textAlign: "left" }}>{req.purpose}</td>
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
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
                <div className="admin-modal-panel request-modal">
                
                    <button
                        className="admin-close-btn"
                        onClick={closeModal}
                        aria-label="Close"
                    >
                        ×
                    </button>

                    <h2>{modalRequest.purchase_request_code}</h2>

                    <p><strong>Requested by:</strong> <em>{modalRequest.request_by}</em></p>
                    <p><strong>Date:</strong> <em>{new Date(modalRequest.request_date).toLocaleDateString()}</em></p>
                    <p><strong>Branch:</strong> <em>{modalRequest.branch}</em></p>
                    <p><strong>Department:</strong> <em>{modalRequest.department}</em></p>
                    <p><strong>Purpose:</strong> <em>{modalRequest.purpose}</em></p>

                    <h3>Requested Items</h3>
                    {modalRequest.items && modalRequest.items.length > 0 ? (
                        <table className="request-items-table">
                        <thead>
                            <tr>
                            <th>Item Name</th>
                            <th style={{ textAlign: "center" }}>Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {modalRequest.items.map((item) => (
                            <tr key={item.id}>
                                <td>{item.purchase_item}</td>
                                <td style={{ textAlign: "center" }}>{item.quantity}</td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    ) : (
                        <p>—</p>
                    )}

                    <form
                        className="request-footer-form"
                        onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.target;
                        const formData = new FormData(form);

                        formData.append("purchase_request_code", modalRequest.purchase_request_code);
                        formData.append("status", "Approved");

                        try {
                            const response = await fetch(`${API_BASE_URL}/api/update_purchase_request`, {
                            method: "PUT",
                            body: formData,
                            });
                            if (!response.ok) throw new Error("Failed to approve request");

                            setStatus({ type: "info", message: "Purchase request approved successfully." });
                            closeModal();
                            fetchRequests();
                        } catch (err) {
                            console.error(err);
                            setStatus({ type: "error", message: err.message });
                        }
                        }} >
                        <div className="request-footer">
                            <p className="purchase-header"><strong>Purchasing Department Use Only</strong></p>
                            <div className="purchase-grid">
                                <div className="purchase-left">
                                <label>
                                    <span>Date Ordered:</span>
                                    <input
                                    type="date"
                                    name="date_ordered"
                                    className="date"
                                    defaultValue={modalRequest.date_ordered || new Date().toISOString().split("T")[0]}
                                    required
                                    />
                                </label>

                                <label>
                                    <span>Approved by:</span>
                                    <input
                                    type="text"
                                    name="approved_by"
                                    defaultValue={modalRequest.approved_by || sessionStorage.getItem("loggedInUser") || ""}
                                    placeholder="Enter name"
                                    required
                                    />
                                </label>
                                </div>

                                <div className="purchase-right">
                                <label>
                                    <span>PO Number:</span>
                                    <input
                                    type="text"
                                    name="po_number"
                                    defaultValue={modalRequest.po_number || ""}
                                    placeholder="Enter PO number"
                                    required
                                    />
                                </label>

                                <label>
                                    <span>Signature:</span>
                                    <input type="file" name="approved_signature" accept="image/*" required />
                                </label>
                                </div>
                            </div>
                        </div>

                        <div className="admin-modal-footer">
                            <button type="submit" className="admin-success-btn">✅ Approve</button>

                            <button
                                type="button"
                                className="admin-danger-btn"
                                onClick={async () => {
                                if (!window.confirm("Are you sure you want to decline this request?")) return;

                                const formData = new FormData();
                                formData.append("purchase_request_code", modalRequest.purchase_request_code);
                                formData.append("status", "Declined");

                                try {
                                    const response = await fetch(`${API_BASE_URL}/api/update_purchase_request`, {
                                    method: "PUT",
                                    body: formData,
                                    });

                                    if (!response.ok) throw new Error("Failed to decline request");

                                    setStatus({ type: "info", message: "Purchase request declined." });
                                    closeModal();
                                    fetchRequests();
                                } catch (err) {
                                    console.error(err);
                                    setStatus({ type: "error", message: err.message });
                                }
                                }} >
                                ❌ Decline
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            )}

        </div>
    );
}

export default RequestPurchase;
