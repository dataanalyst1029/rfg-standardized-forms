import { useEffect, useMemo, useState } from "react";
import "./styles/PurchaseRequest.css";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";

const initialFormData = {
  purchase_request_code: "",
  request_date: new Date().toISOString().split("T")[0],
  request_by: "",
  user_id: "",
  contact_no: "",
  branch: "",
  department: "",
  address: "",
  purpose: "",
};

const emptyItem = { quantity: "", purchase_item: "" };

const NAV_SECTIONS = [
  { id: "pr-main", label: "New Purchase Request" },
  { id: "submitted", label: "Purchase Request Reports" },
];

function PurchaseRequest({ onLogout }) {
  const [formData, setFormData] = useState(initialFormData);
  const [items, setItems] = useState([emptyItem]);
  const [loading, setLoading] = useState(true);
  // const [branches, setBranches] = useState([]);
  // const [departments, setDepartments] = useState([]);
  // const [filteredDepartments, setFilteredDepartments] = useState([]);
  // const [activeSection, setActiveSection] = useState("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: "", message: "" });
  const [userData, setUserData] = useState({ name: "", contact_no: "" });
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
            request_by: data.name || storedName || "",
            user_id: storedId,
            contact_no: data.contact_no || "",
            branch: data.branch || "",
            department: data.department || "",
          }));
        })
        .catch((err) => {
          console.error("Error fetching user data:", err);
          setFormData((prev) => ({
            ...prev,
            request_by: storedName || "",
            user_id: storedId,
          }));
        });
    }
  }, []);

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
        setModal({
          isOpen: true,
          type: "error",
          message: "Unable to load the next purchase request reference.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchNextCode();
  }, []);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const [branchRes, deptRes] = await Promise.all([
  //         fetch(`${API_BASE_URL}/api/branches`),
  //         fetch(`${API_BASE_URL}/api/departments`),
  //       ]);
  //       if (!branchRes.ok || !deptRes.ok) throw new Error("Failed to fetch data");
  //       const branchData = await branchRes.json();
  //       const deptData = await deptRes.json();
  //       setBranches(branchData);
  //       setDepartments(deptData);
  //     } catch (error) {
  //       console.error("Error loading branch/department data:", error);
  //       setModal({
  //         isOpen: true,
  //         type: "error",
  //         message: "Unable to load branches and departments.",
  //       });
  //     }
  //   };
  //   fetchData();
  // }, []);

  // useEffect(() => {
  //   if (formData.branch) {
  //     const filtered = departments.filter(
  //       (dept) => dept.branch_name === formData.branch
  //     );
  //     setFilteredDepartments(filtered);
  //     setFormData((prev) => ({ ...prev, department: "" }));
  //   } else {
  //     setFilteredDepartments([]);
  //   }
  // }, [formData.branch, departments]);

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
          quantity: item.quantity,
          purchase_item: item.purchase_item.trim(),
        }))
        .filter((item) => item.quantity && item.purchase_item),
    [items]
  );

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

    let currentPRCode = formData.purchase_request_code;

    try {
      const res = await fetch(`${API_BASE_URL}/api/purchase_request/next-code`);
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
      purchase_request_code: currentPRCode,
      items: sanitizedItems,
    };

    try {
  const res = await fetch(`${API_BASE_URL}/api/purchase_request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to submit request");

  setMessage({
    type: "success",
    text: `Purchase Request ${currentPRCode} submitted successfully.`,
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
      navigate("/submitted-requests"); 
    }

    setActiveSection(sectionId);

    const mainContainer = document.getElementById("pr-main");
    const target = document.getElementById(sectionId);

    const header = mainContainer?.querySelector(".pr-topbar");

    if (mainContainer && target) {
      const headerHeight = header ? header.offsetHeight : 0;

      const targetTop = target.offsetTop;

      const scrollToPosition = targetTop - headerHeight;

      mainContainer.scrollTo({
        top: scrollToPosition < 0 ? 0 : scrollToPosition,
        behavior: "smooth",
      })
    }
  
  };

  if (loading)
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>Loading purchase request form…</span>
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

      {isMobileView && (
        <button
          className="burger-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          ☰
        </button>
      )}

      <aside className={`pr-sidebar ${isMobileView ? (isMobileMenuOpen ? "open" : "closed") : ""}`}>
        <div className="pr-sidebar-header">
          <h2
            onClick={() => navigate("/forms-list")}
            style={{ cursor: "pointer", color: "#007bff" }}
            title="Back to Forms Library"
          >
            Purchase Request
          </h2>
          <span className="pr-subtitle">Standardized form</span>
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
                  name="request_by"
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
                <label className="pr-label" htmlFor="contactNumber">
                  Contact number
                </label>
                <input
                  id="contactNumber"
                  name="contact_no"
                  value={formData.contact_no}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d{0,11}$/.test(value)) {
                      handleChange(e);
                    }
                  }}
                  className="pr-input"
                  placeholder="09XX XXX XXXX"
                  required
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
                <input
                  id="branch"
                  name="branch"
                  value={userData.branch}
                  onChange={handleChange}
                  className="pr-input"
                  placeholder="Branch"
                  readOnly
                  required
                />
              </div>


              <div className="pr-field">
                <label className="pr-label" htmlFor="department">Department</label>
                <input
                  id="department"
                  name="department"
                  value={userData.department}
                  onChange={handleChange}
                  className="pr-input"
                  placeholder="Department"
                  readOnly
                  required
                />
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
                required
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
                required
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

            <div className="pr-items-table-wrapper">
              <table className="pr-items-table">
                <thead>
                  <tr>
                    <th>Item description</th>
                    <th>Quantity</th>
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
                            name="purchase_item"
                            value={item.purchase_item}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            placeholder="Item description"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            name="quantity"
                            value={item.quantity}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            placeholder="0"
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
            </div>

          </section>

          <div className="pr-form-actions">
            <button type="submit" className="pr-submit" disabled={isSubmitting}>
              {isSubmitting ? "Purchasing..." : "Purchase"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default PurchaseRequest;
