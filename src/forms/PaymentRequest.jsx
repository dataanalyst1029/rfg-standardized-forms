import { useEffect, useMemo, useState } from "react";
import "./PurchaseRequest.css";
import "./PaymentRequest.css";
import { API_BASE_URL } from "../config/api.js";

const emptyItem = () => ({
  description: "",
  quantity: "",
  unit_price: "",
  amount: "",
  budget_code: "",
});

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatAmount = (value) => parseNumber(value).toFixed(2);

function PaymentRequest({ onLogout }) {
  const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const role = (storedUser.role || "").toLowerCase();
  const isUserAccount = role === "user";

  const createInitialFormState = () => ({
    requester_name: storedUser.name || "",
    branch: storedUser.branch || "",
    department: storedUser.department || "",
    employee_id: storedUser.employee_id || "",
    request_date: new Date().toISOString().split("T")[0],
    vendor_name: "",
    pr_number: "",
    date_needed: "",
    purpose: "",
  });

  const [request, setRequest] = useState(null);
  const [formData, setFormData] = useState(createInitialFormState);
  const [items, setItems] = useState([emptyItem()]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextReferenceCode, setNextReferenceCode] = useState(null);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + parseNumber(item.amount), 0),
    [items],
  );

  const availableDepartments = useMemo(() => {
    if (!formData.branch) {
      return [];
    }
    const branchRecord = branches.find((branch) => branch.branch_name === formData.branch);
    if (!branchRecord) {
      return [];
    }
    return departments.filter(
      (dept) =>
        dept.branch_id !== null &&
        dept.branch_id !== undefined &&
        Number(dept.branch_id) === Number(branchRecord.id),
    );
  }, [branches, departments, formData.branch]);

  useEffect(() => {
    if (!isUserAccount) {
      setMessage({
        type: "error",
        text: "Only user-level accounts can create payment requests.",
      });
    }
  }, [isUserAccount]);

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
          }
        }

        if (deptData.length && storedUser.department) {
          setFormData((prev) => ({ ...prev, department: storedUser.department }));
        }
      } catch (error) {
        console.error("Error loading payment request lookups:", error);
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
      return;
    }
    const branchDepartments = availableDepartments;
    if (
      formData.department &&
      branchDepartments.some((dept) => dept.department_name === formData.department)
    ) {
      return;
    }
    if (branchDepartments.length === 0) {
      if (formData.department !== "") {
        setFormData((prev) => ({ ...prev, department: "" }));
      }
      return;
    }
    const firstDepartment = branchDepartments[0]?.department_name || "";
    if (firstDepartment === formData.department) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      department: firstDepartment,
    }));
  }, [formData.branch, availableDepartments, formData.department]);

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
        const res = await fetch(`${API_BASE_URL}/api/payment_request/next-code`);
        if (!res.ok) {
          throw new Error("Failed to load next reference code.");
        }
        const data = await res.json();
        if (isMounted) {
          setNextReferenceCode(data.nextCode || null);
        }
      } catch (error) {
        console.error("Error fetching next payment request code:", error);
      }
    };

    fetchNextCode();

    return () => {
      isMounted = false;
    };
  }, [request]);

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

  const handleDepartmentChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, department: value }));
  };

  const updateItemValue = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) {
          return item;
        }
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unit_price") {
          const quantity = parseNumber(field === "quantity" ? value : updated.quantity);
          const unitPrice = parseNumber(field === "unit_price" ? value : updated.unit_price);
          const computed = quantity * unitPrice;
          updated.amount = computed > 0 ? computed.toFixed(2) : "";
        }
        return updated;
      }),
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
      requester_name: data.requester_name || "",
      branch: data.branch || "",
      department: data.department || "",
      employee_id: data.employee_id || "",
      request_date: data.request_date ? data.request_date.slice(0, 10) : new Date().toISOString().split("T")[0],
      vendor_name: data.vendor_name || "",
      pr_number: data.pr_number || "",
      date_needed: data.date_needed ? data.date_needed.slice(0, 10) : "",
      purpose: data.purpose || "",
    });
    const normalizedItems =
      Array.isArray(data.items) && data.items.length
        ? data.items.map((item) => ({
            description: item.description || "",
            quantity:
              item.quantity !== undefined && item.quantity !== null ? String(item.quantity) : "",
            unit_price:
              item.unit_price !== undefined && item.unit_price !== null
                ? String(item.unit_price)
                : "",
            amount:
              item.amount !== undefined && item.amount !== null ? String(item.amount) : "",
            budget_code: item.budget_code || "",
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
    if (!formData.branch) {
      showMessage("error", "Select the branch that owns this payment.");
      return;
    }
    if (!formData.department && availableDepartments.length > 0) {
      showMessage("error", "Select the corresponding department.");
      return;
    }
    if (!formData.vendor_name.trim()) {
      showMessage("error", "Vendor or supplier name is required.");
      return;
    }
    if (!formData.purpose.trim()) {
      showMessage("error", "Please describe the purpose for this payment.");
      return;
    }

    const cleanedItems = items
      .map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        budget_code: item.budget_code.trim(),
      }))
      .filter(
        (item) =>
          item.description ||
          parseNumber(item.quantity) > 0 ||
          parseNumber(item.unit_price) > 0 ||
          parseNumber(item.amount) > 0 ||
          item.budget_code,
      );

    if (cleanedItems.length === 0) {
      showMessage("error", "Add at least one line item with an amount.");
      return;
    }

    if (!cleanedItems.some((item) => parseNumber(item.amount) > 0)) {
      showMessage("error", "Line item amount must be greater than zero.");
      return;
    }

    setIsSaving(true);

    const payloadItems = cleanedItems.map((item) => {
      const quantity = parseNumber(item.quantity);
      const unitPrice = parseNumber(item.unit_price);
      const computed = quantity * unitPrice;
      return {
        description: item.description,
        quantity,
        unit_price: unitPrice,
        amount: computed > 0 ? computed : parseNumber(item.amount),
        budget_code: item.budget_code,
      };
    });

    const payload = {
      requester_name: formData.requester_name,
      branch: formData.branch,
      department: formData.department,
      employee_id: formData.employee_id,
      request_date: formData.request_date,
      vendor_name: formData.vendor_name,
      pr_number: formData.pr_number,
      date_needed: formData.date_needed,
      purpose: formData.purpose,
      items: payloadItems,
      submitted_by: storedUser.id || null,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/payment_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit payment request.");
      }
      syncStateFromResponse(data);
      showMessage("success", "Payment request submitted for approval.");
    } catch (error) {
      console.error("Error submitting payment request:", error);
      showMessage("error", error.message || "Unable to submit payment request.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentStatus = request?.status || "new";
  const isReadOnly = Boolean(request);

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2>Payment Request</h2>
          <span>{currentStatus.toUpperCase()}</span>
        </div>
        <nav className="pr-sidebar-nav">
          {[
            { id: "details", label: "Request details" },
            { id: "vendor", label: "Vendor info" },
            { id: "items", label: "Line items" },
            { id: "purpose", label: "Purpose" },
            { id: "signatories", label: "Signatories" },
          ].map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() =>
                document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" })
              }
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
        <header className="pr-topbar">
          <div>
            <h1 className="topbar-title">Request for Payment</h1>
            <p className="pr-topbar-meta">
              Capture payable details and route for approval ahead of disbursement.
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
          <div className={`pay-alert pay-alert--${message.type}`}>
            {message.text}
          </div>
        )}

        <section className="pr-form-section" id="details">
          <h2 className="pr-section-title">Requester details</h2>
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
              <label className="pr-label" htmlFor="branch">Branch / Department</label>
              <select
                id="branch"
                name="branch"
                value={formData.branch}
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
              {availableDepartments.length > 0 ? (
                <select
                  id="department"
                  name="department"
                  value={formData.department}
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
              ) : (
                <input
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleDepartmentChange}
                  className="pr-input"
                  disabled={isReadOnly}
                  placeholder="No departments configured"
                />
              )}
            </div>
          </div>
        </section>

        <section className="pr-form-section" id="vendor">
          <h2 className="pr-section-title">Vendor / supplier information</h2>
          <p className="pr-section-subtitle">
            Identify the payee and relevant references for this payment.
          </p>
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="vendor_name">Vendor / Supplier</label>
              <input
                id="vendor_name"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="pr_number">PR number (if applicable)</label>
              <input
                id="pr_number"
                name="pr_number"
                value={formData.pr_number}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
          </div>
          <div className="pr-field">
            <label className="pr-label" htmlFor="date_needed">Date needed</label>
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
        </section>

        <section className="pr-form-section" id="purpose">
          <h2 className="pr-section-title">Purpose</h2>
          <p className="pr-section-subtitle">
            Describe what this payment covers.
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

        <section className="pr-items-card" id="items">
          <div className="pr-items-header">
            <div>
              <h2 className="pr-items-title">Payment breakdown</h2>
              <p className="pr-section-subtitle">
                Itemize the payable with quantities, pricing, and budget source codes.
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
          <div className="pay-items-wrapper">
            <table className="pr-items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Amount</th>
                  <th>Budget source / code</th>
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
                          updateItemValue(index, "description", event.target.value)
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
                        value={item.quantity}
                        onChange={(event) =>
                          updateItemValue(index, "quantity", event.target.value)
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
                        value={item.unit_price}
                        onChange={(event) =>
                          updateItemValue(index, "unit_price", event.target.value)
                        }
                        className="pr-input"
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        value={item.amount ? formatAmount(item.amount) : ""}
                        readOnly
                        className="pr-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.budget_code}
                        onChange={(event) =>
                          updateItemValue(index, "budget_code", event.target.value)
                        }
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
                    {"\u20B1"} {totalAmount.toFixed(2)}
                  </td>
                  <td colSpan={isReadOnly ? 1 : 2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="pay-total-card">
            <span className="pay-total-label">Grand total</span>
            <span className="pay-total-amount">{"\u20B1"} {totalAmount.toFixed(2)}</span>
          </div>
        </section>

        <section className="pr-form-section" id="signatories">
          <h2 className="pr-section-title">Routing & signatures</h2>
          <p className="pr-section-subtitle">
            Requested by entries come from the submitter. Approved by, Received by, and Accounting
            fields populate automatically as staff processes the request.
          </p>
          <div className="pay-signature-grid">
            <div>
              <span className="pay-signature-label">Requested by</span>
              <span className="pay-signature-value">
                {formData.requester_name || "Pending assignment"}
              </span>
            </div>
            <div>
              <span className="pay-signature-label">Approved by</span>
              <span className="pay-signature-value">
                {request?.approved_by || "Awaiting approval"}
              </span>
            </div>
            <div>
              <span className="pay-signature-label">Received by</span>
              <span className="pay-signature-value">
                {request?.received_by || "Pending release"}
              </span>
            </div>
          </div>
        </section>

        <section className="pr-form-section pay-accounting-note" id="accounting">
          <h2 className="pr-section-title">Accounting department use only</h2>
          <p className="pr-section-subtitle">
            Staff-level accounts capture GL, OR, and check details after the request is approved.
          </p>
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

export default PaymentRequest;
