import { useEffect, useMemo, useState } from "react";
import "./PurchaseRequest.css";
import { API_BASE_URL } from "../config/api.js";

const initialFormData = {
  purchase_request_code: "",
  request_date: new Date().toISOString().split("T")[0],
  requested_by: "",
  contact_number: "",
  branch: "",
  department: "",
  address: "",
  purpose: "",
};

const emptyItem = { quantity: "", purchase_item: "" };

const NAV_SECTIONS = [
  { id: "details", label: "Request details" },
  { id: "contact", label: "Contact & routing" },
  { id: "purpose", label: "Purpose" },
  { id: "items", label: "Line items" },
];

function PurchaseRequest({ onLogout }) {
  const [formData, setFormData] = useState(initialFormData);
  const [items, setItems] = useState([emptyItem]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [activeSection, setActiveSection] = useState("details");

  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/purchase_request/next-code`);
        if (!res.ok) throw new Error("Failed to retrieve next reference number");
        const data = await res.json();
        if (data.nextCode) {
          setFormData((prev) => ({ ...prev, purchase_request_code: data.nextCode }));
        }
      } catch (error) {
        console.error("Error fetching next code", error);
        window.alert("Unable to load the next purchase request reference. Please try again.");
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
        window.alert("Unable to load branches and departments. Please try again.");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (formData.branch) {
      const filtered = departments.filter(
        (dept) => Number(dept.branch_id) === Number(formData.branch)
      );
      setFilteredDepartments(filtered);
      setFormData((prev) => ({ ...prev, department: "" })); 
    } else {
      setFilteredDepartments([]);
    }
  }, [formData.branch, departments]);

  useEffect(() => {
    const storedName = localStorage.getItem("name") || localStorage.getItem("userName");
    if (storedName) {
      setFormData((prev) => ({ ...prev, requested_by: storedName }));
    }
  }, []);

  // 🟦 Handlers
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

  const removeItemRow = (index) => {
    setItems((prev) => (prev.length === 1 ? [emptyItem] : prev.filter((_, i) => i !== index)));
  };

  const sanitizedItems = useMemo(
    () =>
      items
        .map((item) => ({
          quantity: item.quantity,
          purchase_item: item.purchase_item.trim(),
        }))
        .filter((item) => item.quantity && item.purchase_item),
    [items]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.purchase_request_code) {
      return window.alert("Reference number not ready yet. Please wait a moment and try again.");
    }
    if (sanitizedItems.length === 0) {
      return window.alert("Add at least one line item before submitting.");
    }

    const payload = {
      purchase_request_code: formData.purchase_request_code,
      date_applied: formData.request_date,
      requested_by: formData.requested_by,
      contact_number: formData.contact_number,
      branch: formData.branch,
      department: formData.department,
      address: formData.address,
      purpose: formData.purpose,
      items: sanitizedItems,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/purchase_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit purchase request");

      window.alert(`Purchase Request ${formData.purchase_request_code} submitted successfully.`);
      window.history.back();
    } catch (error) {
      console.error("Error submitting purchase request", error);
      window.alert(error.message || "Unable to submit purchase request. Please try again.");
    }
  };

  const handleNavigate = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return <div className="pr-loading">Loading purchase request form…</div>;
  }

  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2>Purchase Request</h2>
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

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>New purchase request</h1>
            <p className="pr-topbar-meta">
              Capture purchasing details, routing information, and line items in one place.
            </p>
          </div>

          <div className="pr-reference-card">
            <span className="pr-reference-label">Reference code</span>
            <span className="pr-reference-value">
              {formData.purchase_request_code || "—"}
            </span>
            <span className="pr-reference-label">Request date</span>
            <span>{formData.request_date}</span>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <section className="pr-form-section" id="details">
            <h2 className="pr-section-title">Request details</h2>
            <p className="pr-section-subtitle">
              Who is requesting and how we can keep in touch.
            </p>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label" htmlFor="requestedBy">
                  Requested by
                </label>
                <input
                  id="requestedBy"
                  name="requested_by"
                  value={formData.requested_by}
                  onChange={handleChange}
                  className="pr-input"
                  placeholder="Full name"
                  required
                />
              </div>

              <div className="pr-field">
                <label className="pr-label" htmlFor="contactNumber">
                  Contact number
                </label>
                <input
                  id="contactNumber"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  className="pr-input"
                  placeholder="09XX XXX XXXX"
                />
              </div>
            </div>
          </section>

          <section className="pr-form-section" id="contact">
            <h2 className="pr-section-title">Routing information</h2>
            <p className="pr-section-subtitle">
              Identify the branch and department that owns this request.
            </p>

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
                    <option key={b.id || b.branch_id} value={b.id || b.branch_id}>
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
                  <option value="">Select department</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.department_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pr-field">
              <label className="pr-label" htmlFor="address">
                Address
              </label>
              <input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="pr-input"
                placeholder="Delivery or branch address"
              />
            </div>
          </section>

          <section className="pr-form-section" id="purpose">
            <h2 className="pr-section-title">Purpose</h2>
            <p className="pr-section-subtitle">
              Provide context for the purchasing team and approvers.
            </p>

            <div className="pr-field">
              <textarea
                id="purposeText"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                className="pr-textarea"
                placeholder="Purpose of the purchase request"
                rows={4}
              />
            </div>
          </section>

          <section className="pr-items-card" id="items">
            <div className="pr-items-header">
              <h2 className="pr-items-title">Line items</h2>
              <p className="pr-section-subtitle">
                List each item you need to procure with the quantity required.
              </p>
              <button type="button" className="pr-items-add" onClick={addItemRow}>
                Add item
              </button>
            </div>

            <table className="pr-items-table">
              <thead>
                <tr>
                  <th>Quantity</th>
                  <th>Item description</th>
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
                          type="number"
                          min="1"
                          name="quantity"
                          value={item.quantity}
                          onChange={(event) => handleItemChange(index, event)}
                          className="pr-input"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="purchase_item"
                          value={item.purchase_item}
                          onChange={(event) => handleItemChange(index, event)}
                          className="pr-input"
                          placeholder="Item name or description"
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
              </tbody>
            </table>
          </section>

          <div className="pr-form-actions">
            <button type="submit" className="pr-submit">
              Submit purchase request
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default PurchaseRequest;
