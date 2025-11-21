import { useEffect, useMemo, useState } from "react";
import "./styles/OvertimeApproval.css";
// import "./styles/PurchaseRequest.css";
// import "./styles/CashAdvanceRequest.css";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";
// import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const initialFormData = {
  overtime_request_code: "",
  request_date: new Date().toISOString().split("T")[0],
  employee_id: "",
  name: "",
  user_id: "",
  branch: "",
  department: "",
  cutoff_date: "",
  nature_activity: "",
  cut_off_from: new Date().toISOString().split("T")[0], 
  cut_off_to: new Date().toISOString().split("T")[0], 
  total_hours: "",
  requested_by: "",
  requested_signature: "",
};

const getCurrentTime = () => {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
};


const emptyItem = { 
  ot_date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }),
  time_from: getCurrentTime(),
  time_to: getCurrentTime(),
  hours: "",
  purpose: "",
};

const NAV_SECTIONS = [
  { id: "overtime-approval-main", label: "New Overtime Approval Request" },
  { id: "submitted", label: "Overtime Approval Request Reports" },
];

const calculateHours = (from, to) => {
  if (!from || !to) return "";
  const [fromH, fromM] = from.split(":").map(Number);
  const [toH, toM] = to.split(":").map(Number);

  let fromMinutes = fromH * 60 + fromM;
  let toMinutes = toH * 60 + toM;

  // If overtime goes past midnight
  if (toMinutes < fromMinutes) toMinutes += 24 * 60;

  const diff = (toMinutes - fromMinutes) / 60;
  return diff.toFixed(2); // 2 decimal places
};



