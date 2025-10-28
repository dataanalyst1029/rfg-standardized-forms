import React, { useEffect, useState, useMemo } from "react";
import { API_BASE_URL } from "../config/api.js";
import "../styles/ReportsAudit.css";
import "../styles/AdminView.css";
import "../styles/RequestPurchase.css";

const PAGE_SIZES = [5, 10, 20];
const storedId = sessionStorage.getItem("id");

/**
 * Normalizes data from different request tables into a single format.
 */
const normalizeData = (logs) => {
  const allRequests = [];

  for (const tableName in logs) {
    const requests = logs[tableName] || [];
    requests.forEach((item) => {
      const normalized = {
        id: `${tableName}-${item.id}`,
        ref_no:
          item.form_code ||
          item.purchase_request_code ||
          item.revolving_request_code ||
          item.ca_request_code,
        date: item.request_date || item.date_applied || item.date_request,
        employee_id: item.employee_id,
        name:
          item.requester_name ||
          item.request_by ||
          item.custodian_name ||
          item.name,
        branch: item.branch,
        department: item.department,
        status: item.status,
        form_code: item.form_code || tableName, // Added so filterFn can detect form type
        original_data: item,
      };
      allRequests.push(normalized);
    });
  }

  allRequests.sort((a, b) => new Date(b.date) - new Date(a.date));
  return allRequests;
};

/**
 * ReportsAudit reusable component.
 * Handles: fetching, filtering, pagination, table rendering
 */
const ReportsAudit = ({
  title = "Audit Logs",
  subtitle = "View all requests from system tables.",
  filterFn, // custom filter (e.g. filter by form_code, status, etc.)
  onRowClick, // callback when a row is clicked
}) => {
  const [logs, setLogs] = useState({});
  const [normalizedRequests, setNormalizedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch data
  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) {
      const inclusiveEndDate = new Date(endDate);
      inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1);
      params.append("endDate", inclusiveEndDate.toISOString().split("T")[0]);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/reports_audit?${params}`);
      if (!res.ok) throw new Error(`Network error: ${res.status}`);
      const data = await res.json();
      setLogs(data.tables || data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    if (Object.keys(logs).length > 0) {
      setNormalizedRequests(normalizeData(logs));
    } else {
      setNormalizedRequests([]);
    }
  }, [logs]);

  useEffect(() => {
    setPage(1);
  }, [search, rowsPerPage]);

  // --- Filtering logic ---
  const filteredRequests = useMemo(() => {
    let filtered = normalizedRequests;
    if (filterFn) filtered = filtered.filter(filterFn);

    const term = search.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((req) =>
        ["ref_no", "employee_id", "name", "branch", "department", "status"].some(
          (key) => req[key]?.toString().toLowerCase().includes(term)
        )
      );
    }
    return filtered;
  }, [normalizedRequests, search, filterFn]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage));
  const visibleRequests = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRequests.slice(start, start + rowsPerPage);
  }, [filteredRequests, page, rowsPerPage]);

  return (
    <div className="audit-view">
      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <div className="admin-toolbar-actions">
          <p>Filter from </p>
          <input
            type="date"
            className="audit-date-filter"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ margin: "0 5px" }}>to</span>
          <input
            type="date"
            className="audit-date-filter"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button className="date-filter-btn" onClick={fetchAuditLogs}>
            Filter
          </button>

          <input
            type="search"
            className="admin-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests..."
            style={{ marginLeft: "10px" }}
          />
        </div>
      </div>

      {error && (
        <div className="admin-status-banner admin-status-banner--error">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="audit-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>Ref. No.</th>
              <th style={{ textAlign: "center" }}>Date Request</th>
              <th style={{ textAlign: "left" }}>Employee ID</th>
              <th style={{ textAlign: "left" }}>Name</th>
              <th style={{ textAlign: "left" }}>Branch</th>
              <th style={{ textAlign: "left" }}>Department</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  Loading audit logs...
                </td>
              </tr>
            ) : visibleRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty-state">
                  {search
                    ? "No requests match your search."
                    : "No requests found."}
                </td>
              </tr>
            ) : (
              visibleRequests.map((req) => (
                <tr key={req.id}>
                  <td>{req.ref_no || "N/A"}</td>
                  <td>
                    {req.date ? new Date(req.date).toLocaleDateString() : "N/A"}
                  </td>
                  <td>{req.employee_id || "N/A"}</td>
                  <td>{req.name || "N/A"}</td>
                  <td>{req.branch || "N/A"}</td>
                  <td>{req.department || "N/A"}</td>
                  <td>{req.status ? req.status.toUpperCase() : "N/A"}</td>
                  <td>
                    <button
                      className="admin-primary-btn"
                      onClick={() => onRowClick?.(req.original_data)}
                      title="View Raw Data"
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

      {/* Pagination */}
      <div className="admin-pagination">
        <span className="admin-pagination-info">
          Showing {visibleRequests.length} of {filteredRequests.length} requests
        </span>
        <div className="admin-pagination-controls">
          <button
            type="button"
            className="admin-pagination-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
    </div>
  );
};

export default ReportsAudit;
