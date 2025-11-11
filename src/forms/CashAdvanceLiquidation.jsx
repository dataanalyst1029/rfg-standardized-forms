import { useEffect, useMemo, useState } from "react";
import "./styles/PurchaseRequest.css";
import "./styles/CashAdvanceRequest.css";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";

const initialFormData = {
    cal_request_code: "",
    request_date: new Date().toISOString().split("T")[0],
    employee_id: "",
    name: "",
    user_id: "",
    cash_advance_no: "",
    check_pcv_no: "",
    cutoff_date: "",
    branch: "",
    department: "",
    nature_activity: "",
    inclusive_date_from: "",
    inclusive_date_to: "",
    total_expense: "",
    budgeted: "",
    actual: "",
    difference: "",
    excess_deposit: "",
    date_excess: "",
    ack_rcpt_no: "",
    exceed_amount: "",
    rb_amount: "",
    prepared_by: "",
    prepared_signature: "",
};

const emptyItem = { 
    transaction_date: new Date().toISOString().split("T")[0],
    description: "", 
    or_no: "", 
    amount: "", 
    exp_charges: "", 
    store_branch: "", 
    remarks: "" 
};

const NAV_SECTIONS = [
    { id: "ca-liquidation-main", label: "New Cash Advance Liquidation" },
    { id: "submitted", label: "Cash Advance Liquidation Reports" },
];

function PurchaseRequest({ onLogout }) {
    const [formData, setFormData] = useState(initialFormData);
    const [items, setItems] = useState([emptyItem]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState("details");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cashAdvanceRequests, setCashAdvanceRequests] = useState([]);
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
    const difference =
        Number(formData.total_amount || 0) -
        items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    useEffect(() => {
        const fetchCashAdvanceRequests = async () => {
            try {
            const res = await fetch(`${API_BASE_URL}/api/cash_advance_request`);
            if (!res.ok) throw new Error("Failed to fetch cash advance requests");
            const data = await res.json();
            setCashAdvanceRequests(data);
            } catch (error) {
            console.error("Error fetching cash advance requests:", error);
            }
        };

        fetchCashAdvanceRequests();
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
                user_id: storedId,
                contact_no: data.contact_no || "",
                prepared_by: data.name || "",
                prepared_signature: data.signature || "",

            }));
            })
            .catch((err) => {
            console.error("Error fetching user data:", err);
            setFormData((prev) => ({
                ...prev,
                name: storedName || "",
                user_id: storedId,
            }));
            });
        }
    }, []);

    useEffect(() => {
      if (userData && userData.name && !formData.prepared_by) {
        setFormData((prev) => ({
          ...prev,
          prepared_by: userData.name,
          prepared_signature: userData.signature || "",
        }));
      }
    }, [userData]);

    useEffect(() => {
        const fetchNextCode = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/cash_advance_liquidation/next-code`);
            if (!res.ok) throw new Error("Failed to retrieve next reference number");
            const data = await res.json();
            if (data.nextCode) {
            setFormData((prev) => ({ ...prev, cal_request_code: data.nextCode }));
            }
        } catch (error) {
            console.error("Error fetching next code", error);
            setModal({
            isOpen: true,
            type: "error",
            message: "Unable to load the next cal request reference.",
            });
        } finally {
            setLoading(false);
        }
        };
        fetchNextCode();
    }, []);

    const handleChange = async (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === "cash_advance_no" && value) {
            try {
              const res = await fetch(`${API_BASE_URL}/api/cash_advance_request/${value}`);
              if (!res.ok) throw new Error("Failed to fetch cash advance details");
              const data = await res.json();

              setFormData((prev) => ({
                ...prev,
                employee_id: data.employee_id || "",
                name: data.name || "",
                branch: data.branch || "",
                department: data.department || "",
                cash_advance_no: data.cash_advance_no || "",
                check_pcv_no: data.check_pcv_no || "",
                cutoff_date: data.cutoff_date || "", 
                nature_activity: data.nature_activity || "", 
                inclusive_date_from: data.inclusive_date_from || "", 
                inclusive_date_to: data.inclusive_date_to || "", 
                total_expense: data.total_expense || "", 
                total_amount: data.total_amount || "", 
                excess_deposit: data.excess_deposit || "", 
                date_excess: data.date_excess || "", 
                ack_rcpt_no: data.ack_rcpt_no || "", 
                exceed_amount: data.exceed_amount || "", 
                rb_amount: data.rb_amount || "",
                // 🧠 KEEP the existing prepared_by and signature
                prepared_by: prev.prepared_by,
                prepared_signature: prev.prepared_signature,
              }));
            } catch (error) {

            console.error("Error fetching cash advance details:", error);
            setFormData((prev) => ({
                ...prev,
                employee_id: "",
                name: "",
                branch: "",
                department: "",
                cash_advance_no: "",
                check_pcv_no: "",
                cutoff_date: "",
                nature_activity: "",
                inclusive_date_from: "",
                inclusive_date_to: "",
                total_expense: "",
                total_amount: "",
                excess_deposit: "",
                date_excess: "",
                ack_rcpt_no: "",
                exceed_amount: "",
                rb_amount: "",
                prepared_by: "",
                prepared_signature: "",
            }));
            }
        }
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
            transaction_date: item.transaction_date?.trim(),
            description: item.description?.trim(),
            or_no: item.or_no?.trim(),
            amount: item.amount,
            exp_charges: item.exp_charges?.trim(),
            store_branch: item.store_branch?.trim(),
            remarks: item.remarks?.trim() || "",
            }))
            .filter((item) => item.transaction_date && item.amount && item.exp_charges && item.store_branch),
        [items]
    );

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

      let currentPRCode = formData.cal_request_code;

      try {
        const res = await fetch(`${API_BASE_URL}/api/cash_advance_liquidation/next-code`);
        const data = await res.json();
        if (data.nextCode) currentPRCode = data.nextCode;
      } catch (error) {
        return setModal({
          isOpen: true,
          type: "error",
          message: "Unable to get the latest CAL number.",
        });
      }

      const budgeted = Number(formData.total_amount || 0);
      const actual = sanitizedItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const difference = budgeted - actual;
      const total_expense = actual;

      let exceed_amount = null;
      let rb_amount = null;
      if (difference < 0) {
        rb_amount = Math.abs(difference);
      } else if (difference > 0) {
        exceed_amount = difference;
      }

      const payload = {
        ...formData,
        cal_request_code: currentPRCode,
        total_expense,
        budgeted,
        actual,
        difference,
        exceed_amount,
        rb_amount,
        items: sanitizedItems,
      };

      try {
        const res = await fetch(`${API_BASE_URL}/api/cash_advance_liquidation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to submit request");

        setMessage({
          type: "success",
          text: `Cash Advance Liquidation ${currentPRCode} submitted successfully.`,
        });

        setTimeout(() => {
          setMessage(null);
          window.location.reload();
        }, 2000);
      } catch (error) {
        console.error("Error submitting liquidation", error);
        setMessage({
          type: "error",
          text: error.message || "Unable to submit liquidation. Please try again.",
        });
        setTimeout(() => setMessage(null), 3000);
      }
    };


