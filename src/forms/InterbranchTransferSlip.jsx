import { useEffect, useState, useMemo } from "react";
import "./styles/InterbranchTransfer.css";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";

const initialFormData = {
  its_request_code: "",
  request_date: new Date().toISOString().split("T")[0],
  user_id: "",
  employee_id: "",
  name: "",
  location: "",
  department: "",
  date_transferred: new Date().toISOString().split("T")[0],
  expected_delivery_date: new Date().toISOString().split("T")[0],
  work_description: "",
  specify_if_others: "",
  asset_tag: "",
  requested_by: "",
  request_signature: "",
};

const NAV_SECTIONS = [
  { id: "mrr-main", label: "New Interbranch Transfer Request" },
  { id: "submitted", label: "Interbranch Transfer Slip Reports" },
];

function InterBranchTransferSlip({ onLogout }) {
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({});
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);

  const emptyItem = {
    item_code: "",
    item_description: "",
    quantity: "",
    uom: "",
    remarks: "",
  };

  const [items, setItems] = useState([emptyItem]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/branches`)
      .then((res) => res.json())
      .then((data) => setBranches(data))
      .catch((err) => console.error("Error fetching branches:", err));
  }, []);

  const filteredBranches = branches.filter(
    (b) => b.location === formData.location
  );

  useEffect(() => {
    const storedId = sessionStorage.getItem("id");
    if (!storedId) return;
    fetch(`${API_BASE_URL}/users/${storedId}`)
      .then((res) => res.json())
      .then((data) => {
        setUserData(data);
        setFormData((prev) => ({
          ...prev,
          user_id: storedId,
          requested_by: data.name || "",
          request_signature: data.signature || "",
          employee_id: data.employee_id || "",
          name: data.name || "",
          location: data.location || "",
          department: data.department || "",
        }));
      })
      .catch((err) => console.error("Error fetching user data:", err));
  }, []);

  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/interbranch_transfer/next-code`);
        const data = await res.json();
        if (data.nextCode)
          setFormData((prev) => ({ ...prev, its_request_code: data.nextCode }));
      } catch (error) {
        console.error("Error getting next MRR code:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNextCode();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    // Auto-fill FROM address
    if (name === "from_branch") {
      const selectedBranch = branches.find(
        (b) => b.branch_name === value
      );

      setFormData((prev) => ({
        ...prev,
        from_branch: value,
        address_from: selectedBranch ? selectedBranch.address : "",
        to_branch: prev.to_branch === value ? "" : prev.to_branch
      }));

      return;
    }

    if (name === "to_branch") {
      const selectedBranch = branches.find(
        (b) => b.branch_name === value
      );

      setFormData((prev) => ({
        ...prev,
        to_branch: value,
        address_to: selectedBranch ? selectedBranch.address : ""
      }));

      return;
    }

    if (name === "vehicle_use") {
      return setFormData((prev) => ({
        ...prev,
        vehicle_use: value,
        specify_if_others: value === "Other" ? prev.specify_if_others : ""
      }));
    }


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
          item_code: item.item_code.trim(),
          item_description: item.item_description.trim(),
          quantity: Number(item.quantity),
          uom: item.uom.trim(),
          remarks: item.remarks.trim(),
        }))
        .filter((item) => item.item_code && item.item_description),
    [items]
  );


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/interbranch_transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit request");

      setMessage({ type: "success", text: "Interbranch transfer slip submitted successfully!" });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      navigate("/submitted-interbranch-transfer-slip"); 
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
        <span>Loading Interbranch Transfer Slip...</span>
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

      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2 
            onClick={() => navigate("/forms-list")} 
            style={{ cursor: "pointer", color: "#007bff" }}
            title="Back to Forms Library"
          >
            Interbranch Transfer Slip
          </h2>
          <span>Standardized form</span>
        </div>

        <nav className="pr-sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === "mrr-main" ? "is-active" : ""}
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
            <h1>Interbranch Transfer Slip</h1>
            <p className="pr-topbar-meta">
              Document items being transferred between branches.
            </p>
          </div>

          <div className="car-reference-card">
            <span className="pr-label">Reference code</span>
            <span className="car-reference-value">
              {formData.its_request_code || "—"}
            </span>
            <span className="pr-label">Request date</span>
            <span className="car-reference-value">
              {new Date(formData.request_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="cash-receipt-form">
            <section className="car-form-section" id="details">
              <div className="pr-grid-two">
                  <div className="pr-field">
                      <input
                        type="hidden"
                        id="employeeId"
                        name="employee_id"
                        value={formData.employee_id}
                        onChange={handleChange}
                        className="pr-input"
                        placeholder="Employee ID"
                        readOnly
                        required
                      />
                      <input
                        type="hidden"
                        id="userId"
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
                    <label className="pr-label">Date Transferred</label>
                    <input
                      type="date"
                      id="location"
                      name="date_transferred"
                      value={formData.date_transferred}
                      onChange={handleChange}
                      className="pr-input"
                      required
                    />
                </div>
                <div className="pr-field">
                  {/* <label className="pr-label">Location</label> */}
                  <input
                      type="hidden"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="pr-input"
                      placeholder="Location"
                      readOnly
                      required
                    />
                </div>
              </div>
              <div className="pr-grid-two">
                <div className="pr-field">
                  <label className="pr-label">FROM (Branch Name)</label>

                  <select
                    id="from_branch"
                    name="from_branch"
                    value={formData.from_branch}
                    onChange={handleChange}
                    className="pr-input"
                    required
                  >
                    <option value="">Select Branch</option>

                    {filteredBranches
                      .filter((branch) => branch.branch_name.split(" ")[0] === "Ribshack")
                      .map((branch) => (
                        <option key={branch.id} value={branch.branch_name}>
                          {branch.branch_name}
                        </option>
                      ))}
                  </select>

                </div>
                <div className="pr-field">
                  <label className="pr-label">TO (Branch Name)</label>

                  <select
                    id="to_branch"
                    name="to_branch"
                    value={formData.to_branch}
                    onChange={handleChange}
                    className="pr-input"
                    required
                  >
                    <option value="">Select Branch</option>

                    {filteredBranches
                      .filter(
                        (branch) =>
                          branch.branch_name.split(" ")[0] === "Ribshack" &&
                          branch.branch_name !== formData.from_branch
                      )
                      .map((branch) => (
                        <option key={branch.id} value={branch.branch_name}>
                          {branch.branch_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="pr-grid-two">
                <div className="pr-field">
                    <label className="pr-label">Address</label>
                    <input
                      type="text"
                      id="address_from"
                      name="address_from"
                      value={formData.address_from}
                      onChange={handleChange}
                      className="pr-input"
                      required
                      readOnly
                    />
                </div>
                <div className="pr-field">
                  <label className="pr-label">Address</label>
                  <input
                    type="text"
                    id="address_to"
                    name="address_to"
                    value={formData.address_to}
                    onChange={handleChange}
                    className="pr-input"
                    required
                    readOnly
                  />
                </div>
              </div>
              <div className="pr-grid-two">
                <div className="pr-field">
                  <label className="pr-label">Area Operations Controller</label>
                  <input
                    type="text"
                    id="aoc"
                    name="aoc"
                    value={formData.name}
                    onChange={handleChange}
                    className="pr-input"
                    required
                    readOnly
                  />
                </div>
                <div className="pr-field">

                </div>
              </div>
            </section>

            <section className="pr-items-card" id="items">
              <div className="pr-section responsive">
                <h2 className="pr-items-title">Line items</h2>
                <p className="pr-section-subtitle">
                  List each item you need transferred.
                </p>
                <button type="button" className="pr-items-add" onClick={addItemRow}>
                  Add item
                </button>
              </div>

              <div className="table-wrapper">
                <table className="pr-items-table">
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>UOM</th>
                      <th>Remarks</th>
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
                              type="text"
                              name="item_code"
                              value={item.item_code}
                              onChange={(e) => handleItemChange(index, e)}
                              className="car-input"
                              required
                            />
                          </td>

                          <td>
                            <input
                              type="text"
                              name="item_description"
                              value={item.item_description}
                              onChange={(e) => handleItemChange(index, e)}
                              className="car-input"
                              required
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="1"
                              name="quantity"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, e)}
                              className="car-input"
                              required
                            />
                          </td>

                          <td>
                            <input
                              type="text"
                              name="uom"
                              value={item.uom}
                              onChange={(e) => handleItemChange(index, e)}
                              className="car-input"
                              required
                            />
                          </td>

                          <td>
                            <input
                              type="text"
                              name="remarks"
                              value={item.remarks}
                              onChange={(e) => handleItemChange(index, e)}
                              className="car-input"
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
              <div>
                <span><small style={{color: 'red'}}>**Kindly indicate in the above table the item codes, description, quantity, and units of shortage/overage items</small></span>
              </div>
            </section>


            <section className="car-form-section" id="details">
              <div className="pr-grid-two">
                <div className="pr-field">
                  <label className="pr-label"><strong>Please select whichever is available</strong></label>

                  <div className="vehicle-options">
                    <label className="vehicle-option">
                      <input
                        type="checkbox"
                        name="vehicle_use"
                        value="Company Vehicle"
                        checked={formData.vehicle_use === "Company Vehicle"}
                        onChange={handleChange}
                      />
                      Company Vehicle
                    </label>

                    <label className="vehicle-option">
                      <input
                        type="checkbox"
                        name="vehicle_use"
                        value="Courier"
                        checked={formData.vehicle_use === "Courier"}
                        onChange={handleChange}
                      />
                      Courier
                    </label>

                    <label className="vehicle-option">
                      <input
                        type="checkbox"
                        name="vehicle_use"
                        value="Third-party transport"
                        checked={formData.vehicle_use === "Third-party transport"}
                        onChange={handleChange}
                      />
                      Third-party transport
                    </label>

                    <label className="vehicle-option">
                      <input
                        type="checkbox"
                        name="vehicle_use"
                        value="Other"
                        checked={formData.vehicle_use === "Other"}
                        onChange={handleChange}
                      />
                      Other
                    </label>

                    {formData.vehicle_use === "Other" && (
                      <div className="vehicle-option">
                        <input
                          type="text"
                          name="specify_if_others"
                          placeholder="Please specify"
                          className="pr-input"
                          value={formData.specify_if_others}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pr-field">
                  <label className="pr-label"><strong>Mode of transport</strong></label>
                  <label className="pr-label">Vehicle Number</label>
                   <input
                      type="text"
                      id="vehicle-no"
                      name="vehicle_no"
                      value={formData.vehicle_no}
                      onChange={handleChange}
                      className="pr-input"
                      required
                    />

                    <label className="pr-label">Driver Name</label>
                    <input 
                      type="text"
                      id="driver-name"
                      name="driver_name"
                      value={formData.driver_name}
                      className="pr-input"
                      required
                    />

                    <label className="pr-label">Driver Contact No</label>
                    <input 
                      type="text"
                      id="driver-contact"
                      name="driver_contact"
                      value={formData.driver_contact}
                      className="pr-input"
                      required
                    />

                    <label className="pr-label">Expected Delivery Date</label>
                    <input 
                      type="date"
                      id="expected-delivery"
                      name="expected_delivery_date"
                      value={formData.expected_delivery_date}
                      className="pr-input"
                      required
                    />
                </div>
              </div>
            </section>


            <section className="car-form-section" id="signature">
              <div className="pr-grid-two">
                <div className="pr-field">
                  <label className="car-reference-value">Request by:</label>
                  <input type="text" name="requested_by" className="car-input" value={userData.name || ""} required readOnly/>
                </div>

                <div className="pr-field receive-signature">
                  <label className="car-reference-value">Signature</label>
                  <input type="text" name="request_signature" className="car-input received-signature" value={userData.signature || ""} readOnly />
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
                {isSubmitting ? "Submitting..." : "Submit Interbranch Transfer Slip"}
              </button>
            </div>
        </form>
      </main>
    </div>
  );
}

export default InterBranchTransferSlip;
