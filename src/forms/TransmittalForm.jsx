import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/InterbranchTransfer.css";
import "./styles/PurchaseRequest.css";
import "./styles/TransmittalForm.css";
import { API_BASE_URL } from "../config/api.js";

const NAV_SECTIONS = [
  { id: "metadata", label: "Transmittal Details" },
  { id: "submitted", label: "Submitted Transmittals" },
];

const createEmptyItem = () => ({
  reference_no: "",
  description: "",
  quantity: "",
  remarks: "",
});

const initialFormData = (storedUser) => ({
  form_code: "",
  transmittal_date: new Date().toISOString().split("T")[0],
  purpose: "",
  origin_branch: storedUser.branch || "",
  origin_department: storedUser.department || "",
  destination_branch: "",
  destination_department: "",
  sender_name: storedUser.name || "",
  sender_employee_id: storedUser.employee_id || "",
  sender_contact: storedUser.contact_no || "",
  sender_signature: storedUser.signature || null,
  recipient_name: "",
  recipient_contact: "",
  recipient_signature: null,
  delivery_mode: "",
  tracking_no: "",
  release_time: "",
  condition_status: "",
  status: "Pending",
  received_by: "",
  received_signature: null,
  received_date: "",
  notes: "",
  user_id: storedUser.id || null,
  employee_id: storedUser.employee_id || "",
});

const DELIVERY_OPTIONS = [
  "Messenger",
  "Courier",
  "Electronic",
  "Pick-up",
  "Other",
];