const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
    navigate("/submitted-cash-advance-liquidation"); 
    }

    setActiveSection(sectionId);

    const mainContainer = document.getElementById("cal-main");
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
      <span>Loading Cash Advance Liquidation…</span>
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
            Cash Advance Liquidation
          </h2>
          <span>Standardized form</span>
        </div>

        <nav className="pr-sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === "ca-liquidation-main" ? "is-active" : ""}
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

      <main className="pr-main" id="cal-main">
        <header className="pr-topbar">
          <div>
            <h1>New Cash Advance Liquidation</h1>
            <p className="pr-topbar-meta">
              Request for advance project funds.
            </p>
          </div>

          <div className="pr-reference-card">
            <span className="pr-reference-label">Reference code</span>
            <span className="pr-reference-value">
              {formData.cal_request_code || "—"}
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
            {/* <h2 className="pr-section-title">Request Details</h2>
            <p className="pr-section-subtitle">
              Who is requesting and how we can keep in touch.
            </p> */}

            <div className="pr-grid-two">
                <div className="pr-field">
                    <label className="pr-label" htmlFor="name">
                    Cash Advance No.
                    </label>
                    <select
                        name="cash_advance_no"
                        id="cash-advance-no"
                        className="pr-input"
                        value={formData.cash_advance_no || ""}
                        onChange={handleChange}
                        required
                        >
                        <option value="" disabled>Select Cash Advance No.</option>
                        {cashAdvanceRequests.map((req, index) => (
                            <option key={index} value={req.ca_request_code}>
                            {req.ca_request_code}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="pr-field">
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
                    <label className="pr-label" htmlFor="employee-id">
                    Employee ID
                    </label>
                    <input
                        id="employee-id"
                        name="employee_id"
                        value={formData.employee_id || ""}
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
                        value={formData.name || ""}
                        className="pr-input"
                        readOnly
                        required
                    />
                </div>
            </div>

            <div className="pr-grid-two">
                <div className="pr-field">
                    <label className="pr-label" htmlFor="branch">
                    Branch
                    </label>
                    <input
                        id="branch"
                        name="branch"
                        value={formData.branch || ""}
                        className="pr-input"
                        readOnly
                        required
                    />
                </div>
                
                <div className="pr-field">
                    <label className="pr-label" htmlFor="department">
                        Department
                    </label>
                    <input
                        id="department"
                        name="department"
                        value={formData.department || ""}
                        className="pr-input"
                        readOnly
                        required
                    />
                </div>
            </div>
          </section>

          <section className="pr-form-section" id="activity">
            <div className="pr-grid-two">
                <div className="pr-field">
                    <label className="pr-label" htmlFor="check-pcv">
                        Check / PCV No.
                    </label>
                    <input
                        id="check-pcv"
                        name="check_pcv_no"
                        value={formData.check_pcv_no || ""}
                        className="pr-input"
                        readOnly
                        required
                    />
                </div>
                <div className="pr-field">
                    <label className="pr-label" htmlFor="cutoff_date">
                        Cut-off Date
                    </label>
                    <input
                      type="text"
                      id="cutoff_date"
                      name="cutoff_date"
                      className="pr-input"
                      value={
                        formData.cutoff_date
                          ? new Date(formData.cutoff_date).toLocaleDateString("en-CA", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }) 
                          : ""
                      }
                      readOnly
                    />
                </div>
            </div>

            <div className="pr-grid-two">
                <div className="pr-field">
                    <label className="pr-label" htmlFor="nature-activity">
                        Nature of activity
                    </label>
                    <input
                        id="nature-activity"
                        name="nature_activity"
                        value={formData.nature_activity || ""}
                        className="pr-input"
                        readOnly
                        required
                    />
                </div>
                <div className="pr-field">

                </div>
            </div>
            <div className="pr-grid-two">
                <div className="pr-field">
                    <label className="pr-label" htmlFor="inclusive-date">
                        Inclusive Date From
                    </label>
                    <input
                        type="text"
                        id="inclusive-date"
                        name="inclusive_date_from"
                        className="pr-input"
                        value={
                        formData.inclusive_date_from
                            ? new Date(formData.inclusive_date_from).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })
                            : ""
                        }
                        readOnly
                    />
                </div>
                <div className="pr-field">
                    <label className="pr-label" htmlFor="inclusive-date">
                        Inclusive Date To
                    </label>
                    <input
                        type="text"
                        id="inclusive-date"
                        name="inclusive_date_to"
                        className="pr-input"
                        value={
                        formData.inclusive_date_to
                            ? new Date(formData.inclusive_date_to).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })
                            : ""
                        }
                        readOnly
                    />
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
                    <th>Date of Transaction</th>
                    <th>Description</th>
                    <th>OR No.</th>
                    <th>Amount</th>
                    <th>Expense Charges</th>
                    <th>Store/Branch</th>
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
                                type="date"
                                name="transaction_date"
                                value={item.transaction_date}
                                onChange={(event) => handleItemChange(index, event)}
                                className="rfr-input td-input"
                                placeholder="Date"
                                required
                            />
                        </td>
                        <td>
                            <textarea
                                name="description"
                                className="rfr-input"
                                value={item.description || ""}
                                onChange={(event) => handleItemChange(index, event)}
                            >
                            </textarea>
                        </td>
                        <td>
                          <input
                            type="text"
                            name="or_no"
                            value={item.or_no}
                            onChange={(event) => handleItemChange(index, event)}
                            className="pr-input"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            name="amount"
                              value={item.amount}
                            onChange={(event) => {
                              let value = event.target.value;

                              value = value.replace(/[^0-9.]/g, "");

                              const parts = value.split(".");
                              if (parts.length > 2) {
                                value = parts[0] + "." + parts[1];
                              }

                              handleItemChange(index, { target: { name: "amount", value } });
                            }}
                            className="rfr-input td-input"
                            placeholder="Enter amount"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            name="exp_charges"
                              value={item.exp_charges}
                            onChange={(event) => {
                              let value = event.target.value;

                              value = value.replace(/[^0-9.]/g, "");

                              const parts = value.split(".");
                              if (parts.length > 2) {
                                value = parts[0] + "." + parts[1];
                              }

                              handleItemChange(index, { target: { name: "exp_charges", value } });
                            }}
                            className="rfr-input td-input"
                            placeholder="Enter expense charges"
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
                            required
                          />
                        </td>
                        {/* <td>
                          <textarea
                            name="remarks"
                            className="rfr-input"
                            value={item.remarks || ""}
                            onChange={(event) => handleItemChange(index, event)}
                          ></textarea>
                        </td> */}
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
                      Total Expenses
                    </td>
                    <td><input type="text" name="total_expense" className="rfr-input-total" value={items
                        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
                        .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} readOnly />
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
        </section>

        <section className="pr-items-card" id="expenses-breakdown">
            <h2 className="pr-items-title">Expenses Breakdown</h2>
            <div className="table-wrapper">
                <table className="pr-items-table">
                  <thead>
                      <tr>
                      <th>Budgeted</th>
                      <th>Actual</th>
                      <th>Difference</th>
                      </tr>
                  </thead>
                  <tbody>
                      {formData.total_amount ? (
                      <tr>
                          <td>
                          <input
                              type="text"
                              id="budgeted"
                              name="budgeted"
                              value={Number(formData.total_amount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                              })}
                              className="pr-input"
                              readOnly
                          />
                          </td>
                          <td>
                          <input
                              type="text"
                              name="actual"
                              value={items
                              .reduce((sum, item) => sum + Number(item.amount || 0), 0)
                              .toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                              })}
                              className="pr-input"
                              readOnly
                          />
                          </td>
                          <td>
                              <input
                                  type="text"
                                  name="difference"
                                  value={(
                                  Number(formData.total_amount || 0) -
                                  items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
                                  ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                  })}
                                  className="pr-input"
                                  readOnly
                              />
                          </td>
                      </tr>
                      ) : (
                      <tr>
                          <td colSpan={3} className="pr-items-empty">
                          No data available.
                          </td>
                      </tr>
                      )}
                  </tbody>
                </table>
            </div>
        </section>


        <section className="pr-items-card" id="purpose">
            <div className="pr-flex-container">
                <div
                className="pr-section"
                >
                <h2 className="pr-section-title">When Budgeted Exceeds Actual</h2>
                <div>
                  <span>Deposit of Excess</span>
                  <input
                    type="text"
                    name="excess_deposit"
                    value={formData.excess_deposit || ""}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <span>Date</span>
                  <input
                    type="date"
                    name="date_excess"
                    value={formData.date_excess || ""}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <span>Acknowledgement Receipt No.</span>
                  <input
                    type="text"
                    name="ack_rcpt_no"
                    value={formData.ack_rcpt_no || ""}
                    onChange={handleChange}
                  />
                </div>
                <div>
                    <span>Amount</span>
                    <input
                    type="text"
                    name="exceed_amount"
                    value={difference >= 0 ? difference.toFixed(2) : ""}
                    readOnly
                    />
                </div>
                </div>

                <div
                className="pr-section"
                >
                  <h2 className="pr-section-title">When Actual Exceeds Budgeted</h2>
                  <div>
                      <span>Reimbursable Amount</span>
                      <input
                      type="text"
                      name="rb_amount"
                      value={difference < 0 ? Math.abs(difference).toFixed(2) : ""}
                      readOnly
                      />
                  </div>
                </div>
            </div>
          </section>


          <section className="rfr-form-section" id="signature">
            <h2 className="rfr-section-title">Signature Details</h2>

            <div className="signature-details">
              <label htmlFor="prepared-by">
                <input
                  type="text"
                  name="prepared_by"
                  value={formData.prepared_by || ""}
                  onChange={handleChange}
                />
                <p>Prepared by:</p>
              </label>

              <label htmlFor="submitted-signature" className="signature-by">
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
                  name="prepared_signature"
                  value={formData.prepared_signature || ""}
                  onChange={handleChange}
                />
                <p>Signature:</p>
              </label>
            </div>
          </section>

          <div className="pr-form-actions">
            <button type="submit" className="pr-submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit cash advance liquidation"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default PurchaseRequest;
