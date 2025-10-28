import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "./config/api.js";

export const useAuditData = () => {
  const [logs, setLogs] = useState({});
  const [normalizedRequests, setNormalizedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
      const res = await fetch(`${API_BASE_URL}/api/reports_audit?${params.toString()}`);
      if (!res.ok) throw new Error(`Network error: ${res.status} ${res.statusText}`);
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
    const allRequests = [];
    for (const tableName in logs) {
      (logs[tableName] || []).forEach((item) => {
        allRequests.push({
          id: `${tableName}-${item.id}`,
          form_code:
            item.form_code ||
            item.purchase_request_code ||
            item.revolving_request_code ||
            item.ca_request_code,
          type: tableName,
          date: item.request_date || item.date_applied || item.date_request,
          employee_id: item.employee_id,
          name: item.requester_name || item.request_by || item.custodian_name || item.name,
          branch: item.branch,
          department: item.department,
          status: item.status,
          original_data: item,
        });
      });
    }
    allRequests.sort((a, b) => new Date(b.date) - new Date(a.date));
    setNormalizedRequests(allRequests);
  }, [logs]);

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return normalizedRequests;
    return normalizedRequests.filter((req) =>
      ["form_code", "name", "branch", "department", "status"].some((key) =>
        req[key]?.toString().toLowerCase().includes(term)
      )
    );
  }, [normalizedRequests, search]);

  return {
    filteredRequests,
    loading,
    error,
    search,
    setSearch,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    fetchAuditLogs,
  };
};
