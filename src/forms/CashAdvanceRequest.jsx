import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PurchaseRequest.css";
import "./CashAdvanceRequest.css";
import { API_BASE_URL } from "../config/api.js";

const emptyItem = () => ({
  description: "",
  amount: "",
  expense_category: "",
  store_branch: "",
  remarks: "",
});

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

function CashAdvanceRequest({ onLogout }) {
  const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const navigate = useNavigate();
  const handleBackToForms = () => {
    navigate("/forms-list");
  };
  const [activeSection, setActiveSection] = useState("details");
  const role = (storedUser.role || "").toLowerCase();
  const isUserAccount = role === "user";

  const createInitialFormState = () => ({
    custodian_name: storedUser.name || "",
    branch: storedUser.branch || "",
    department: storedUser.department || "",
    employee_id: storedUser.employee_id || "",
    request_date: new Date().toISOString().split("T")[0],
    signature: storedUser.name || "",
    nature_of_activity: "",
    inclusive_dates: "",
    purpose: "",
  });

  const [request, setRequest] = useState(null);
  const [formData, setFormData] = useState(createInitialFormState);
  const [items, setItems] = useState([emptyItem()]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [branchLocation, setBranchLocation] = useState("");
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextReferenceCode, setNextReferenceCode] = useState(null);

  const availableDepartments = useMemo(() => {
    if (!formData.branch) {
      return departments;
    }
    const selected = branches.find((branch) => branch.branch_name === formData.branch);
    if (!selected) {
      return departments;
    }
    const filtered = departments.filter(
      (dept) =>
        dept.branch_id !== null &&
        dept.branch_id !== undefined &&
        Number(dept.branch_id) === Number(selected.id),
    );
    return filtered.length > 0 ? filtered : departments;
  }, [branches, departments, formData.branch]);

  const grandTotal = useMemo(
    () => items.reduce((sum, item) => sum + parseNumber(item.amount), 0),
    [items],
  );

  useEffect(() => {
    if (!isUserAccount) {
      setMessage({
        type: "error",
        text: "Only user-level accounts can create cash advance requests.",
      });
    }
  }, [isUserAccount]);

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
        const res = await fetch(`${API_BASE_URL}/api/cash_advance/next-code`);
        if (!res.ok) {
          throw new Error("Failed to load next reference code");
        }
        const data = await res.json();
        if (isMounted) {
          setNextReferenceCode(data.nextCode || null);
        }
      } catch (error) {
        console.error("Error fetching next cash advance code:", error);
      }
    };
    fetchNextCode();
    return () => {
      isMounted = false;
    };
  }, [request]);

  useEffect(() => {
    let isMounted = true;

    const loadLookups = async () => {
      try {
        const [branchRes, deptRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/branches`),
          fetch(`${API_BASE_URL}/api/departments`),
        ]);
        const branchData = branchRes.ok ? await branchRes.json() : [];
        const deptData = deptRes.ok ? await deptRes.json() : [];
        if (!isMounted) {
          return;
        }
        setBranches(branchData);
        setDepartments(deptData);
        if (branchData.length) {
          const baseBranch = (storedUser.branch || formData.branch || "").toLowerCase();
          const matchedBranch = branchData.find(
            (branch) => (branch.branch_name || "").toLowerCase() === baseBranch,
          );
          if (matchedBranch) {
            setFormData((prev) => ({ ...prev, branch: matchedBranch.branch_name }));
            setBranchLocation(matchedBranch.location || "");
          }
        }
        if (deptData.length) {
          const baseDepartment = (storedUser.department || formData.department || "").toLowerCase();
          if (baseDepartment) {
            const matchedDepartment = deptData.find(
              (dept) => (dept.department_name || "").toLowerCase() === baseDepartment,
            );
            if (matchedDepartment) {
              setFormData((prev) => ({ ...prev, department: matchedDepartment.department_name }));
            }
          }
        }
      } catch (error) {
        console.error("Error loading cash advance lookups:", error);
      }
    };

    loadLookups();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedUser.branch, storedUser.department]);

  useEffect(() => {
    if (!formData.branch) {
      setBranchLocation("");
      return;
    }
    const selected = branches.find((branch) => branch.branch_name === formData.branch);
    setBranchLocation(selected?.location || "");
  }, [formData.branch, branches]);

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
    const selected = branches.find((branch) => branch.branch_name === value);
    const branchDepartments = selected
      ? departments.filter(
          (dept) =>
            dept.branch_id !== null &&
            dept.branch_id !== undefined &&
            Number(dept.branch_id) === Number(selected.id),
        )
      : [];
    setFormData((prev) => ({
      ...prev,
      branch: value,
      department: branchDepartments.length > 0 ? branchDepartments[0].department_name : "",
    }));
    setBranchLocation(selected?.location || "");
  };

  const handleDepartmentChange = (event) => {
    setFormData((prev) => ({ ...prev, department: event.target.value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const removeItemRow = (index) => {
    setItems((prev) => {
      if (prev.length === 1) {
        return [emptyItem()];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const syncStateFromResponse = (data) => {
    setRequest(data);
    setNextReferenceCode(null);
    setFormData({
      custodian_name: data.custodian_name || "",
      branch: data.branch || "",
      department: data.department || "",
      employee_id: data.employee_id || "",
      request_date: data.request_date ? data.request_date.slice(0, 10) : new Date().toISOString().split("T")[0],
      signature: data.signature || storedUser.name || "",
      nature_of_activity: data.nature_of_activity || "",
      inclusive_dates: data.inclusive_dates || "",
      purpose: data.purpose || "",
    });
    const normalizedItems =
      Array.isArray(data.items) && data.items.length > 0
        ? data.items.map((item) => ({
            description: item.description || "",
            amount:
              item.amount !== undefined && item.amount !== null
                ? String(item.amount)
                : "",
            expense_category: item.expense_category || "",
            store_branch: item.store_branch || "",
            remarks: item.remarks || "",
          }))
        : [emptyItem()];
    setItems(normalizedItems);
  };

  const resetFormState = () => {
    setRequest(null);
    setFormData(createInitialFormState());
    setItems([emptyItem()]);
    setMessage(null);
    setNextReferenceCode(null);
  };

  const submitRequest = async () => {
    if (!isUserAccount) {
      return;
    }
    if (!formData.custodian_name.trim()) {
      showMessage("error", "Custodian name is required.");
      return;
    }
    if (!formData.branch) {
      showMessage("error", "Select the branch handling this request.");
      return;
    }
    if (!formData.department) {
      showMessage("error", "Select the requesting department.");
      return;
    }
    if (!formData.purpose.trim()) {
      showMessage("error", "Describe the purpose for the cash advance.");
      return;
    }
    const cleanedItems = items
      .map((item) => ({
        description: (item.description || "").trim(),
        amount: item.amount,
        expense_category: (item.expense_category || "").trim(),
        store_branch: (item.store_branch || "").trim(),
        remarks: (item.remarks || "").trim(),
      }))
      .filter(
        (item) =>
          item.description ||
          parseNumber(item.amount) > 0 ||
          item.expense_category ||
          item.store_branch ||
          item.remarks,
      );
    if (cleanedItems.length === 0) {
      showMessage("error", "Add at least one cash advance line with an amount.");
      return;
    }
    if (!cleanedItems.some((item) => parseNumber(item.amount) > 0)) {
      showMessage("error", "Provide an amount greater than zero on at least one line.");
      return;
    }

    setIsSaving(true);

    const payload = {
      custodian_name: formData.custodian_name,
      branch: formData.branch,
      department: formData.department,
      employee_id: formData.employee_id,
      request_date: formData.request_date,
      signature: formData.signature,
      nature_of_activity: formData.nature_of_activity,
      inclusive_dates: formData.inclusive_dates,
      purpose: formData.purpose,
      items: cleanedItems,
      submitted_by: storedUser.id || null,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/cash_advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit cash advance request.");
      }
      syncStateFromResponse(data);
      showMessage("success", "Cash advance request submitted for approval.");
    } catch (error) {
      console.error("Error submitting cash advance request:", error);
      showMessage("error", error.message || "Unable to submit cash advance request.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      navigate("/forms/cash-advance-request/submitted");
      return;
    }
    setActiveSection(sectionId);
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const currentStatus = request?.status || "draft";
  const isReadOnly = currentStatus !== "draft";

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2>Cash Advance</h2>
          <span>{currentStatus.toUpperCase()}</span>
        </div>
        <nav className="pr-sidebar-nav">
          {[
            { id: "details", label: "Request details" },
            { id: "activity", label: "Activity info" },
            { id: "items", label: "Line items" },
            { id: "purpose", label: "Purpose" },
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
            Remember to review line items before submitting.
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
            <h1 className="topbar-title">Cash Advance Request</h1>
            <p className="pr-topbar-meta">
              Submit an advance for upcoming initiatives and track the approval status.
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
          </div>
        </header>

        {message && (
          <div
            className={`ca-alert ca-alert--${message.type}`}
          >
            {message.text}
          </div>
        )}

        <section className="pr-form-section" id="details">
          <h2 className="pr-section-title">Custodian profile</h2>
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="custodian_name">Custodian</label>
              <input
                id="custodian_name"
                name="custodian_name"
                value={formData.custodian_name}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="employee_id">Employee ID</label>
              <input
                id="employee_id"
                name="employee_id"
                value={formData.employee_id}
                className="pr-input"
                readOnly
              />
            </div>
          </div>
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="branchSelect">Branch</label>
              <select
                id="branchSelect"
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
              <label className="pr-label" htmlFor="branchLocation">Location</label>
              <input
                id="branchLocation"
                value={branchLocation}
                className="pr-input"
                readOnly
              />
            </div>
          </div>
          <div className="pr-field">
            <label className="pr-label" htmlFor="departmentSelect">Department</label>
            <select
              id="departmentSelect"
              value={formData.department || ""}
              onChange={handleDepartmentChange}
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
          </div>
        </section>

        <section className="pr-form-section" id="activity">
          <h2 className="pr-section-title">Activity details</h2>
          <p className="pr-section-subtitle">
            Tell finance when the advance is needed and what it will cover.
          </p>
          <div className="pr-field">
            <label className="pr-label" htmlFor="signature">Signature</label>
            <input
              type="text"
              id="signature"
              name="signature"
              value={formData.signature}
              onChange={handleFieldChange}
              className="pr-input"
              disabled={isReadOnly}
            />
          </div>
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="nature_of_activity">Nature of activity</label>
              <textarea
                id="nature_of_activity"
                name="nature_of_activity"
                value={formData.nature_of_activity}
                onChange={handleFieldChange}
                className="pr-textarea"
                rows={3}
                disabled={isReadOnly}
              />
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="inclusive_dates">Inclusive dates</label>
              <input
                type="text"
                id="inclusive_dates"
                name="inclusive_dates"
                value={formData.inclusive_dates}
                onChange={handleFieldChange}
                className="pr-input"
                placeholder="e.g. March 4-6, 2026"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </section>

        <section className="pr-items-card" id="items">
          <div className="pr-items-header">
            <div>
              <h2 className="pr-items-title">Requested amounts</h2>
              <p className="pr-section-subtitle">
                Break down each requested advance with the expense category and store assignment.
              </p>
            </div>
            <button
              type="button"
              className="pr-items-add"
              onClick={addItemRow}
              disabled={isReadOnly}
            >
              Add line item
            </button>
          </div>
          <div className="ca-items-wrapper">
            <table className="pr-items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Expense category</th>
                  <th>Store / branch</th>
                  <th>Remarks</th>
                  {!isReadOnly && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(event) =>
                          handleItemChange(index, "description", event.target.value)
                        }
                        className="pr-input"
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={(event) =>
                          handleItemChange(index, "amount", event.target.value)
                        }
                        className="pr-input"
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.expense_category}
                        onChange={(event) =>
                          handleItemChange(index, "expense_category", event.target.value)
                        }
                        className="pr-input"
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.store_branch}
                        onChange={(event) =>
                          handleItemChange(index, "store_branch", event.target.value)
                        }
                        className="pr-input"
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={(event) => handleItemChange(index, "remarks", event.target.value)}
                        className="pr-input"
                        disabled={isReadOnly}
                      />
                    </td>
                    {!isReadOnly && (
                      <td>
                        <button
                          type="button"
                          className="pr-table-action"
                          onClick={() => removeItemRow(index)}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={1} style={{ textAlign: "right", fontWeight: 600 }}>
                    TOTAL
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {"\u20B1"} {grandTotal.toFixed(2)}
                  </td>
                  <td colSpan={isReadOnly ? 3 : 4} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="ca-total-card">
            <span className="ca-total-label">Grand total</span>
            <span className="ca-total-amount">{"\u20B1"} {grandTotal.toFixed(2)}</span>
          </div>
        </section>

        <section className="pr-form-section" id="purpose">
          <h2 className="pr-section-title">Purpose for cash advance</h2>
          <p className="pr-section-subtitle">
            Provide the context for this request so approvers can validate the need.
          </p>
          <div className="pr-field">
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
            Submit for approval
          </button>
          {request && (
            <button
              type="button"
              className="pr-sidebar-logout"
              onClick={resetFormState}
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

export default CashAdvanceRequest;
