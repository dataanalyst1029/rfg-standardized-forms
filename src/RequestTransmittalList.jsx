import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "./config/api.js";
import "./styles/Dashboard.css";
import "./styles/AdminView.css";
import "./styles/RequestTransmittalList.css";

function RequestTransmittalList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [modalRequest, setModalRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
};


  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/transmittals`);
      if (!res.ok) throw new Error("Failed to load transmittals");
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load transmittals");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter((req) =>
      [
        req.form_code,
        req.sender_name,
        req.employee_id,
        req.origin_branch,
        req.origin_department,
        req.destination_branch,
        req.status,
      ]
        .filter(Boolean)
        .some((field) => field.toString().toLowerCase().includes(term)),
    );
  }, [search, requests]);

  const pendingOnly = filtered.filter(
    (req) => (req.status || "pending").toLowerCase() === "pending",
  );

  const handleView = (request) => {
    if (!request) return;
    setModalRequest(request);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalRequest(null);
  };

  const handleReceive = () => {
    if (!modalRequest?.id || actionLoading) return;
    updateStatus("Received", { received_date: new Date().toISOString() });
  };

  const handleDecline = () => {
    if (!modalRequest?.id || actionLoading) return;
    updateStatus("Declined");
  };

  const updateStatus = async (newStatus, extra = {}) => {
    if (!modalRequest?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/transmittals/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: modalRequest.id,
          status: newStatus,
          received_by: extra.received_by || modalRequest.received_by || null,
          received_signature: extra.received_signature || modalRequest.received_signature || null,
          received_date: extra.received_date || modalRequest.received_date || null,
        }),
      });

      if (!res.ok) {
        const message = (await res.json().catch(() => ({})))?.message || "Update failed";
        throw new Error(message);
      }

      const updated = await res.json();
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setModalRequest(updated);

      if (newStatus.toLowerCase() !== "pending") {
        setShowModal(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to update status");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="dashboard-content">
      <section className="dashboard-panel">
        <div className="panel-heading panel-heading--with-action transmittal-list-wrapper">
          <div>
            <h2>Transmittal Requests</h2>
            <p>View and manage all transmittal requests in the system.</p>
          </div>
          <div className="panel-search">
            <input
              type="search"
              placeholder="Search requests"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="panel-empty">Loading...</p>
        ) : error ? (
          <p className="panel-empty">{error}</p>
        ) : pendingOnly.length === 0 ? (
          <p className="panel-empty">No pending transmittals found.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ref. No.</th>
                  <th>Date</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingOnly.map((req) => (
                  <tr key={req.id || req.form_code}>
                    <td>{req.form_code || "N/A"}</td>
                    <td>{formatDateTime(req.transmittal_date)}</td>
                    <td>{req.employee_id || "N/A"}</td>
                    <td>{req.sender_name || "N/A"}</td>
                    <td>{req.origin_branch || "N/A"}</td>
                    <td>{req.origin_department || "N/A"}</td>
                    <td style={{ textTransform: "uppercase", fontWeight: 400 }}>
                      {req.status || "Pending"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-primary-btn"
                        onClick={() => handleView(req)}
                        aria-label="View transmittal"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && modalRequest && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div
            className="admin-modal-panel request-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-heading" style={{ marginBottom: "0.75rem" }}>
              <div>
                <h2>Transmittal - {modalRequest.form_code || "N/A"}</h2>
                <p className="panel-meta">
                  Origin: {modalRequest.origin_branch || "N/A"} → Destination:{" "}
                  {modalRequest.destination_branch || "N/A"}
                </p>
              </div>
              <button className="admin-danger-btn" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>

            <div className="modal-grid">
              <div className="modal-field">
                <label>Date</label>
                <span>{formatDateTime(modalRequest.transmittal_date)}</span>
              </div>
              <div className="modal-field">
                <label>Employee ID</label>
                <span>{modalRequest.employee_id || "N/A"}</span>
              </div>
              <div className="modal-field">
                <label>Name</label>
                <span>{modalRequest.sender_name || "N/A"}</span>
              </div>
              <div className="modal-field">
                <label>Department</label>
                <span>{modalRequest.origin_department || "N/A"}</span>
              </div>
              <div className="modal-field">
                <label>Purpose</label>
                <span>{modalRequest.purpose || "N/A"}</span>
              </div>
              <div className="modal-field">
                <label>Delivery mode</label>
                <span>{modalRequest.delivery_mode || "N/A"}</span>
              </div>
              <div className="modal-field">
                <label>Tracking #</label>
                <span>{modalRequest.tracking_no || "N/A"}</span>
              </div>
              <div className="modal-field">
                <label>Condition</label>
                <span>{modalRequest.condition_status || "N/A"}</span>
              </div>
            </div>

            <div className="admin-table-wrapper purchase-table-wrap" style={{ maxHeight: "40vh" }}>
              <table className="admin-table purchase-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "center" }}>Reference #</th>
                    <th style={{ textAlign: "center" }}>Description</th>
                    <th style={{ textAlign: "center" }}>Qty</th>
                    <th style={{ textAlign: "center" }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {(modalRequest.items || []).length ? (
                    modalRequest.items.map((item) => (
                      <tr key={item.id}>
                        <td style={{ textAlign: "center" }}>{item.reference_no || "N/A"}</td>
                        <td style={{ textAlign: "center" }}>{item.description || "N/A"}</td>
                        <td style={{ textAlign: "center" }}>{item.quantity ?? "N/A"}</td>
                        <td style={{ textAlign: "center" }}>{item.remarks || "N/A"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="admin-empty-state">
                        No items recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button className="admin-danger-btn" onClick={handleDecline} disabled={actionLoading}>
                {actionLoading ? "Working..." : "Decline"}
              </button>
              <button className="admin-primary-btn" onClick={handleReceive} disabled={actionLoading}>
                {actionLoading ? "Working..." : "Receive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestTransmittalList;
