import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/LeaveApplication.css";
import { API_BASE_URL } from "../config/api.js";

const LEAVE_TYPES = [
  { id: "annual", label: "Annual Leave" },
  { id: "sick", label: "Sick Leave" },
  { id: "maternity", label: "Maternity Leave" },
  { id: "paternity", label: "Paternity Leave" },
  { id: "emergency", label: "Emergency Leave" },
  { id: "bereavement", label: "Bereavement Leave" },
  { id: "others", label: "Others" },
];

const createInitialFormState = (storedUser) => ({
  requester_name: storedUser.name || "",
  employee_id: storedUser.employee_id || "",
  branch: storedUser.branch || "",
  department: storedUser.department || "",
  position: "",
  request_date: new Date().toISOString().split("T")[0],
  signature: storedUser.name || "",
  leave_type: "",
  leave_other_text: "",
  leave_start: "",
  leave_end: "",
  purpose: "",
});

const calculateLeaveDays = (start, end) => {
  if (!start || !end) {
    return 0;
  }
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 0;
  }
  const diff = to.getTime() - from.getTime();
  if (diff < 0) {
    return 0;
  }
  return Math.round(diff / (24 * 60 * 60 * 1000)) + 1;
};

function LeaveApplication({ onLogout }) {
  const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  const [formData, setFormData] = useState(createInitialFormState(storedUser));
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [request, setRequest] = useState(null);
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextReferenceCode, setNextReferenceCode] = useState(null);
  const [activeSection, setActiveSection] = useState("details");

  const role = (storedUser.role || "").toLowerCase();
  const isUserAccount = role === "user" || role === "staff";

  const availableDepartments = formData.branch
    ? departments.filter((dept) => {
        if (dept.branch_id === null || dept.branch_id === undefined) {
          return true;
        }
        const branchRecord = branches.find((branch) => branch.branch_name === formData.branch);
        return branchRecord ? Number(dept.branch_id) === Number(branchRecord.id) : true;
      })
    : departments;

  const totalLeaveDays = useMemo(
    () => calculateLeaveDays(formData.leave_start, formData.leave_end),
    [formData.leave_start, formData.leave_end],
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
        const res = await fetch(`${API_BASE_URL}/api/leave_requests/next-code`);
        if (!res.ok) {
          throw new Error("Failed to load next reference code");
        }
        const data = await res.json();
        if (isMounted) {
          setNextReferenceCode(data.nextCode || null);
        }
      } catch (error) {
        console.error("Error fetching next leave code:", error);
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
        console.error("Error loading leave lookups:", error);
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

  const handleLeaveTypeChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      leave_type: value,
      leave_other_text: value === "others" ? prev.leave_other_text : "",
    }));
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
    if (!formData.position.trim()) {
      showMessage("error", "Position is required.");
      return;
    }
    if (!formData.leave_type) {
      showMessage("error", "Select a leave type.");
      return;
    }
    if (formData.leave_type === "others" && !formData.leave_other_text.trim()) {
      showMessage("error", "Specify the leave type.");
      return;
    }
    if (!formData.leave_start || !formData.leave_end) {
      showMessage("error", "Provide the leave dates.");
      return;
    }
    if (new Date(formData.leave_start) > new Date(formData.leave_end)) {
      showMessage("error", "Leave end date must be on or after the start date.");
      return;
    }
    if (!formData.purpose.trim()) {
      showMessage("error", "Please provide remarks or reason for the leave.");
      return;
    }

    setIsSaving(true);

    const payload = {
      form_code: nextReferenceCode,
      requester_name: formData.requester_name,
      employee_id: formData.employee_id,
      branch: formData.branch,
      department: formData.department,
      position: formData.position,
      request_date: formData.request_date,
      signature: formData.signature,
      leave_type:
        formData.leave_type === "others"
          ? `Others - ${formData.leave_other_text.trim()}`
          : formData.leave_type,
      leave_start: formData.leave_start,
      leave_end: formData.leave_end,
      leave_hours: totalLeaveDays,
      purpose: formData.purpose,
      submitted_by: storedUser.id || null,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/leave_requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit leave request.");
      }
      setRequest(data);
      showMessage("success", "Leave request submitted for endorsement.");
    } catch (error) {
      console.error("Error submitting leave request:", error);
      showMessage("error", error.message || "Unable to submit leave request.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentStatus = request?.status || "submitted";
  const isReadOnly = Boolean(request);

  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      navigate("/forms/hr-leave-application/submitted");
      return;
    }
    setActiveSection(sectionId);
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2>Leave Application</h2>
          <span>{currentStatus.toUpperCase()}</span>
        </div>
        <nav className="pr-sidebar-nav">
          {[
            { id: "details", label: "Request details" },
            { id: "leave-type", label: "Leave information" },
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
            Submit requests early based on the leave policy guidelines.
          </span>
          {onLogout && (
            <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
              Sign out
            </button>
          )}
        </div>
      </aside>
      <main className="pr-main">
        <button type="button" className="form-back-button" onClick={handleBackToForms}>
          ← <span>Back to forms library</span>
        </button>
        <header className="pr-topbar">
          <div>
            <h1 className="topbar-title">Leave Application Form</h1>
            <p className="pr-topbar-meta">
              File a leave request and track endorsements through HR.
            </p>
          </div>
          <div className="pr-reference-card">
            <span className="pr-reference-label">Reference code</span>
            <span className="pr-reference-value">
              {request?.form_code || nextReferenceCode || "Pending assignment"}
            </span>
            <span className="pr-reference-label">Date filed</span>
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
          </div>
        </header>

        {message && <div className={`leave-alert leave-alert--${message.type}`}>{message.text}</div>}

        <section className="pr-form-section" id="details">
          <h2 className="pr-section-title">Requestor details</h2>
          <p className="pr-section-subtitle">
            Confirm your information. HR uses these details to locate your leave records.
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
              <label className="pr-label" htmlFor="position">Position</label>
              <input
                id="position"
                name="position"
                value={formData.position}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
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
          </div>
        </section>

        <section className="pr-form-section" id="leave-type">
          <h2 className="pr-section-title">Leave information</h2>
          <p className="pr-section-subtitle">
            Select one leave type and specify the dates covered by this request.
          </p>
          <div className="leave-type-grid">
            {LEAVE_TYPES.map((type) => (
              <label key={type.id} className="leave-type-option">
                <input
                  type="radio"
                  name="leave_type"
                  value={type.id}
                  checked={formData.leave_type === type.id}
                  onChange={handleLeaveTypeChange}
                  disabled={isReadOnly}
                />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
          {formData.leave_type === "others" && (
            <div className="pr-field">
              <label className="pr-label" htmlFor="leave_other_text">Specify leave type</label>
              <input
                id="leave_other_text"
                name="leave_other_text"
                value={formData.leave_other_text}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
          )}
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="leave_start">Leave start</label>
              <input
                type="date"
                id="leave_start"
                name="leave_start"
                value={formData.leave_start}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="leave_end">Leave end</label>
              <input
                type="date"
                id="leave_end"
                name="leave_end"
                value={formData.leave_end}
                min={formData.leave_start || undefined}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
          </div>
          <div className="pr-field">
            <label className="pr-label">Total days</label>
            <input value={totalLeaveDays.toString()} readOnly className="pr-input" />
          </div>
          <div className="pr-field">
            <label className="pr-label" htmlFor="purpose">Remarks / Purpose</label>
            <textarea
              id="purpose"
              name="purpose"
              value={formData.purpose}
              onChange={handleFieldChange}
              className="pr-textarea"
              rows={4}
              disabled={isReadOnly}
            />
          </div>
        </section>

        <div className="pr-form-actions">
          <button
            type="button"
            className="pr-submit"
            onClick={submitRequest}
            disabled={isSaving || isReadOnly || !isUserAccount}
          >
            Submit for endorsement
          </button>
          {request && (
            <button
              type="button"
              className="pr-sidebar-logout"
              onClick={() => {
                setRequest(null);
                setFormData(createInitialFormState(storedUser));
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

export default LeaveApplication;
