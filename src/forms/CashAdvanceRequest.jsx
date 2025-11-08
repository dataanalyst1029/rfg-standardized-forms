import { useEffect, useMemo, useState } from "react";
import "./styles/PurchaseRequest.css";
import "./styles/CashAdvanceRequest.css";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const initialFormData = {
  ca_request_code: "",
  request_date: new Date().toISOString().split("T")[0],
  employee_id: "",
  name: "",
  user_id: "",
  branch: "",
  department: "",
  cutoff_date: "",
  nature_activity: "",
  inclusive_date_from: new Date().toISOString().split("T")[0], 
  inclusive_date_to: new Date().toISOString().split("T")[0], 
  total_amount: "",
  purpose: "",
  requested_by: "",
  request_signature: "",
};

const emptyItem = { 
  description: "", 
  amount: "", 
  exp_cat: "", 
  store_branch: "", 
  remarks: "" 
};

const NAV_SECTIONS = [
  { id: "details", label: "Request details" },
  { id: "activity", label: "Nature Activity" },
  { id: "items", label: "CABR Details" },
  { id: "purpose", label: "Purpose" },
  { id: "signature", label: "Signature" },
  { id: "submitted", label: "View submitted requests" },
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
            request_signature: data.signature || "",

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
        const res = await fetch(`${API_BASE_URL}/api/cash_advance_request/next-code`);
        if (!res.ok) throw new Error("Failed to retrieve next reference number");
        const data = await res.json();
        if (data.nextCode) {
          setFormData((prev) => ({ ...prev, ca_request_code: data.nextCode }));
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
      next[index] = { ...next[index], [name]: value };
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
          description: item.description?.trim(),
          amount: item.amount,
          exp_cat: item.exp_cat?.trim(),
          store_branch: item.store_branch?.trim(),
          remarks: item.remarks?.trim() || "",
        }))
        .filter((item) => item.description && item.amount),
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

    let currentPRCode = formData.ca_request_code;

    try {
      const res = await fetch(`${API_BASE_URL}/api/cash_advance_request/next-code`);
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
      ca_request_code: currentPRCode,
      total_amount: totalAmount,
      items: sanitizedItems,
    };

    try {
  const res = await fetch(`${API_BASE_URL}/api/cash_advance_request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to submit request");

  setMessage({
    type: "success",
    text: `Cash Advance Budget Request ${currentPRCode} submitted successfully.`,
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
    } 

    const mainContainer = document.getElementById("car-main");
    const target = document.getElementById(sectionId);

    const header = mainContainer?.querySelector(".pr-topbar");

    if (mainContainer && target) {
      const headerHeight = header ? header.offsetHeight : 0;

      const targetTop = target.offsetTop;

      const scrollToPosition = targetTop - headerHeight;

      mainContainer.scrollTo({
        top: scrollToPosition < 0 ? 0: scrollToPosition,
        behavior:"smooth"
      })
    }
  };

  if (loading)
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>Loading Cash Advance Budget Request Form…</span>
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
            Cash Advance Budget Request
          </h2>
          <span>Standardized form</span>
        </div>

        <nav className="pr-sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === activeSection ? "is-active" : ""}
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

      <main className="pr-main" id="car-main">
        <header className="pr-topbar">
          <div>
            <h1>New Cash Advance Budget Request</h1>
            <p className="pr-topbar-meta">
              Request for advance project funds.
            </p>
          </div>

          <div className="pr-reference-card">
            <span className="pr-reference-label">Reference code</span>
            <span className="pr-reference-value">
              {formData.ca_request_code || "—"}
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
            <h2 className="pr-section-title">Request Details</h2>
            <p className="pr-section-subtitle">
              Who is requesting and how we can keep in touch.
            </p>

            <div className="pr-grid-two">
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

          <section className="pr-form-section" id="activity">
            <h2 className="pr-section-title">Nature Activity</h2>
            <div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="cutoff_date">Cut-off Date</label>
                <DatePicker
                  selected={formData.cutoff_date ? new Date(formData.cutoff_date) : null}
                  onChange={handleCutoffChange}
                  filterDate={isValidCutoffDate}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select Cut-off Date"
                  className="pr-input"
                  required
                />
              </div>

              <div className="pr-field">
                <label className="pr-label" htmlFor="nature-activity">Nature of Activity</label>
                <input
                  type="text"
                  name="nature_activity"
                  value={formData.nature_activity}
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>

              <div className="pr-field" style={{marginTop: "1rem"}}>
                <label className="pr-label" htmlFor="inclusive-date">Inclusive date(s)</label>
                <div className="inclusive-date-group">
                  <input
                    type="date"
                    name="inclusive_date_from"
                    className="pr-input"
                    value={formData.inclusive_date_from || new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, inclusive_date_from: e.target.value }))
                    }
                  />
                  <span className="date-separator">to</span>
                  <input
                    type="date"
                    name="inclusive_date_to"
                    className="pr-input"
                    value={formData.inclusive_date_to || new Date().toISOString().split("T")[0]}
                    min={formData.inclusive_date_from || new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, inclusive_date_to: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="pr-items-card" id="items">
            <div className="pr-items-header">
              <h2 className="pr-items-title">CABR Details</h2>
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
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Expense Category</th>
                    <th>Store/Branch</th>
                    <th>Remarks</th>
                    <th>Action</th>
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
                            name="description"
                            value={item.description}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            placeholder="Description"
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
                            placeholder="Amount"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            name="exp_cat"
                            value={item.exp_cat}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            placeholder="Expense Category"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            name="store_branch"
                            value={item.store_branch}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            placeholder="Store / Branch"
                            required
                          />
                        </td>
                        <td>
                          <textarea
                            name="remarks"
                            className="rfr-input"
                            value={item.remarks || ""}
                            onChange={(event) => handleItemChange(index, event)}
                          ></textarea>
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
                    <td>
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

          <section className="pr-items-card" id="purpose">
            <h2 className="pr-section-title">Purpose</h2>

            <div className="pr-field">
              <textarea
                id="purposeText"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                className="cabr-textarea"
                placeholder="Purpose of the cash advance budget request"
                rows={4}
                required
              />
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
                    name="request_signature"
                    value={formData.request_signature || userData.signature || ""}
                    onChange={handleChange}
                    readOnly
                  />
                  <p>Signature:</p>

                </label>
              </div>
          </section>

          <div className="pr-form-actions">
            <button type="submit" className="pr-submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit cash advance budget request"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default PurchaseRequest;
