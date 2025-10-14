import { useEffect, useMemo, useState } from "react";
import "./PurchaseRequest.css";
import "./RevolvingFund.css";
import { API_BASE_URL } from "../config/api.js";
const emptyItem = () => ({
  entry_date: "",
  voucher_no: "",
  or_ref_no: "",
  amount: "",
  expense_category: "",
  gl_account: "",
  remarks: "",
});
const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};
function RevolvingFund({ onLogout }) {
  const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const [request, setRequest] = useState(null);
  const [formData, setFormData] = useState({
    custodian_name: storedUser.name || "",
    branch: storedUser.branch || "",
    department: storedUser.department || "",
    employee_id: storedUser.employee_id || "",
    request_date: new Date().toISOString().split("T")[0],
    petty_cash_amount: "",
  });
  const [items, setItems] = useState([emptyItem()]);
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [branchLocation, setBranchLocation] = useState("");
  const [nextReferenceCode, setNextReferenceCode] = useState(null);
  const role = (storedUser.role || "").toLowerCase();
  const isUserAccount = role === "user";
  const totalExpenses = useMemo(
    () => items.reduce((sum, item) => sum + parseNumber(item.amount), 0),
    [items],
  );
  const cashOnHand = useMemo(
    () => parseNumber(formData.petty_cash_amount) - totalExpenses,
    [formData.petty_cash_amount, totalExpenses],
  );
  useEffect(() => {
    if (!isUserAccount) {
      setMessage({
        type: "error",
        text: "Only user-level accounts can create revolving fund requests.",
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
        const res = await fetch(`${API_BASE_URL}/api/revolving_fund/next-code`);
        if (!res.ok) {
          throw new Error("Failed to load next reference code");
        }
        const data = await res.json();
        if (isMounted) {
          setNextReferenceCode(data.nextCode || null);
        }
      } catch (error) {
        console.error("Error fetching next revolving fund code:", error);
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
              branch.branch_name?.toLowerCase() === (storedUser.branch || "").toLowerCase(),
          );
          if (matchedBranch) {
            setFormData((prev) => ({ ...prev, branch: matchedBranch.branch_name }));
            setBranchLocation(matchedBranch.location || "");
          }
        }
        if (deptData.length && storedUser.department) {
          const matchedDept = deptData.find(
            (dept) =>
              dept.department_name?.toLowerCase() === storedUser.department.toLowerCase(),
          );
          if (matchedDept) {
            setFormData((prev) => ({ ...prev, department: matchedDept.department_name }));
          }
        }
      } catch (error) {
        console.error("Error loading revolving fund lookups:", error);
      }
    };
    loadLookups();
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
  const handleHeaderChange = (event) => {
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
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };
  const resetFormState = () => {
    setRequest(null);
    setItems([emptyItem()]);
    setFormData((prev) => ({
      ...prev,
      petty_cash_amount: "",
      request_date: new Date().toISOString().split("T")[0],
    }));
    setNextReferenceCode(null);
  };
  const availableDepartments = useMemo(() => {
    if (!formData.branch) {
      return departments;
    }
    const branchRecord = branches.find((branch) => branch.branch_name === formData.branch);
    if (!branchRecord) {
      return departments;
    }
    return departments.filter((dept) => {
      if (dept.branch_id === null || dept.branch_id === undefined) {
        return true;
      }
      return Number(dept.branch_id) === Number(branchRecord.id);
    });
  }, [branches, departments, formData.branch]);
  const syncStateFromResponse = (data) => {
    setRequest(data);
    setFormData((prev) => ({
      ...prev,
      custodian_name: data.custodian_name || "",
      branch: data.branch || "",
      department: data.department || "",
      employee_id: data.employee_id || "",
      request_date: data.request_date ? data.request_date.slice(0, 10) : prev.request_date,
      petty_cash_amount:
        data.petty_cash_amount !== undefined && data.petty_cash_amount !== null
          ? String(data.petty_cash_amount)
          : "",
    }));
    if (Array.isArray(data.items) && data.items.length > 0) {
      setItems(
        data.items.map((item) => ({
          entry_date: item.entry_date || item.date || "",
          voucher_no: item.voucher_no || "",
          or_ref_no: item.or_ref_no || "",
          amount:
            item.amount !== undefined && item.amount !== null ? String(item.amount) : "",
          expense_category: item.expense_category || "",
          gl_account: item.gl_account || "",
          remarks: item.remarks || "",
        })),
      );
    } else {
      setItems([emptyItem()]);
    }
  };
  const saveRequest = async (action = "draft") => {
    if (!isUserAccount) {
      return;
    }
    const hasLineItems = items.some((item) => parseNumber(item.amount) > 0);
    if (!hasLineItems) {
      showMessage("error", "Add at least one line item with an amount.");
      return;
    }
    if (!formData.petty_cash_amount) {
      showMessage("error", "Petty cash amount is required.");
      return;
    }
    setIsSaving(true);
    const payload = {
      custodian_name: formData.custodian_name,
      branch: formData.branch,
      department: formData.department,
      employee_id: formData.employee_id,
      petty_cash_amount: formData.petty_cash_amount,
      request_date: formData.request_date,
      items: items.map((item) => ({
        entry_date: item.entry_date,
        voucher_no: item.voucher_no,
        or_ref_no: item.or_ref_no,
        amount: item.amount,
        expense_category: item.expense_category,
        gl_account: item.gl_account,
        remarks: item.remarks,
      })),
      submitted_by: storedUser.id || null,
    };
    try {
      if (!request) {
        const res = await fetch(`${API_BASE_URL}/api/revolving_fund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, action }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to create request");
        }
        syncStateFromResponse(data);
        showMessage("success", action === "submit" ? "Submitted for approval." : "Draft saved.");
        return;
      }
      const updateRes = await fetch(`${API_BASE_URL}/api/revolving_fund/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updated.message || "Failed to update request");
      }
      let current = updated;
      if (action === "submit" && request.status !== "submitted") {
        const submitRes = await fetch(`${API_BASE_URL}/api/revolving_fund/${request.id}/submit`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submitted_by: storedUser.id || null }),
        });
        const submitData = await submitRes.json();
        if (!submitRes.ok) {
          throw new Error(submitData.message || "Failed to submit request");
        }
        current = submitData;
      }
      syncStateFromResponse(current);
      showMessage("success", action === "submit" ? "Submitted for approval." : "Changes saved.");
    } catch (err) {
      console.error(err);
      showMessage("error", err.message || "Unable to save request.");
    } finally {
      setIsSaving(false);
    }
  };
  const currentStatus = (request && request.status) || "draft";
  const isDraft = currentStatus === "draft" || currentStatus === "rejected";
  const isReadOnly = !isDraft;
  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2>Revolving Fund</h2>
          <span>{currentStatus.toUpperCase()}</span>
        </div>
        <nav className="pr-sidebar-nav">
          {["details", "totals", "items"].map((section) => (
            <button key={section} type="button" onClick={() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth" })}>
              {section === "details" && "Request details"}
              {section === "totals" && "Fund totals"}
              {section === "items" && "Line items"}
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
        <header className="pr-topbar">
          <div>
            <h1 className="topbar-title">Revolving Fund Replenishment</h1>
            <p className="pr-topbar-meta">Track fund usage and submit replenishment requests.</p>
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
                onChange={handleHeaderChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </span>
          </div>
        </header>
        {message && (
          <div
            style={{
              borderRadius: "0.75rem",
              padding: "0.8rem 1rem",
              marginBottom: "1rem",
              border: "1px solid var(--color-border)",
              color: message.type === "error" ? "var(--color-danger)" : "var(--color-accent)",
              background:
                message.type === "error"
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(36,207,142,0.12)",
            }}
          >
            {message.text}
          </div>
        )}
        <section className="pr-form-section" id="details">
          <h2 className="pr-section-title">Custodian details</h2>
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="custodian_name">Custodian</label>
              <input
                id="custodian_name"
                name="custodian_name"
                value={formData.custodian_name}
                onChange={handleHeaderChange}
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
        <section className="pr-form-section" id="totals">
          <h2 className="pr-section-title">Amount for replenishment</h2>
          <p className="pr-section-subtitle">Summarize petty cash usage and compute cash on hand.</p>
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="pettyCash">Petty cash / revolving fund (₱)</label>
              <input
                id="pettyCash"
                name="petty_cash_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.petty_cash_amount}
                onChange={handleHeaderChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
            <div className="pr-field">
              <label className="pr-label">Total expenses (₱)</label>
              <input
                value={totalExpenses.toFixed(2)}
                readOnly
                className="pr-input"
              />
            </div>
          </div>
          <div className="pr-field">
            <label className="pr-label">Cash on hand (₱)</label>
            <input value={cashOnHand.toFixed(2)} readOnly className="pr-input" />
          </div>
        </section>
        <section className="pr-items-card" id="items">
          <div className="pr-items-header">
            <div>
              <h2 className="pr-items-title">Expenses summary</h2>
              <p className="pr-section-subtitle">
                List each voucher with the amount and accounting details.
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
          <div className="rf-items-wrapper">
            <table className="pr-items-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Voucher No.</th>
                  <th>OR Ref. No.</th>
                  <th>Amount</th>
                  <th>Expense category</th>
                  <th>GL account</th>
                  <th>Remarks</th>
                  {!isReadOnly && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="date"
                        value={item.entry_date}
                        onChange={(event) =>
                          handleItemChange(index, "entry_date", event.target.value)
                        }
                        className="pr-input"
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.voucher_no}
                        onChange={(event) =>
                          handleItemChange(index, "voucher_no", event.target.value)
                        }
                        className="pr-input"
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.or_ref_no}
                        onChange={(event) =>
                          handleItemChange(index, "or_ref_no", event.target.value)
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
                        value={item.gl_account}
                        onChange={(event) => handleItemChange(index, "gl_account", event.target.value)}
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
                  <td colSpan={3} style={{ textAlign: "right", fontWeight: 600 }}>
                    TOTAL
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {"\u20B1"} {totalExpenses.toFixed(2)}
                  </td>
                  <td colSpan={isReadOnly ? 3 : 4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
        <div className="pr-form-actions">
          <button
            type="button"
            className="pr-submit"
            style={{ background: "linear-gradient(135deg,#3ecf8e,#2bb473)" }}
            onClick={() => saveRequest("submit")}
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
export default RevolvingFund;
