import { useEffect, useMemo, useState } from "react";
import "./styles/RevolvingFund.css";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";

const initialFormData = {
  revolving_request_code: "",
  date_request: new Date().toISOString().split("T")[0],
  employee_id: "",
  custodian: "",
  branch: "",
  department: "",
  replenish_amount: "",
  total: "",
  revolving_amount: "",
  total_exp: "",
  cash_onhand: "",
  submitted_by: "",
  submitter_signature: "",
  approved_by: "",
  approver_signature: "",
};

const emptyItem = { 
  replenish_date: new Date().toISOString().split("T")[0],
  voucher_no: "", 
  or_ref_no: "", 
  amount: "", 
  exp_cat: "", 
  gl_account: "", 
  remarks: "" 
};

const NAV_SECTIONS = [
  { id: "details", label: "Custodian Details" },
  { id: "replenishment", label: "Replenishment Details" },
  { id: "signature", label: "Signature Details" },
  { id: "submitted", label: "View submitted requests" },
];

function RevolvingFundRequest({ onLogout }) {
  const [formData, setFormData] = useState(initialFormData);
  const [items, setItems] = useState([emptyItem]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [activeSection, setActiveSection] = useState("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: "", message: "" });
  const [message, setMessage] = useState(null);
  const [replenishAmount, setReplenishAmount] = useState("");
  const [userData, setUserData] = useState({});
  const navigate = useNavigate();


  const handleReplenishAmountChange = (e) => {
    let value = e.target.value;

    value = value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    
    if (parts.length > 2) {
      value = parts[0] + "." + parts[1];
    } else if (parts[1]?.length > 2) {
      value = parts[0] + "." + parts[1].slice(0, 2);
    }

    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const formattedValue = parts[1] !== undefined ? `${integerPart}.${parts[1]}` : integerPart;

    setReplenishAmount(formattedValue);

    setFormData((prev) => ({
      ...prev,
      replenish_amount: parseFloat(value) || 0,
    }));
  };

  function formatWithCommas(value) {
    if (!value) return "";
    const [integer, decimal] = value.split(".");
    const formattedInt = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decimal !== undefined ? `${formattedInt}.${decimal}` : formattedInt;
  }

  useEffect(() => {
    const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    setFormData((prev) => ({ ...prev, replenish_amount: total }));
  }, [items]);

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
            custodian: data.name || storedName || "",
            user_id: storedId,
            employee_id: data.employee_id || "",
          }));
        })
        .catch((err) => {
          console.error("Error fetching user data:", err);
          setFormData((prev) => ({
            ...prev,
            custodian: storedName || "",
            user_id: storedId,
          }));
        });
    }
  }, []);


  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/revolving_fund_request/next-code`);
        if (!res.ok) throw new Error("Failed to retrieve next reference number");
        const data = await res.json();
        if (data.nextCode) {
          setFormData((prev) => ({ ...prev, revolving_request_code: data.nextCode }));
        }
      } catch (error) {
        console.error("Error fetching next code", error);
        setModal({
          isOpen: true,
          type: "error",
          message: "Unable to load the next revolving fund reference.",
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

  const sanitizedItems = useMemo(() =>
    items
      .map((item) => ({
        replenish_date: item.replenish_date?.trim() || "",
        voucher_no: item.voucher_no?.trim() || "",
        or_ref_no: item.or_ref_no?.trim() || "",
        amount: item.amount?.toString().replace(/,/g, "").trim() || "",
        exp_cat: item.exp_cat?.trim() || "",
        gl_account: item.gl_account?.trim() || "",
        remarks: item.remarks?.trim() || "",
      }))
      .filter((item) => {
        return (
          item.replenish_date !== "" ||
          item.voucher_no !== "" ||
          item.or_ref_no !== "" ||
          item.amount !== "" ||
          item.exp_cat !== "" ||
          item.gl_account !== ""
        );
      }),
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


    let currentRFRFCode = formData.revolving_request_code;

    try {
      const res = await fetch(`${API_BASE_URL}/api/revolving_fund_request/next-code`);
      const data = await res.json();
      if (data.nextCode) currentRFRFCode = data.nextCode;
    } catch (error) {
      return setModal({
        isOpen: true,
        type: "error",
        message: "Unable to get the latest RFRF number.",
      });
    }

    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const revolvingAmount = Number(formData.revolving_amount?.replace(/,/g, "") || 0);
    const replenishAmount = totalAmount;
    const cashOnHand = revolvingAmount - totalAmount;

    const payload = {
      ...formData,
      revolving_request_code: currentRFRFCode,
      replenish_amount: replenishAmount.toFixed(2),
      total: totalAmount.toFixed(2),
      revolving_amount: revolvingAmount.toFixed(2),
      total_exp: totalAmount.toFixed(2),
      cash_onhand: cashOnHand.toFixed(2),
      submitted_by: userData.name || "",
      submitter_signature: userData.signature || "",
      items: sanitizedItems,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/revolving_fund_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit request");

      setMessage({
        type: "success",
        text: `Revolving Fund ${currentRFRFCode} submitted successfully.`,
      });

      setTimeout(() => {
        setMessage(null);
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error("Error submitting revolving fund", error);
      setMessage({
        type: "error",
      text: error.message || "Unable to submit revolving fund. Please try again.",
    });

    setTimeout(() => setMessage(null), 3000);
  }

  };

  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      navigate("/submitted-revolving-fund-requests"); 
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
      <span>Loading revolving fund replenishment form…</span>
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
            Revolving Fund
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

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>New Revolving Fund</h1>
            <p className="pr-topbar-meta">
              Track fund usage and submit replenishment requests.
            </p>
          </div>

          <div className="rfrf-reference-card">
            <span className="rfrf-reference-label">Reference code</span>
            <span className="rfrf-reference-value">
              {formData.revolving_request_code || "—"}
            </span>
            <span className="rfrf-reference-label">Request date</span>
            <span>
              {new Date(formData.date_request).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <section className="rfr-form-section" id="details">
            <h2 className="pr-section-title">Custodian Details</h2>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label" htmlFor="custodian">
                  Custodian
                </label>
                <input
                  id="custodian"
                  name="custodian"
                  value={userData.name}
                  onChange={handleChange}
                  className="rfr-input"
                  placeholder="Full name"
                  readOnly
                  required
                />
                <input
                  type="hidden"
                  id="requestById"
                  name="user_id"
                  value={formData.user_id} 
                  className="rfr-input"
                  placeholder="User ID"
                  required
                  readOnly
                />
              </div>
                

              <div className="pr-field">
                <label className="pr-label" htmlFor="employeeId">
                  Employee Id
                </label>
                <input
                  id="employeeId"
                  name="employee_id"
                  value={formData.employee_id}
                  className="rfr-input"
                  placeholder="Employee ID"
                  required
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
                  className="rfr-input"
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
                  className="rfr-input"
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

          <section className="rfr-form-section" id="replenishment">
            <h2 className="pr-section-title">Replenishment Details</h2>

            <div className="replenishment-field">
              <div className="replenishment-input-wrapper">
                <label htmlFor="replenishment-amount">
                  <p>Amount for Replenishment:</p>
                  <input
                    id="replenishment-amount"
                    className="rfr-input"
                    type="number"
                    name="replenish_amount"
                    value={
                      items.length > 0
                        ? items
                            .reduce((sum, item) => sum + Number(item.amount || 0), 0)
                            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "0.00"
                    }
                    readOnly
                    placeholder="Enter amount"
                  />
                </label>


                <button
                  type="button"
                  className="pr-items-add"
                  onClick={addItemRow}
                >
                  Add item
                </button>
              </div>

              <div className="table-wrapper">
                <table className="rfr-items-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Voucher No.</th>
                      <th>OR Ref. No.</th>
                      <th>Amount</th>
                      <th>Exp. Category</th>
                      <th>GL Account</th>
                      <th>Remarks</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="rfr-items-empty">
                          No items yet. Add an item to get started.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {items.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <input
                                type="date"
                                name="replenish_date"
                                value={item.replenish_date}
                                onChange={(event) => handleItemChange(index, event)}

                                className="rfr-input td-input"
                                placeholder="Date"
                                required
                              />
                            </td>

                            <td>
                              <input
                                type="text"
                                name="voucher_no"
                                value={item.voucher_no}
                                onChange={(event) => handleItemChange(index, event)}
                                className="rfr-input td-input"
                                placeholder="Enter Voucher No."
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                name="or_ref_no"
                                value={item.or_ref_no}
                                onChange={(event) => handleItemChange(index, event)}
                                className="rfr-input td-input"
                                placeholder="Enter OR ref. no."
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                name="amount"
                                value={item.amount ? formatWithCommas(item.amount) : ""}
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
                                name="exp_cat"
                                value={item.exp_cat}
                                onChange={(event) => handleItemChange(index, event)}
                                className="rfr-input td-input"
                                placeholder="Enter Expense Category"
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                name="gl_account"
                                value={item.gl_account}
                                onChange={(event) => handleItemChange(index, event)}
                                className="rfr-input td-input"
                                placeholder="Enter GL Account"
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
                        ))}

                        <tr className="rfr-items-total">
                          <td colSpan={3}>
                            Total:
                          </td>
                          <td><input type="text" name="total" className="rfr-input-total" value={items
                              .reduce((sum, item) => sum + Number(item.amount || 0), 0)
                              .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} readOnly />
                          </td>
                          <td colSpan={4}></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="replenishment-cash-onhand">
                <label htmlFor="revolving-fund-amount">
                  <p>Petty Cash/Revolving Fund Amount</p>
                  <input
                    id="revolving-fund-amount"
                    type="text"
                    name="revolving_amount"
                    value={formData.revolving_amount || ""}
                    onChange={(e) => {
                      let value = e.target.value;

                      value = value.replace(/[^0-9.]/g, "");

                      const parts = value.split(".");
                      if (parts.length > 2) value = parts[0] + "." + parts[1];

                      let formattedValue;
                      if (parts.length === 1) {
                        formattedValue = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                      } else {
                        const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                        formattedValue = `${intPart}.${parts[1]}`;
                      }

                      setFormData((prev) => ({
                        ...prev,
                        revolving_amount: formattedValue,
                      }));
                    }}
                    className="replenish-input"
                    placeholder="Enter revolving fund amount"
                    required
                  />
                </label>


                <label htmlFor="total-expense">
                  <p>Less: Total Expenses per vouchers</p>
                  <input
                    id="total-expense"
                    type="text"
                    name="total_exp"
                    value={
                      items.length > 0
                        ? items
                            .reduce((sum, item) => sum + Number(item.amount || 0), 0)
                            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "0.00"
                    }
                    readOnly
                    className="replenish-input"
                  />
                </label>

                <label htmlFor="cash-onhand">
                  <p>Cash on Hand</p>
                  <input
                    id="cash-onhand"
                    type="text"
                    name="cash_onhand"
                    value={
                      (
                        Number(formData.revolving_amount?.replace(/,/g, "") || 0) -
                        items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
                      ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    }
                    readOnly
                    className="replenish-input"
                  />
                </label>
              </div>
            </div>
          </section>
          <section className="rfr-form-section" id="signature">
              <h2 className="rfr-section-title">Signature Details</h2>

              <div className="signature-details">
                <label htmlFor="submitted_by">
                  <input type="text" name="submitted_by" value={userData.name || ""} />
                  <p>Submitted by:</p>
                </label>
                <label htmlFor="submitted_by" class="signature-by">
                  {userData.signature ? (
                  <img
                    src={`${API_BASE_URL}/uploads/signatures/${userData.signature}`}
                    alt="Signature"
                    className="signature-img"/>
                    ) : (
                        <p>No signature available</p>
                  )}
                  <input type="text" name="submitter_signature" value={userData.signature || ""} readOnly />
                  <p>Signature:</p>

                </label>
              </div>
          </section>
          <div className="pr-form-actions">
            <button type="submit" className="pr-submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit revolving fund request"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default RevolvingFundRequest;
