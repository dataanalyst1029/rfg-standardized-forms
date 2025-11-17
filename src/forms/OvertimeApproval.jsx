import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/OvertimeApproval.css";
import { API_BASE_URL } from "../config/api.js";

const emptyEntry = () => ({
  ot_date: "",
  time_from: "",
  time_to: "",
  purpose: "",
  hours: 0,
});

const parseTimeToMinutes = (value) => {
  if (!value) {
    return null;
  }
  const [hourStr = "", minuteStr = ""] = value.split(":");
  const hours = Number(hourStr);
  const minutes = Number(minuteStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const calculateHours = (from, to) => {
  const fromMinutes = parseTimeToMinutes(from);
  const toMinutes = parseTimeToMinutes(to);
  if (fromMinutes === null || toMinutes === null) {
    return 0;
  }
  let diff = toMinutes - fromMinutes;
  if (diff < 0) {
    diff += 24 * 60;
  }
  return Number((diff / 60).toFixed(2));
};

function OvertimeApproval({ onLogout }) {
  const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [formData, setFormData] = useState({
    requester_name: storedUser.name || "",
    branch: storedUser.branch || "",
    department: storedUser.department || "",
    employee_id: storedUser.employee_id || "",
    request_date: new Date().toISOString().split("T")[0],
    signature: storedUser.name || "",
    cutoff_start: "",
    cutoff_end: "",
  });
  const [entries, setEntries] = useState([emptyEntry()]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextReferenceCode, setNextReferenceCode] = useState(null);
  const [activeSection, setActiveSection] = useState("details");

  const role = (storedUser.role || "").toLowerCase();
  const isUserAccount = role === "user" || role === "staff";

  const availableDepartments = useMemo(() => {
      if (!formData.branch) {
        return departments;
      }
      const selected = branches.find(
        (branch) => branch.branch_name === formData.branch,
      );

      return selected
      ? departments.filter((dept) => {
        if (dept.branch_id === null || dept.branch_id === undefined) {
          return true;
        }
        return Number(dept.branch_id) === Number(selected.id);
      })
      : departments;
    }, [formData.branch, departments, branches]);

  const totalHours = useMemo(
    () => entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0),
    [entries],
  );

  useEffect(() => {
    let isMounted = true;
    if (request) {
      setNextReferenceCode(null);
      return () => {
        isMounted = false;
      };
    }

    const fetchNextCode = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/overtime_requests/next-code`);
        if (!res.ok) {
          throw new Error("Failed to load next reference code");
        }
        const data = await res.json();
        if (isMounted) {
          setNextReferenceCode(data.nextCode || null);
        }
      } catch (error) {
        console.error("Error fetching next overtime code:", error);
      }
    };

    fetchNextCode();

    return () => {
      isMounted = false;
    };
  }, [request]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [branchRes, deptRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/branches`),
          fetch(`${API_BASE_URL}/api/departments`),
        ]);

        const branchData = branchRes.ok ? await branchRes.json() : [];
        const deptData = deptRes.ok ? await deptRes.json() : [];

        setBranches(branchData);
        setDepartments(deptData);

        if (branchData.length) {
          const matchedBranch = branchData.find(
            (branch) =>
              (branch.branch_name || "").toLowerCase() === (storedUser.branch || "").toLowerCase(),
          );
          if (matchedBranch) {
            setFormData((prev) => ({ ...prev, branch: matchedBranch.branch_name }));
          }
        }

        if (deptData.length && storedUser.department) {
          const matchedDept = deptData.find(
            (dept) =>
              (dept.department_name || "").toLowerCase() === storedUser.department.toLowerCase(),
          );
          if (matchedDept) {
            setFormData((prev) => ({ ...prev, department: matchedDept.department_name }));
          }
        }
      } catch (error) {
        console.error("Error loading overtime lookups:", error);
      }
    };

    loadLookups();
  }, [storedUser.branch, storedUser.department]);

  useEffect(() => {
    if (!formData.branch) {
      return;
    }
    if (
      formData.department &&
      availableDepartments.some((dept) => dept.department_name === formData.department)
    ) {
      return;
    }
    const firstDepartment = availableDepartments[0]?.department_name || "";
    setFormData((prev) => ({ ...prev, department: firstDepartment }));
  }, [formData.branch, formData.department, availableDepartments]);

  const handleBackToForms = () => {
    navigate("/forms-list");
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    if (type !== "error") {
      setTimeout(() => setMessage(null), 2500);
    }
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBranchChange = (event) => {
    const value = event.target.value;
    const branchRecord = branches.find((branch) => branch.branch_name === value);
    const branchDepartments = branchRecord
      ? departments.filter((dept) => {
          if (dept.branch_id === null || dept.branch_id === undefined) {
            return true;
          }
          return Number(dept.branch_id) === Number(branchRecord.id);
        })
      : [];
    setFormData((prev) => ({
      ...prev,
      branch: value,
      department: branchDepartments[0]?.department_name || "",
    }));
  };

  const updateEntry = (index, field, value) => {
    setEntries((prev) =>
      prev.map((entry, idx) => {
        if (idx !== index) {
          return entry;
        }
        const updated = { ...entry, [field]: value };
        if (field === "time_from" || field === "time_to") {
          updated.hours = calculateHours(
            field === "time_from" ? value : updated.time_from,
            field === "time_to" ? value : updated.time_to,
          );
        }
        return updated;
      }),
    );
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, emptyEntry()]);
  };

  const removeEntry = (index) => {
    setEntries((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const submitRequest = async () => {
    if (!isUserAccount) {
      return;
    }
    if (!formData.requester_name.trim()) {
      showMessage("error", "Requester name is required.");
      return;
    }
    if (!formData.branch) {
      showMessage("error", "Select a branch.");
      return;
    }
    if (!formData.department) {
      showMessage("error", "Select a department.");
      return;
    }
    if (!formData.cutoff_start || !formData.cutoff_end) {
      showMessage("error", "Provide the cut-off period for this request.");
      return;
    }
    if (new Date(formData.cutoff_start) > new Date(formData.cutoff_end)) {
      showMessage("error", "Cut-off end date must be on or after the start date.");
      return;
    }

    const cleanedEntries = entries
      .map((entry) => ({
        ot_date: entry.ot_date,
        time_from: entry.time_from,
        time_to: entry.time_to,
        purpose: (entry.purpose || "").trim(),
        hours: entry.hours || calculateHours(entry.time_from, entry.time_to),
      }))
      .filter(
        (entry) =>
          entry.ot_date || entry.time_from || entry.time_to || entry.purpose || entry.hours > 0,
      );

    if (cleanedEntries.length === 0) {
      showMessage("error", "Add at least one overtime entry.");
      return;
    }
    if (!cleanedEntries.some((entry) => entry.hours > 0)) {
      showMessage("error", "Overtime hours must be greater than zero.");
      return;
    }

    setIsSaving(true);

    const payload = {
      form_code: nextReferenceCode,
      requester_name: formData.requester_name,
      branch: formData.branch,
      department: formData.department,
      employee_id: formData.employee_id,
      request_date: formData.request_date,
      signature: formData.signature,
      cutoff_start: formData.cutoff_start,
      cutoff_end: formData.cutoff_end,
      entries: cleanedEntries,
      submitted_by: storedUser.id || null,
      cleanedEntries,
    };

    console.log("Submitting: ", payload)

    try {
      const res = await fetch(`${API_BASE_URL}/api/overtime_requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit overtime request.");
      }
      setRequest(data);
      showMessage("success", "Overtime request submitted for approval.");
    } catch (error) {
      console.error("Error submitting overtime request:", error);
      showMessage("error", error.message || "Unable to submit overtime request.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentStatus = request?.status || "submitted";
  const isReadOnly = Boolean(request);

  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      navigate("/forms/hr-overtime-approval/submitted");
      return;
    }

    setActiveSection(sectionId);

    const mainContainer = document.getElementById("oa-main");
    const target = document.getElementById(sectionId);

    const header = mainContainer?.querySelector(".pr-topbar");

    if (target) {
      const headerHeight = header ? header.offsetHeight : 0;

      const targetTop = target.offsetTop;

      const scrollToPosition = targetTop - headerHeight;

      mainContainer.scrollTo({
        top: scrollToPosition < 0 ? 0 : scrollToPosition,
        behavior: "smooth",
      })
    }
  };

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2>Overtime Request</h2>
          <span>{currentStatus.toUpperCase()}</span>
        </div>
        <nav className="pr-sidebar-nav">
          {[
            { id: "details", label: "Request details" },
            { id: "entries", label: "Overtime entries" },
            { id: "submitted", label: "View submitted requests" },
          ].map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? "is-active" : ""}
              onClick={() => handleNavigate(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>
        <div className="pr-sidebar-footer">
          <span className="pr-sidebar-meta">
            Total hours compute automatically from each entry.
          </span>
          {onLogout && (
            <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
              Sign out
            </button>
          )}
        </div>
      </aside>
      <main className="pr-main" id="oa-main">
        <button type="button" className="form-back-button" onClick={handleBackToForms}>
          ← <span>Back to forms library</span>
        </button>
        <header className="pr-topbar">
          <div>
            <h1 className="topbar-title">Overtime Approval Request</h1>
            <p className="pr-topbar-meta">
              Record rendered overtime, compute total hours, and route for approval.
            </p>
          </div>
          <div className="pr-reference-card">
            <span className="pr-reference-label">Reference code</span>
            <span className="pr-reference-value">
              {request?.form_code || nextReferenceCode || "Pending assignment"}
            </span>
            <span className="pr-reference-label">Request date</span>
            <span>
              <input
                type="date"
                name="request_date"
                value={formData.request_date}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </span>
            <span className="pr-reference-label">Total hours</span>
            <span className="pr-reference-value">{totalHours.toFixed(2)}</span>
          </div>
        </header>

        {message && <div className={`ot-alert ot-alert--${message.type}`}>{message.text}</div>}

        <section className="pr-form-section" id="details">
          <h2 className="pr-section-title">Requester details</h2>
          <p className="pr-section-subtitle">
            These values are prefilled from your account. Adjust if this request should route
            differently.
          </p>
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="requester_name">Name</label>
              <input
                id="requester_name"
                name="requester_name"
                value={formData.requester_name}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="employee_id">Employee ID</label>
              <input id="employee_id" value={formData.employee_id} className="pr-input" readOnly />
            </div>
          </div>
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="branch">Branch</label>
              <select
                id="branch"
                name="branch"
                value={formData.branch || ""}
                onChange={handleBranchChange}
                className="pr-input"
                disabled={isReadOnly}
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.branch_name}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="department">Department</label>
              {availableDepartments.length ? (
                <select
                  id="department"
                  name="department"
                  value={formData.department || ""}
                  onChange={handleFieldChange}
                  className="pr-input"
                  disabled={isReadOnly}
                >
                  <option value="">Select department</option>
                  {availableDepartments.map((department) => (
                    <option key={department.id} value={department.department_name}>
                      {department.department_name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleFieldChange}
                  className="pr-input"
                  disabled={isReadOnly}
                  placeholder="No departments configured"
                />
              )}
            </div>
          </div>
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="signature">Signature</label>
              <input
                id="signature"
                name="signature"
                value={formData.signature}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
            <div className="pr-field">
              <label className="pr-label">Cut-off period</label>
              <div className="ot-cutoff-range">
                <input
                  type="date"
                  id="cutoff_start"
                  name="cutoff_start"
                  value={formData.cutoff_start}
                  onChange={handleFieldChange}
                  className="pr-input"
                  disabled={isReadOnly}
                />
                <span className="ot-cutoff-separator">to</span>
                <input
                  type="date"
                  id="cutoff_end"
                  name="cutoff_end"
                  value={formData.cutoff_end}
                  min={formData.cutoff_start || undefined}
                  onChange={handleFieldChange}
                  className="pr-input"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="pr-items-card" id="entries">
          <div className="pr-items-header">
            <div>
              <h2 className="pr-items-title">Overtime hours rendered</h2>
              <p className="pr-section-subtitle">
                List each overtime instance with start and end times. Hours auto-calculate.
              </p>
            </div>
            <button type="button" className="pr-items-add" onClick={addEntry} disabled={isReadOnly}>
              Add entry
            </button>
          </div>
          <div className="ot-items-wrapper">
            <table className="pr-items-table">
              <thead>
                <tr>
                  <th>OT date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Purpose(s)</th>
                  <th>Hours</th>
                  {!isReadOnly && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="date"
                        value={entry.ot_date}
                        onChange={(event) =>
                          updateEntry(index, "ot_date", event.target.value)
                        }
                        className="pr-input"
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={entry.time_from}
                        onChange={(event) =>
                          updateEntry(index, "time_from", event.target.value)
                        }
                        className="pr-input"
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={entry.time_to}
                        onChange={(event) =>
                          updateEntry(index, "time_to", event.target.value)
                        }
                        className="pr-input"
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={entry.purpose}
                        onChange={(event) =>
                          updateEntry(index, "purpose", event.target.value)
                        }
                        className="pr-input"
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input value={entry.hours.toFixed(2)} readOnly className="pr-input" />
                    </td>
                    {!isReadOnly && (
                      <td>
                        <button
                          type="button"
                          className="pr-table-action"
                          onClick={() => removeEntry(index)}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ot-total-card">
            <span className="ot-total-label">Grand total hours</span>
            <span className="ot-total-value">{totalHours.toFixed(2)}</span>
          </div>
        </section>

        <div className="pr-form-actions">
          <button
            type="button"
            className="pr-submit"
            onClick={submitRequest}
            disabled={isSaving || isReadOnly || !isUserAccount}
          >
            Submit for approval
          </button>
          {request && (
            <button
              type="button"
              className="pr-sidebar-logout"
              onClick={() => {
                setRequest(null);
                setFormData({
                  requester_name: storedUser.name || "",
                  branch: storedUser.branch || "",
                  department: storedUser.department || "",
                  employee_id: storedUser.employee_id || "",
                  request_date: new Date().toISOString().split("T")[0],
                  signature: storedUser.name || "",
                  cutoff_start: "",
                  cutoff_end: "",
                });
                setEntries([emptyEntry()]);
                setNextReferenceCode(null);
                setMessage(null);
              }}
              disabled={isSaving}
            >
              Start new request
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default OvertimeApproval;
