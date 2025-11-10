import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/MaintenanceRepair.css";
import { API_BASE_URL } from "../config/api.js";

const createInitialFormState = (storedUser) => ({
  requester_name: storedUser.name || "",
  branch: storedUser.branch || "",
  department: storedUser.department || "",
  employee_id: storedUser.employee_id || "",
  request_date: new Date().toISOString().split("T")[0],
  signature: storedUser.signature || null,
  date_needed: "",
  work_description: "",
  asset_tag: "",
  performed_by: "",
  date_completed: "",
  completion_remarks: "",
});

function MaintenanceRepair({ onLogout }) {
  const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState(createInitialFormState(storedUser));
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextReferenceCode, setNextReferenceCode] = useState(null);
  const [activeSection, setActiveSection] = useState("details");
  const role = (storedUser.role || "").toLowerCase();
  const isUserAccount = role === "user" || role === "staff";

  useEffect(() => {
    const storedId = sessionStorage.getItem("id");
    const storedName = sessionStorage.getItem("name");

    if (storedId) {
      fetch(`${API_BASE_URL}/users/${storedId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch user data");
          return res.json();
        })
        .then((data) => {
          setUserData(data);
          setFormData((prev) => ({
            ...prev,
            requester_name: data.name || storedName || "",
            user_id: storedId,
            signature: data.signature || null,
          }));
        })
        .catch((err) => {
          console.error("Error fetching user data: ", err);
        });
    }
  }, [storedUser.id]); // This dependency array is correct

  const availableDepartments = formData.branch
    ? departments.filter((dept) => {
        if (dept.branch_id === null || dept.branch_id === undefined) {
          return true;
        }
        const selected = branches.find(
          (branch) => branch.branch_name === formData.branch,
        );
        return selected
          ? Number(dept.branch_id) === Number(selected.id)
          : true;
      })
    : departments;

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
        const res = await fetch(
          `${API_BASE_URL}/api/maintenance_requests/next-code`,
        );
        if (!res.ok) {
          throw new Error("Failed to load next reference code");
        }
        const data = await res.json();
        if (isMounted) {
          setNextReferenceCode(data.nextCode || null);
        }
      } catch (error) {
        console.error("Error fetching next maintenance code:", error);
      } finally {
        setLoading(false);
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
              (branch.branch_name || "").toLowerCase() ===
              (storedUser.branch || "").toLowerCase(),
          );
          if (matchedBranch) {
            setFormData((prev) => ({
              ...prev,
              branch: matchedBranch.branch_name,
            }));
          }
        }

        if (deptData.length && storedUser.department) {
          const matchedDept = deptData.find(
            (dept) =>
              (dept.department_name || "").toLowerCase() ===
              storedUser.department.toLowerCase(),
          );
          if (matchedDept) {
            setFormData((prev) => ({
              ...prev,
              department: matchedDept.department_name,
            }));
          }
        }
      } catch (error) {
        console.error("Error loading maintenance lookups:", error);
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
      availableDepartments.some(
        (dept) => dept.department_name === formData.department,
      )
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
    if (!formData.date_needed) {
      showMessage("error", "Specify when the maintenance is needed.");
      return;
    }
    if (!formData.work_description.trim()) {
      showMessage("error", "Describe the work required.");
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
      date_needed: formData.date_needed,
      work_description: formData.work_description,
      asset_tag: formData.asset_tag,
      performed_by: formData.performed_by,
      date_completed: formData.date_completed,
      completion_remarks: formData.completion_remarks,
      submitted_by: storedUser.id || null,
    };

    console.log("Submitting payload:", payload);

    try {
      const res = await fetch(`${API_BASE_URL}/api/maintenance_requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit maintenance request.");
      }
      setRequest(data);
      showMessage(
        "success",
        "Maintenance/Repair Request submitted for approval.",
      );
    } catch (error) {
      console.error("Error submitting maintenance request:", error);
      showMessage(
        "error",
        error.message || "Unable to submit maintenance request.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const currentStatus = request?.status || "submitted";
  const isReadOnly = Boolean(request);

  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      navigate("/forms/maintenance-or-repair/submitted");
      return;
    }

    setActiveSection(sectionId);

    const mainContainer = document.getElementById("mr-main");
    const target = document.getElementById(sectionId);

    const header = mainContainer?.querySelector(".pr-topbar");

    if (mainContainer && target) {
      const headerHeight = header ? header.offsetHeight : 0;

      const targetTop = target.offsetTop;

      const scrollToPosition = targetTop - headerHeight;

      mainContainer.scrollTo({
        top: scrollToPosition < 0 ? 0 : scrollToPosition,
        behavior: "smooth",
      });
    }
  };

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading Maintenance/Repair Form</span>
      </div>
    );

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2
            onClick={handleBackToForms}
            style={{ cursor: "pointer", color: "#007bff" }}
            title="Back to Forms Library"
          >
            Maintenance/Repair
          </h2>
          <span>Standardized form</span>
        </div>
        <nav className="pr-sidebar-nav">
          {[
            { id: "details", label: "Request details" },
            { id: "description", label: "Work required" },
            { id: "completion", label: "Completion information" },
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
            Provide as much context as possible so facilities can respond
            quickly.
          </span>
          {onLogout && (
            <button
              type="button"
              className="pr-sidebar-logout"
              onClick={onLogout}
            >
              Sign out
            </button>
          )}
        </div>
      </aside>

      <main className="pr-main" id="mr-main">
        <header className="pr-topbar">
          <div>
            <h1 className="topbar-title">Maintenance/Repair Request</h1>
            <p className="pr-topbar-meta">
              Document maintenance needs and track completion through approvals.
            </p>
          </div>
          <div className="pr-reference-card">
            <span className="pr-reference-label">Reference code</span>
            <span className="pr-reference-value">
              {request?.form_code || nextReferenceCode || "Pending assignment"}
            </span>
            <span className="pr-reference-label">Request date</span>
            <span>
              {new Date(formData.request_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </header>

        {message && (
          <div className={`mr-alert mr-alert--${message.type}`}>
            {message.text}
          </div>
        )}

        <section className="pr-form-section" id="details">
          <h2 className="pr-section-title">Requestor details</h2>
          <p className="pr-section-subtitle">
            Confirm who is requesting the work and where the task will take
            place.
          </p>
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="requester_name">
                Name
              </label>
              <input
                id="requester_name"
                name="requester_name"
                value={formData.requester_name}
                onChange={handleFieldChange}
                className="pr-input"
                readOnly
              />
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="employee_id">
                Employee ID
              </label>
              <input
                type="text"
                id="employee_id"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleFieldChange}
                className="pr-input"
                readOnly
              />
            </div>
          </div>

          <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label" htmlFor="branch">
                  Branch
                </label>
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
                <label className="pr-label" htmlFor="department">
                  Department
                </label>
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
                      <option
                        key={department.id}
                        value={department.department_name}
                      >
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
            <div className="pr-field mr-signature-field">
              <label className="pr-label" htmlFor="signature">
                Signature
              </label>
              <input
                id="signature"
                name="signature"
                value={formData.signature || ""}
                onChange={handleFieldChange}
                className="pr-input"
                readOnly
                placeholder={!formData.signature ? "No signature on file" : ""}
              />
              {formData.signature && (
                <img
                  src={`${API_BASE_URL}/uploads/signatures/${formData.signature}`}
                  alt="Signature"
                  className="mr-signature-overlay"
                />
              )}
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="date_needed">
                Date needed
              </label>
              <input
                type="date"
                id="date_needed"
                name="date_needed"
                value={formData.date_needed}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </section>

        <section className="pr-form-section" id="description">
          <h2 className="pr-section-title">Description of work required</h2>
          <p className="pr-section-subtitle">
            Outline the issue and provide any asset references so maintenance
            can scope the work.
          </p>
          <div className="pr-field">
            <textarea
              id="work_description"
              name="work_description"
              value={formData.work_description}
              onChange={handleFieldChange}
              className="pr-textarea"
              rows={5}
              required
              disabled={isReadOnly}
            />
          </div>
          <div className="pr-field">
            <label className="pr-label" htmlFor="asset_tag">
              Asset tag / code (optional)
            </label>
            <input
              id="asset_tag"
              name="asset_tag"
              value={formData.asset_tag}
              onChange={handleFieldChange}
              className="pr-input"
              disabled={isReadOnly}
            />
          </div>
        </section>

        <section className="pr-form-section" id="completion">
          <h2 className="pr-section-title">Completion information</h2>
          <p className="pr-section-subtitle">
            Capture who will perform the work and when you expect the task to
            be completed.
          </p>
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="performed_by">
                Performed by
              </label>
              <input
                id="performed_by"
                name="performed_by"
                value={formData.performed_by}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="date_completed">
                Date completed
              </label>
              <input
                type="date"
                id="date_completed"
                name="date_completed"
                value={formData.date_completed}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
          </div>
          <div className="pr-field">
            <label className="pr-label" htmlFor="completion_remarks">
              Remarks
            </label>
            <textarea
              id="completion_remarks"
              name="completion_remarks"
              value={formData.completion_remarks}
              onChange={handleFieldChange}
              className="pr-textarea"
              rows={3}
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
            Submit for approval
          </button>
          {request && (
            <button
              type="button"
              className="pr-sidebar-logout"
              onClick={() => {
                setRequest(null);
                setFormData(createInitialFormState(storedUser));
                setNextReferenceCode(null);
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

export default MaintenanceRepair;