function TransmittalForm({ onLogout }) {
  const storedUser = useMemo(() => JSON.parse(sessionStorage.getItem("user") || "{}"), []);
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("metadata");
  const [resolvedUser, setResolvedUser] = useState(storedUser);
  const [formData, setFormData] = useState(() => initialFormData(storedUser));
  const [items, setItems] = useState([createEmptyItem()]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextCode, setNextCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const fetchMeta = async () => {
      try {
        const [codeRes, branchRes, deptRes, userRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/transmittals/next-code`),
          fetch(`${API_BASE_URL}/api/branches`),
          fetch(`${API_BASE_URL}/api/departments`),
          storedUser.id ? fetch(`${API_BASE_URL}/users/${storedUser.id}`) : Promise.resolve(null),
        ]);

        if (!ignore) {
          if (codeRes.ok) {
            const codeData = await codeRes.json();
            setNextCode(codeData.nextCode || "");
            setFormData((prev) => ({ ...prev, form_code: codeData.nextCode || prev.form_code }));
          }

          if (branchRes.ok) {
            const branchData = await branchRes.json();
            setBranches(branchData);
          }

          if (deptRes.ok) {
            const deptData = await deptRes.json();
            setDepartments(deptData);
          }

          if (userRes && userRes.ok) {
            const fullUser = await userRes.json();
            setResolvedUser((prev) => ({ ...prev, ...fullUser }));
            setFormData((prev) => ({
              ...prev,
              sender_name: fullUser.name || prev.sender_name,
              sender_employee_id: fullUser.employee_id || prev.sender_employee_id,
              sender_contact: fullUser.contact_no || prev.sender_contact,
              sender_signature: fullUser.signature || null,
              origin_branch: fullUser.branch || prev.origin_branch,
              origin_department: fullUser.department || prev.origin_department,
              user_id: fullUser.id || prev.user_id,
              employee_id: fullUser.employee_id || prev.employee_id,
            }));
          }
        }
      } catch (err) {
        console.error("Error loading transmittal meta:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchMeta();
    return () => {
      ignore = true;
    };
  }, [storedUser.id]);

  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      navigate("/forms/submitted-transmittals");
      return;
    }

    setActiveSection(sectionId);
    const target = document.querySelector(`[data-section="${sectionId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const destinationDepartmentOptions = useMemo(() => {
    if (!formData.destination_branch) return departments;
    const normalizedBranch = formData.destination_branch.toLowerCase();
    return departments.filter(
      (dept) => (dept.branch_name || "").toLowerCase() === normalizedBranch,
    );
  }, [departments, formData.destination_branch]);

  const originDepartmentOptions = useMemo(() => {
    if (!formData.origin_branch) return departments;
    const normalizedBranch = formData.origin_branch.toLowerCase();
    return departments.filter(
      (dept) => (dept.branch_name || "").toLowerCase() === normalizedBranch,
    );
  }, [departments, formData.origin_branch]);

  useEffect(() => {
    setFormData((prev) => {
      if (!prev.destination_department) return prev;
      const stillValid = destinationDepartmentOptions.some(
        (dept) => dept.department_name === prev.destination_department,
      );
      return stillValid ? prev : { ...prev, destination_department: "" };
    });
  }, [destinationDepartmentOptions]);

  useEffect(() => {
    setFormData((prev) => {
      if (!prev.origin_department) return prev;
      const stillValid = originDepartmentOptions.some(
        (dept) => dept.department_name === prev.origin_department,
      );
      return stillValid ? prev : { ...prev, origin_department: "" };
    });
  }, [originDepartmentOptions]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.destination_branch || !formData.destination_department) {
      showMessage("error", "Destination branch and department are required.");
      return;
    }

    setIsSaving(true);

    const filteredItems = items
      .map((item) => ({
        ...item,
        quantity: item.quantity ? Number(item.quantity) : null,
      }))
      .filter(
        (item) =>
          item.reference_no?.trim() ||
          item.description?.trim() ||
          item.quantity ||
          item.remarks?.trim(),
      );

    try {
      const response = await fetch(`${API_BASE_URL}/api/transmittals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          form_code: formData.form_code || nextCode,
          items: filteredItems,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to save transmittal.");
      }

      showMessage("success", payload.message || "Transmittal saved successfully!");
      setItems([createEmptyItem()]);
      setFormData({
        ...initialFormData(resolvedUser),
        form_code: payload.form_code || nextCode || "",
      });
      const refreshed = await fetch(`${API_BASE_URL}/api/transmittals/next-code`);
      if (refreshed.ok) {
        const next = await refreshed.json();
        setNextCode(next.nextCode || "");
        setFormData((prev) => ({ ...prev, form_code: next.nextCode || prev.form_code }));
      }
    } catch (err) {
      console.error("Error submitting transmittal:", err);
      showMessage("error", err.message || "Unable to save transmittal.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Loading Transmittal Form</span>
      </div>
    );
  }

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2 onClick={() => navigate("/forms-list")} style={{ cursor: "pointer", color: "#007bff" }}>
            Transmittal Form
          </h2>
          <span>Standardized Form</span>
        </div>

        <nav className="pr-sidebar-nav">
          {NAV_SECTIONS.map((section) => (
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
          <span className="pr-sidebar-meta">Track every transmission for audit readiness.</span>
          {onLogout && (
            <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
              Log out
            </button>
          )}
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1 className="topbar-title">Transmittal Form</h1>
            <p className="pr-topbar-meta">Document every transfer for clear accountability.</p>
          </div>
          <div className="pr-reference-card">
            <span className="pr-reference-label">Transmittal code</span>
            <span className="pr-reference-value">{formData.form_code || nextCode || "Generating..."}</span>
            <span className="pr-reference-label">Prepared by</span>
            <span>{formData.sender_name || "-"}</span>
            <span className="pr-reference-label">Status</span>
            <span>{formData.status || "Draft"}</span>
          </div>
        </header>

        {message && (
          <div className={`pr-alert ${message.type === "error" ? "pr-alert--error" : "pr-alert--success"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <section className="pr-form-section" data-section="metadata">
            <h3 className="pr-section-title">Transmission details</h3>
            <p className="pr-section-subtitle">Reference, purpose, and the teams involved.</p>
            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label" htmlFor="transmittal_date">
                  Date prepared
                </label>
                <input
                  className="pr-input"
                  type="date"
                  id="transmittal_date"
                  name="transmittal_date"
                  value={formData.transmittal_date}
                  onChange={handleFieldChange}
                  required
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="destination_branch">
                  Destination branch
                </label>
                <select
                  className="pr-select"
                  id="destination_branch"
                  name="destination_branch"
                  value={formData.destination_branch}
                  onChange={handleFieldChange}
                  required
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
                <label className="pr-label" htmlFor="purpose">
                  Purpose / Category
                </label>
                <input
                  className="pr-input"
                  type="text"
                  id="purpose"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleFieldChange}
                  placeholder="Check release, document routing, assets..."
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="destination_department">
                  Destination department
                </label>
                {destinationDepartmentOptions.length ? (
                  <select
                    className="pr-select"
                    id="destination_department"
                    name="destination_department"
                    value={formData.destination_department}
                    onChange={handleFieldChange}
                    required={destinationDepartmentOptions.length > 0}
                  >
                    <option value="">Select department</option>
                    {destinationDepartmentOptions.map((dept) => (
                      <option key={dept.id} value={dept.department_name}>
                        {dept.department_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="pr-input"
                    type="text"
                    id="destination_department"
                    name="destination_department"
                    value={formData.destination_department}
                    onChange={handleFieldChange}
                    placeholder="Enter department"
                    required={false}
                  />
                )}
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="origin_branch">
                  Origin branch
                </label>
                <select
                  className="pr-select"
                  id="origin_branch"
                  name="origin_branch"
                  value={formData.origin_branch}
                  onChange={handleFieldChange}
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
                <label className="pr-label" htmlFor="origin_department">
                  Origin department
                </label>
                {originDepartmentOptions.length ? (
                  <select
                    className="pr-select"
                    id="origin_department"
                    name="origin_department"
                    value={formData.origin_department}
                    onChange={handleFieldChange}
                  >
                    <option value="">Select department</option>
                    {originDepartmentOptions.map((dept) => (
                      <option key={dept.id} value={dept.department_name}>
                        {dept.department_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="pr-input"
                    type="text"
                    id="origin_department"
                    name="origin_department"
                    value={formData.origin_department}
                    onChange={handleFieldChange}
                    placeholder="Enter department"
                  />
                )}
              </div>
            </div>
          </section>

          <section className="pr-form-section" data-section="participants">
            <h3 className="pr-section-title">Sender & recipient</h3>
            <p className="pr-section-subtitle">Capture who prepares and who receives the transmittal.</p>
            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label" htmlFor="sender_name">
                  Sender name
                </label>
                <input
                  className="pr-input"
                  type="text"
                  id="sender_name"
                  name="sender_name"
                  value={formData.sender_name}
                  onChange={handleFieldChange}
                  required
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="sender_employee_id">
                  Sender employee ID
                </label>
                <input
                  className="pr-input"
                  type="text"
                  id="sender_employee_id"
                  name="sender_employee_id"
                  value={formData.sender_employee_id}
                  onChange={handleFieldChange}
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="sender_contact">
                  Sender contact
                </label>
                <input
                  className="pr-input"
                  type="text"
                  id="sender_contact"
                  name="sender_contact"
                  value={formData.sender_contact}
                  onChange={handleFieldChange}
                  placeholder="Phone or email"
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="recipient_name">
                  Recipient name
                </label>
                <input
                  className="pr-input"
                  type="text"
                  id="recipient_name"
                  name="recipient_name"
                  value={formData.recipient_name}
                  onChange={handleFieldChange}
                  required
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="recipient_contact">
                  Recipient contact
                </label>
                <input
                  className="pr-input"
                  type="text"
                  id="recipient_contact"
                  name="recipient_contact"
                  value={formData.recipient_contact}
                  onChange={handleFieldChange}
                  placeholder="Phone or email"
                />
              </div>
            </div>
          </section>

          <section className="pr-items-card" data-section="contents">
            <div className="pr-items-header">
              <div>
                <h3 className="pr-section-title">Content inventory</h3>
                <p className="pr-section-subtitle">List every document, check, or equipment handed over.</p>
              </div>
              <button type="button" className="pr-items-add" onClick={handleAddItem}>
                Add row
              </button>
            </div>

            <div className="pr-items-table-wrapper">
              <table className="pr-items-table transmittal-items-table">
                <colgroup>
                  <col className="transmittal-col transmittal-col--reference" />
                  <col className="transmittal-col transmittal-col--description" />
                  <col className="transmittal-col transmittal-col--quantity" />
                  <col className="transmittal-col transmittal-col--remarks" />
                  <col className="transmittal-col transmittal-col--actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Reference #</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Remarks</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`item-${index}`}>
                      <td>
                        <input
                          className="pr-input"
                          type="text"
                          value={item.reference_no}
                          onChange={(event) => handleItemChange(index, "reference_no", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="pr-input"
                          type="text"
                          value={item.description}
                          onChange={(event) => handleItemChange(index, "description", event.target.value)}
                          placeholder="Document, check no., equipment..."
                        />
                      </td>
                      <td>
                        <input
                          className="pr-input"
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(event) => handleItemChange(index, "quantity", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="pr-input"
                          type="text"
                          value={item.remarks}
                          onChange={(event) => handleItemChange(index, "remarks", event.target.value)}
                        />
                      </td>
                      <td className="transmittal-items-actions">
                        <button
                          type="button"
                          className="pr-table-action"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length === 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pr-form-section" data-section="logistics">
            <h3 className="pr-section-title">Logistics & confirmation</h3>
            <p className="pr-section-subtitle">Delivery tracking, condition, and acknowledgement.</p>
            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label" htmlFor="delivery_mode">
                  Delivery mode
                </label>
                <select
                  className="pr-select"
                  id="delivery_mode"
                  name="delivery_mode"
                  value={formData.delivery_mode}
                  onChange={handleFieldChange}
                >
                  <option value="">Select mode</option>
                  {DELIVERY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="tracking_no">
                  Tracking or vehicle #
                </label>
                <input
                  className="pr-input"
                  type="text"
                  id="tracking_no"
                  name="tracking_no"
                  value={formData.tracking_no}
                  onChange={handleFieldChange}
                  placeholder="Courier tracking, plate no., etc."
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="release_time">
                  Release date / time
                </label>
                <input
                  className="pr-input"
                  type="datetime-local"
                  id="release_time"
                  name="release_time"
                  value={formData.release_time}
                  onChange={handleFieldChange}
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="condition_status">
                  Condition status
                </label>
                <input
                  className="pr-input"
                  type="text"
                  id="condition_status"
                  name="condition_status"
                  value={formData.condition_status}
                  onChange={handleFieldChange}
                  placeholder="Complete, partial, discrepancy..."
                />
              </div>
            </div>
            <div className="pr-field" style={{ marginTop: "1rem" }}>
              <label className="pr-label" htmlFor="notes">
                Notes / discrepancies
              </label>
              <textarea
                className="pr-textarea"
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleFieldChange}
                placeholder="Record discrepancies, SLA reminders, or follow-ups."
              />
            </div>
          </section>

          <div className="transmittal-submit-row">
            <button type="submit" className="pr-submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Submit transmittal"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default TransmittalForm;
