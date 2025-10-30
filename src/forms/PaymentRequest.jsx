import { useEffect, useMemo, useState } from "react";
import "./styles/PurchaseRequest.css";
import "./styles/CashAdvanceRequest.css";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const initialFormData = {
  prf_request_code: "",
  request_date: new Date().toISOString().split("T")[0],
  employee_id: "",
  name: "",
  user_id: "",
  branch: "",
  department: "",
  vendor_supplier: "",
  pr_number: "",
  date_needed: new Date().toISOString().split("T")[0], 
  total_amount: "",
  purpose: "",
  requested_by: "",
  requested_signature: "",
};

const emptyItem = { 
  item: "", 
  quantity: "", 
  unit_price: "", 
  amount: "", 
  expense_charges: "",
  location: "" 
};

const NAV_SECTIONS = [
  { id: "pr-main", label: "New Payment Request" },
  { id: "submitted", label: "View Submitted Requests" },
];

function PurchaseRequest({ onLogout }) {
  const [formData, setFormData] = useState(initialFormData);
  const [items, setItems] = useState([emptyItem]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [activeSection, setActiveSection] = useState("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: "", message: "" });
  const [userData, setUserData] = useState({ name: "", contact_no: "" });
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);

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
            name: data.name || storedName || "",
            user_id: storedId,
            contact_no: data.contact_no || "",
            employee_id: data.employee_id || "",
            requested_by: data.name || "",
            requested_signature: data.signature || "",

          }));
        })
        .catch((err) => {
          console.error("Error fetching user data:", err);
          setFormData((prev) => ({
            ...prev,
            employee_id: data.employee_id || "",
            name: storedName || "",
            user_id: storedId,
          }));
        });
    }
  }, []);

  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payment_request/next-code`);
        if (!res.ok) throw new Error("Failed to retrieve next reference number");
        const data = await res.json();
        if (data.nextCode) {
          setFormData((prev) => ({ ...prev, prf_request_code: data.nextCode }));
        }
      } catch (error) {
        console.error("Error fetching next code", error);
        setModal({
          isOpen: true,
          type: "error",
          message: "Unable to load the next ca request reference.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchNextCode();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [branchRes, deptRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/branches`),
          fetch(`${API_BASE_URL}/api/departments`),
        ]);
        if (!branchRes.ok || !deptRes.ok) throw new Error("Failed to fetch data");
        const branchData = await branchRes.json();
        const deptData = await deptRes.json();
        setBranches(branchData);
        setDepartments(deptData);
      } catch (error) {
        console.error("Error loading branch/department data:", error);
        setModal({
          isOpen: true,
          type: "error",
          message: "Unable to load branches and departments.",
        });
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.branch) {
      const filtered = departments.filter(
        (dept) => dept.branch_name === formData.branch
      );
      setFilteredDepartments(filtered);
      setFormData((prev) => ({ ...prev, department: "" }));
    } else {
      setFilteredDepartments([]);
    }
  }, [formData.branch, departments]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, event) => {
    const { name, value } = event.target;

    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [name]: value };

      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      item.amount = (quantity * unitPrice).toFixed(2);

      next[index] = item;
      return next;
    });
  };


  const addItemRow = () => setItems((prev) => [...prev, emptyItem]);
  const removeItemRow = (index) =>
    setItems((prev) =>
      prev.length === 1 ? [emptyItem] : prev.filter((_, i) => i !== index)
    );

  const sanitizedItems = useMemo(
    () =>
      items
        .map((item) => ({
          item: item.item,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          expense_charges: item.expense_charges,
          location: item.location || "",
        }))
        .filter((item) => item.item && item.amount),
    [items]
  );

  const handleCutoffChange = (date) => {
    if (!date) return;

    const formattedDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    ).toISOString().split("T")[0];

    setFormData((prev) => ({
      ...prev,
      cutoff_date: formattedDate,
    }));
  };

  const isValidCutoffDate = (date) => {
    const day = date.getDate();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return day === 15 || day === lastDay;
  };



  const totalAmount = sanitizedItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    if (sanitizedItems.length === 0) {
      return setModal({
        isOpen: true,
        type: "error",
        message: "Add at least one line item before submitting.",
      });
    }

    let currentPRCode = formData.prf_request_code;

    try {
      const res = await fetch(`${API_BASE_URL}/api/payment_request/next-code`);
      const data = await res.json();
      if (data.nextCode) currentPRCode = data.nextCode;
    } catch (error) {
      return setModal({
        isOpen: true,
        type: "error",
        message: "Unable to get the latest PR number.",
      });
    }

    const payload = {
      ...formData,
      prf_request_code: currentPRCode,
      total_amount: totalAmount,
      items: sanitizedItems,
    };

    try {
  const res = await fetch(`${API_BASE_URL}/api/payment_request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to submit request");

  setMessage({
    type: "success",
    text: `Payment Request ${currentPRCode} submitted successfully.`,
  });

  setTimeout(() => {
    setMessage(null);
    window.location.reload();
  }, 2000);

} catch (error) {
  console.error("Error submitting purchase request", error);
  setMessage({
    type: "error",
    text: error.message || "Unable to submit purchase request. Please try again.",
  });

  setTimeout(() => setMessage(null), 3000);
}

  };

  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      navigate("/submitted-cash-advance-budget-request"); 
    } else {
      setActiveSection(sectionId);
      const element = document.getElementById(sectionId);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading)
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>Loading Payment Request Form…</span>
    </div>
  );

  return (
    <div className="pr-layout">

      {message && (
        <div className="message-modal-overlay">
          <div className={`message-modal-content ${message.type}`}>
            {message.text}
          </div>
        </div>
      )}
      
      {modal.isOpen && (
        <div className="pr-modal-overlay">
          <div className={`pr-modal ${modal.type}`}>
            <p>{modal.message}</p>
            <button
              onClick={() => {
                setModal({ ...modal, isOpen: false });
                if (modal.type === "success") {
                  window.location.reload();
                }
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2 
            onClick={() => navigate("/forms-list")} 
            style={{ cursor: "pointer", color: "#007bff" }}
            title="Back to Forms Library"
          >
            Payment Request
          </h2>
          <span>Standardized form</span>
        </div>

        <nav className="pr-sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === "pr-main" ? "is-active" : ""}
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
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main" id="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>New Payment Request</h1>
            <p className="pr-topbar-meta">
              Capture payable details and route for approval ahead of disbursement.
            </p>
          </div>

          <div className="pr-reference-card">
            <span className="pr-reference-label">Reference code</span>
            <span className="pr-reference-value">
              {formData.prf_request_code || "—"}
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

        <form onSubmit={handleSubmit}>
          <section className="pr-form-section" id="details">
            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label" htmlFor="employeeID">
                  Employee ID
                </label>
                <input
                  id="employeeID"
                  name="employee_id"
                  value={userData.employee_id}
                  className="pr-input"
                  readOnly
                  required
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  value={userData.name}
                  onChange={handleChange}
                  className="pr-input"
                  placeholder="Full name"
                  readOnly
                  required
                />
                <input
                  type="hidden"
                  id="requestById"
                  name="user_id"
                  value={formData.user_id} 
                  className="pr-input"
                  placeholder="User ID"
                  readOnly
                />
              </div>
            </div>
            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label" htmlFor="branch">Branch</label>
                <select
                  id="branch"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="pr-input"
                  required
                >
                  <option value="" disabled>Select branch</option>
                  {branches.map((b) => (
                    <option key={b.branch_name} value={b.branch_name}>
                      {b.branch_name}
                    </option>
                  ))}
                </select>
              </div>


              <div className="pr-field">
                <label className="pr-label" htmlFor="department">Department</label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="pr-input"
                  required
                >
                  <option value="" disabled>Select department</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.department_name} value={d.department_name}>
                      {d.department_name}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </section>

          <section className="pr-form-section" id="vendor-supplier-information">
            <h2 className="pr-section-title">Vendor / Supplier Information</h2>
            {/* <p className="pr-section-subtitle">
              Identify the payee and relevant references for this payment.
            </p> */}
            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label" htmlFor="payee-name">Vendor/Supplier (Payee's Name)</label>
                <input
                  type="text"
                  name="vendor_supplier"
                  value={formData.vendor_supplier}
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>

              <div className="pr-field">
                <label className="pr-label" htmlFor="pr-number">PR Number (if applicable)</label>
                <input
                  type="text"
                  name="pr_number"
                  value={formData.pr_number}
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>
            </div>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label" htmlFor="date-needed">Date Needed</label>
                <input
                  type="date"
                  name="date_needed"
                  value={formData.date_needed}
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>

              <div className="pr-field">
                <label className="pr-label" htmlFor="pr-number">Purpose</label>
                <textarea
                  id="purposeText"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  className="cabr-textarea"
                  placeholder="Purpose of the payment request"
                  rows={1}
                  required
                />
              </div>
            </div>
          </section>

          <section className="pr-items-card" id="items">
            <div className="pr-items-header">
              <p className="pr-section-subtitle">
              </p>
              <button type="button" className="pr-items-add" onClick={addItemRow}>
                Add item
              </button>
            </div>

            <div className="table-wrapper">
              <table className="pr-items-table">
                <thead>
                  <tr>
                    <th className="text-center">Item</th>
                    <th className="text-center">Quantity</th>
                    <th className="text-center">Unit Price</th>
                    <th className="text-center">Amount</th>
                    <th className="text-center">Expense Charges</th>
                    <th className="text-center">Location (Store/Branch)</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="pr-items-empty">
                        No items yet. Add an item to get started.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="text"
                            name="item"
                            value={item.item}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            required
                          />
                        </td>
                        
                        <td>
                          <input
                            type="number"
                            name="quantity"
                            min="1"
                            value={item.quantity}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            name="unit_price"
                            min="1"
                            value={item.unit_price}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            name="amount"
                            value={item.amount}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            name="expense_charges"
                            value={item.expense_charges}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            name="location"
                            value={item.location}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            required
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="pr-table-action"
                            onClick={() => removeItemRow(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="rfr-items-total">
                    <td colSpan={3}>
                      Total:
                    </td>
                    <td><input type="text" name="total_amount" className="rfr-input-total" value={items
                        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
                        .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} readOnly />
                    </td>
                    <td colSpan={4}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rfr-form-section" id="signature">
              <h2 className="rfr-section-title">Signature Details</h2>

              <div className="signature-details">
                <label htmlFor="requested_by">
                  <input
                    type="text"
                    name="requested_by"
                    value={formData.requested_by || userData.name || ""}
                    onChange={handleChange}
                  />
                  <p>Requested by:</p>
                </label>
                <label htmlFor="submitted-signature" class="signature-by">
                  {userData.signature ? (
                    <img
                      src={`${API_BASE_URL}/uploads/signatures/${userData.signature}`}
                      alt="Signature"
                      className="signature-img"
                    />
                  ) : (
                    <p>No signature available</p>
                  )}
                  <input
                    type="text"
                    name="requested_signature"
                    value={formData.requested_signature || userData.signature || ""}
                    onChange={handleChange}
                    readOnly
                  />
                  <p>Signature:</p>

                </label>
              </div>
          </section>

          <div className="pr-form-actions">
            <button type="submit" className="pr-submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Payment Request"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default PurchaseRequest;