function OvertimeApproval({ onLogout }) {
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
            name: data.name || storedName || "",
            user_id: storedId,
            employee_id: data.employee_id || "",
            requested_by: data.name || "",
            requested_signature: data.signature || "",
            branch: data.branch || "",
            department: data.department || "",

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
        const res = await fetch(`${API_BASE_URL}/api/overtime_approval_request/next-code`);
        if (!res.ok) throw new Error("Failed to retrieve next reference number");
        const data = await res.json();
        if (data.nextCode) {
          setFormData((prev) => ({ ...prev, overtime_request_code: data.nextCode }));
        }
      } catch (error) {
        console.error("Error fetching next code", error);
        setModal({
          isOpen: true,
          type: "error",
          message: "Unable to load the next oar reference.",
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

      // Recalculate hours if time_from or time_to changed
      if (name === "time_from" || name === "time_to") {
        next[index].hours = calculateHours(next[index].time_from, next[index].time_to);
      }

      return next;
    });
  };


  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        ...emptyItem,
        time_from: getCurrentTime(),
        time_to: getCurrentTime(),
      }
    ]);
  };

  const removeItemRow = (index) =>
    setItems((prev) =>
      prev.length === 1 ? [emptyItem] : prev.filter((_, i) => i !== index)
    );

  const sanitizedItems = items.map(item => ({
    ot_date: item.ot_date,
    time_from: item.time_from,
    time_to: item.time_to,
    hours: item.hours,
    purpose: item.purpose,
  }));

  const totalHours = sanitizedItems.reduce((sum, item) => sum + Number(item.hours || 0), 0);

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

    let currentPRCode = formData.overtime_request_code;

    try {
      const res = await fetch(`${API_BASE_URL}/api/overtime_approval_request/next-code`);
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
      overtime_request_code: currentPRCode,
      total_hours: totalHours, 
      items: sanitizedItems,
    };


    try {
  const res = await fetch(`${API_BASE_URL}/api/overtime_approval_request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to submit request");

  setMessage({
    type: "success",
    text: `Overtime Approval Request ${currentPRCode} submitted successfully.`,
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
      navigate("/submitted-hr-overtime-approval"); 
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
      <span>Loading Overtime Approval Request Form…</span>
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
            Overtime Approval Request
          </h2>
          <span>Standardized form</span>
        </div>

        <nav className="pr-sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === "overtime-approval-main" ? "is-active" : ""}
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
            <h1>New Overtime Request</h1>
            <p className="pr-topbar-meta">
              Record rendered overtime, compute total hours, and route for approval.
            </p>
          </div>

          <div className="pr-reference-card">
            <span className="pr-reference-label">Reference code</span>
            <span className="pr-reference-value">
              {formData.overtime_request_code || "—"}
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
            <div className="pr-field" style={{marginTop: "1rem"}}>
                <label className="pr-label" htmlFor="inclusive-date">Cut-off Period</label>
                <div className="inclusive-date-group">
                  <input
                    type="date"
                    name="cut_off_from"
                    className="pr-input"
                    value={formData.cut_off_from || new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cut_off_from: e.target.value }))
                    }
                  />
                  <span className="date-separator">to</span>
                  <input
                    type="date"
                    name="cut_off_to"
                    className="pr-input"
                    value={formData.cut_off_to || new Date().toISOString().split("T")[0]}
                    min={formData.cut_off_from || new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cut_off_to: e.target.value }))
                    }
                  />
                </div>
              </div>
          </section>

          <section className="pr-items-card" id="items">
            <div className="pr-items-header">
              <h2 className="pr-items-title">Overtime Hours Rendered</h2>
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
                    <th>OT Date</th>
                    <th>From</th>
                    <th>To</th>
                    <th style={{textAlign: 'center'}}>Hours</th>
                    <th>Purpose(s)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="pr-items-empty">
                        No items yet. Add an item to get started.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            style={{fontSize: 'small'}}
                            type="date"
                            name="ot_date"
                            value={item.ot_date}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            placeholder="OT Date"
                            required
                          />
                        </td>
                        <td>
                          <input
                            style={{fontSize: 'small'}}
                            type="time"
                            name="time_from"
                            value={item.time_from}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            placeholder="Time From"
                            required
                          />
                        </td>
                        <td>
                          <input
                            style={{fontSize: 'small'}}
                            type="time"
                            name="time_to"
                            value={item.time_to}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            placeholder="Time To"
                            required
                          />
                        </td>
                        <td>
                          <input
                            style={{fontSize: 'small', textAlign: 'center'}}
                            type="text"
                            name="hours"
                            value={item.hours}
                            className="pr-input"
                            placeholder="Hours"
                            readOnly
                          />
                        </td>
                        <td>
                          <textarea
                            style={{fontSize: 'small'}}
                            name="purpose"
                            className="cabr-textarea"
                            value={item.purpose || ""}
                            onChange={(event) => handleItemChange(index, event)}
                            rows={1}
                          ></textarea>
                        </td>
                        <td>
                          <button
                            style={{fontSize: 'small'}}
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
                  <tr className="pr-items-table">
                    <td colSpan={3} style={{textAlign: 'center'}}>
                      <strong><small>Total</small></strong>
                    </td>
                    <td style={{textAlign: 'center', width: '100%'}}>
                      <input
                        style={{fontSize: 'small', textAlign: 'center'}}
                        type="text"
                        name="total_hours"
                        className="pr-input"
                        value={items
                          .reduce((sum, item) => sum + Number(item.hours || 0), 0)
                          .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        readOnly
                      />
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rfr-form-section" id="signature">
              <h2 className="rfr-section-title">Signature Details</h2>

              <div className="pr-grid-two">
                <div className="pr-field">
                  <label className="pr-label">Requested by</label>
                  <input type="text"
                    name="requested_by" 
                    className="car-input" 
                    value={userData.name || ""} 
                    onChange={handleChange}
                    required 
                    readOnly
                  />
                </div>

                <div className="pr-field receive-signature">
                  <label className="pr-label">Signature</label>
                  <input type="text" 
                  name="requested_signature" 
                  className="car-input received-signature" 
                  value={userData.signature || ""} 
                  onChange={handleChange}
                  required
                  readOnly />
                  {userData.signature ? (
                    <img
                      src={`${API_BASE_URL}/uploads/signatures/${userData.signature}`}
                      alt="Signature"
                      className="img-sign"/>
                      ) : (
                          <p>No signature available</p>
                    )}
                </div>
              </div>
          </section>

          <div className="pr-form-actions">
            <button type="submit" className="pr-submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Overtime Request"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default OvertimeApproval;
