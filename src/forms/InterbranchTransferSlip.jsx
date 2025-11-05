import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/InterbranchTransfer.css";
import { API_BASE_URL } from "../config/api.js";

// Helper: generates default form values
const createInitialFormState = (storedUser) => ({
  // Form fields
  form_code: null,
  date_transferred: "",
  from_branch: storedUser.branch || "",
  from_address: "",
  from_area_ops_controller: "",
  date_received: "",
  to_branch: "",
  to_address: "",
  to_area_ops_controller: "",

  // Dispatch/Transport fields
  dispatch_method: "",
  dispatch_other_text: "",
  dispatch_method_type: "", // added for UI-only tracking of selected radio
  vehicle_no: "",
  driver_name: "",
  driver_contact: "",
  expected_date: "",

  // Signatures / Dates
  prepared_by: storedUser.name || "",
  approved_by: "",
  received_by: "",
  prepared_date: new Date().toISOString().split("T")[0],
  approved_date: "",
  dispatched_date: "",
  received_date: "",
  prepared_signature: storedUser.name || "",
  approved_signature: "",
  dispatched_signature: "",
  received_signature: "",

  // Other info
  is_shortage: false,
  is_overage: false,
  short_reason: "",
  over_reason: "",

  // Item Details fields (re-added as flat fields)
  item_code: "",
  quantity: "",
  unit_of_measure: "",
  item_description: "",
  item_remarks: "",

  // Extra fields needed for form UI
  request_date: new Date().toISOString().split("T")[0],
  employee_id: storedUser.employee_id || "",
});

function InterbranchTransferSlip({ onLogout }) {
  const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  // State declarations
  const [request, setRequest] = useState(null);
  const [formData, setFormData] = useState(createInitialFormState(storedUser));
  const [branches, setBranches] = useState([]);
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextReferenceCode, setNextReferenceCode] = useState(null);
  const [activeSection, setActiveSection] = useState("details");
  const role = (storedUser.role || "").toLowerCase();
  const isUserAccount = role === "user" || role === "staff";

  // Fetch next available reference code
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
        const res = await fetch(
          `${API_BASE_URL}/api/interbranch_transfer_slip/next-code`
        );
        if (!res.ok) throw new Error("Failed to load next reference code");
        const data = await res.json();
        if (isMounted) setNextReferenceCode(data.nextCode || null);
      } catch (error) {
        console.error("Error fetching next reference code:", error);
      }
    };

    fetchNextCode();
    return () => {
      isMounted = false;
    };
  }, [request]);

  // Load branches from API
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const branchRes = await fetch(`${API_BASE_URL}/api/branches`);
        const branchData = branchRes.ok ? await branchRes.json() : [];

        setBranches(branchData);

        // Auto-select user’s branch if it exists
        if (branchData.length) {
          const matchedBranch = branchData.find(
            (branch) =>
              (branch.branch_name || "").toLowerCase() ===
              (storedUser.branch || "").toLowerCase()
          );
          if (matchedBranch) {
            setFormData((prev) => ({
              ...prev,
              from_branch: matchedBranch.branch_name,
              from_address: matchedBranch.address || "", // Auto-fill address
            }));
          }
        }
      } catch (error) {
        console.error("Error loading branch lookups:", error);
      }
    };

    loadLookups();
  }, [storedUser.branch]);

  // Return to form library page
  const handleBackToForms = () => {
    navigate("/forms-list");
  };

  // Display toast-like messages
  const showMessage = (type, text) => {
    setMessage({ type, text });
    if (type !== "error") setTimeout(() => setMessage(null), 2500);
  };

  // Generic form input handler
  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      // If user selects a radio option (dispatch method)
      if (name === "dispatch_method") {
        return {
          ...prev,
          dispatch_method_type: value, // track which radio was chosen
          // If selecting Other, keep previous custom text as dispatch_method,
          // otherwise set dispatch_method directly to the selected fixed value.
          dispatch_method: value === "Other" ? prev.dispatch_other_text : value,
        };
      }

      // If user types in the "Other" textbox
      if (name === "dispatch_other_text") {
        return {
          ...prev,
          dispatch_other_text: value,
          dispatch_method_type: "Other",
          dispatch_method: value, // live-sync custom text with the main field
        };
      }

      // Default for other fields
      return { ...prev, [name]: value };
    });
  };

  // Handle 'From Branch' change
  const handleFromBranchChange = (event) => {
    const value = event.target.value;
    const branchRecord = branches.find((branch) => branch.branch_name === value);

    setFormData((prev) => ({
      ...prev,
      from_branch: value,
      from_address: branchRecord?.address || "",
      // Clear 'to_branch' if it's the same as the new 'from_branch'
      to_branch: prev.to_branch === value ? "" : prev.to_branch,
      to_address: prev.to_branch === value ? "" : prev.to_address,
    }));
  };

  // Handle 'To Branch' change
  const handleToBranchChange = (event) => {
    const value = event.target.value;
    const branchRecord = branches.find((branch) => branch.branch_name === value);

    setFormData((prev) => ({
      ...prev,
      to_branch: value,
      to_address: branchRecord?.address || "",
    }));
  };

  // Handle form submission
  const submitRequest = async () => {
    if (!isUserAccount) return;

    // Updated validation rules
    if (!formData.from_branch)
      return showMessage("error", "Select an origin branch.");
    if (!formData.to_branch)
      return showMessage("error", "Select a destination branch.");
    if (!formData.date_transferred)
      return showMessage("error", "Specify the transfer date.");
    if (!formData.dispatch_method)
      return showMessage("error", "Select a mode of transport.");
    // Validation for single item
    if (!formData.item_description || !formData.quantity) {
      return showMessage(
        "error",
        "Please provide at least an item description and quantity."
      );
    }

    setIsSaving(true);

    // Build payload for POST request
    const payload = {
      form_code: nextReferenceCode,
      date_transferred: formData.date_transferred,
      from_branch: formData.from_branch,
      from_address: formData.from_address,
      from_area_ops_controller: formData.from_area_ops_controller,
      date_received: formData.date_received,
      to_branch: formData.to_branch,
      to_address: formData.to_address,
      to_area_ops_controller: formData.to_area_ops_controller,

      // Dispatch fields
      dispatch_method: formData.dispatch_method,
      vehicle_no: formData.vehicle_no,
      driver_name: formData.driver_name,
      driver_contact: formData.driver_contact,
      expected_date: formData.expected_date,

      // ==========================================================
      // --- FIX: Send item details as an array ---
      // ==========================================================
      items: [
        {
          item_code: formData.item_code,
          quantity: formData.quantity,
          unit_of_measure: formData.unit_of_measure,
          item_description: formData.item_description,
          item_remarks: formData.item_remarks,
        },
      ],
      // ==========================================================

      // Signature / Dates
      prepared_by: formData.prepared_by,
      approved_by: formData.approved_by,
      received_by: formData.received_by,
      prepared_date: formData.prepared_date,
      approved_date: formData.approved_date,
      dispatched_date: formData.dispatched_date,
      received_date: formData.received_date,
      prepared_signature: formData.prepared_signature,
      approved_signature: formData.approved_signature,
      dispatched_signature: formData.dispatched_signature,
      received_signature: formData.received_signature,

      // Other info
      is_shortage: formData.is_shortage,
      is_overage: formData.is_overage,
      short_reason: formData.short_reason,
      over_reason: formData.over_reason,
      submitted_by: storedUser?.id || null,
    };

    console.log("Submitting payload:", payload);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/interbranch_transfer_slip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to submit transfer slip.");
      setRequest(data);
      showMessage("success", "Transfer slip submitted for approval.");
    } catch (error) {
      console.error("Error submitting transfer slip:", error);
      showMessage(
        "error",
        error.message || "Unable to submit transfer slip."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const currentStatus = request?.status || "submitted";
  const isReadOnly = Boolean(request);
  const isTransportMethodSelected = formData.dispatch_method !== "";

  // Navigate between sidebar sections
  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      // Update path to be specific to this form
      navigate("/forms/interbranch-transfer/submitted");
      return;
    }
    setActiveSection(sectionId);
    const target = document.getElementById(sectionId);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Render main layout
  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          {/* Updated title */}
          <h2>Interbranch Transfer</h2>
          <span>{currentStatus.toUpperCase()}</span>
        </div>

        {/* Sidebar navigation sections */}
        <nav className="pr-sidebar-nav">
          {[
            { id: "details", label: "Request details" },
            { id: "items", label: "Item Details" },
            { id: "dispatch", label: "Mode of Transport" },
            { id: "submitted", label: "View submitted requests" },
          ].map((section) => (
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
          <span className="pr-sidebar-meta">
            Provide as much context as possible for the transfer.
          </span>
          {onLogout && (
            <button
              type="button"
              className="pr-sidebar-logout"
              onClick={onLogout}
            >
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* Main form area */}
      <main className="pr-main">
        <button
          type="button"
          className="form-back-button"
          onClick={handleBackToForms}
        >
          ← <span>Back to forms library</span>
        </button>

        {/* Form header and reference code */}
        <header className="pr-topbar">
          <div>
            <h1 className="topbar-title">Interbranch Transfer Slip</h1>
            <p className="pr-topbar-meta">
              Document items being transferred between branches.
            </p>
          </div>
          <div className="pr-reference-card">
            <span className="pr-reference-label">Reference code</span>
            <span className="pr-reference-value">
              {request?.form_code ||
                nextReferenceCode ||
                "Pending assignment"}
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

        {/* Inline message alert */}
        {message && (
          <div className={`mr-alert mr-alert--${message.type}`}>
            {message.text}
          </div>
        )}

        {/* --- Transfer details section --- */}
        <section className="pr-form-section" id="details">
          <h2 className="pr-section-title">Transfer Details</h2>
          <p className="pr-section-subtitle">
            Confirm the origin and destination branches for the transfer.
          </p>

          {/* Date transferred and received inputs */}
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="date_transferred">
                Date Transferred
              </label>
              <input
                type="date"
                id="date_transferred"
                name="date_transferred"
                value={formData.date_transferred}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="date_received">
                Date Received
              </label>
              <input
                type="date"
                id="date_received"
                name="date_received"
                value={formData.date_received}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Branch of origin and destination select */}
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="from_branch">
                From Branch
              </label>
              <select
                id="from_branch"
                name="from_branch"
                value={formData.from_branch || ""}
                onChange={handleFromBranchChange}
                className="pr-input"
                disabled={isReadOnly}
              >
                <option value="">Select origin</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.branch_name}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pr-field">
              <label className="pr-label" htmlFor="to_branch">
                To Branch
              </label>
              <select
                id="to_branch"
                name="to_branch"
                value={formData.to_branch || ""}
                onChange={handleToBranchChange}
                className="pr-input"
                disabled={isReadOnly}
              >
                <option value="">Select destination</option>
                {branches
                  .filter(
                    (branch) => branch.branch_name !== formData.from_branch
                  )
                  .map((branch) => (
                    <option key={branch.id} value={branch.branch_name}>
                      {branch.branch_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Address from and to inputs */}
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="from_address">
                From Address
              </label>
              <input
                id="from_address"
                name="from_address"
                value={formData.from_address}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="to_address">
                To Address
              </label>
              <input
                id="to_address"
                name="to_address"
                value={formData.to_address}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
          </div>
          {/* Area controllers input */}
          <div className="pr-grid-two">
            <div className="pr-field">
              <label
                className="pr-label"
                htmlFor="from_area_ops_controller"
              >
                Area Operations Controller
              </label>
              <input
                id="from_area_ops_controller"
                name="from_area_ops_controller"
                value={formData.from_area_ops_controller}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="to_area_ops_controller">
                Area Operations Controller
              </label>
              <input
                id="to_area_ops_controller"
                name="to_area_ops_controller"
                value={formData.to_area_ops_controller}
                onChange={handleFieldChange}
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </section>

        {/* --- Item Details section --- */}
        <section className="pr-form-section" id="items">
          <h2 className="pr-section-title">Item Details</h2>
          <p className="pr-section-subtitle">
            Provide details for the item being transferred.
          </p>

          {/* Item Code (full width) */}
          <div className="pr-field">
            <label className="pr-label" htmlFor="item_code">
              Item Code
            </label>
            <input
              id="item_code"
              name="item_code"
              value={formData.item_code} /* Bind to formData */
              onChange={handleFieldChange} /* Use generic handler */
              className="pr-input"
              disabled={isReadOnly}
            />
          </div>

          {/* Quantity and Unit of Measure (side-by-side) */}
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="quantity">
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                value={formData.quantity} /* Bind to formData */
                onChange={handleFieldChange} /* Use generic handler */
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="unit_of_measure">
                Unit of Measure
              </label>
              <input
                id="unit_of_measure"
                name="unit_of_measure"
                value={formData.unit_of_measure} /* Bind to formData */
                onChange={handleFieldChange} /* Use generic handler */
                className="pr-input"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Item Description (full width) */}
          <div className="pr-field">
            <label className="pr-label" htmlFor="item_description">
              Item Description
            </label>
            <textarea
              id="item_description"
              name="item_description"
              value={formData.item_description} /* Bind to formData */
              onChange={handleFieldChange} /* Use generic handler */
              className="pr-textarea"
              rows={4}
              disabled={isReadOnly}
            />
          </div>

          {/* Remarks (full width) */}
          <div className="pr-field">
            <label className="pr-label" htmlFor="item_remarks">
              Remarks
            </label>
            <input
              id="item_remarks"
              name="item_remarks"
              value={formData.item_remarks} /* Bind to formData */
              onChange={handleFieldChange} /* Use generic handler */
              className="pr-input"
              disabled={isReadOnly}
            />
          </div>

          {/* "Add Item" button and table are removed */}
        </section>

        {/* --- Mode of Transport section --- */}
        <section className="pr-form-section" id="dispatch">
          <h2 className="pr-section-title">Mode of Transport</h2>
          <p className="pr-section-subtitle">
            Select one transport method and provide details.
          </p>

          <div className="pr-grid-two">
            {/* --- LEFT COLUMN: Radio Buttons --- */}
            <div className="pr-field">
              <fieldset className="pr-fieldset">
                {/* Company Vehicle */}
                <div className="pr-radio-option">
                  <input
                    type="radio"
                    id="dispatch_company"
                    name="dispatch_method"
                    value="Company Vehicle"
                    checked={formData.dispatch_method === "Company Vehicle"}
                    onChange={handleFieldChange}
                    disabled={isReadOnly}
                    className="pr-radio-input"
                  />
                  <label
                    htmlFor="dispatch_company"
                    className="pr-radio-label"
                  >
                    <span className="pr-radio-control"></span>
                    Company Vehicle
                  </label>
                </div>

                {/* Courier */}
                <div className="pr-radio-option">
                  <input
                    type="radio"
                    id="dispatch_courier"
                    name="dispatch_method"
                    value="Courier"
                    checked={formData.dispatch_method === "Courier"}
                    onChange={handleFieldChange}
                    disabled={isReadOnly}
                    className="pr-radio-input"
                  />
                  <label
                    htmlFor="dispatch_column"
                    className="pr-radio-label"
                  >
                    <span className="pr-radio-control"></span>
                    Courier
                  </label>
                </div>

                {/* Third-party */}
                <div className="pr-radio-option">
                  <input
                    type="radio"
                    id="dispatch_third_party"
                    name="dispatch_method"
                    value="Third-party transport"
                    checked={
                      formData.dispatch_method === "Third-party transport"
                    }
                    onChange={handleFieldChange}
                    disabled={isReadOnly}
                    className="pr-radio-input"
                  />
                  <label
                    htmlFor="dispatch_third_party"
                    className="pr-radio-label"
                  >
                    <span className="pr-radio-control"></span>
                    Third-party transport
                  </label>
                </div>

                {/* Other */}
                <div className="pr-radio-option pr-radio-option--other">
                  <input
                    type="radio"
                    id="dispatch_other"
                    name="dispatch_method"
                    value="Other"
                    checked={formData.dispatch_method_type === "Other"}
                    onChange={handleFieldChange}
                    disabled={isReadOnly}
                    className="pr-radio-input"
                  />
                  <label htmlFor="dispatch_other" className="pr-radio-label">
                    <span className="pr-radio-control"></span>
                    Other:
                  </label>
                  <input
                    type="text"
                    name="dispatch_other_text"
                    value={formData.dispatch_other_text}
                    onChange={handleFieldChange}
                    className="pr-input"
                    disabled={isReadOnly || formData.dispatch_method_type !== "Other"}
                    style={{ marginLeft: "10px", flex: 1 }}
                  />
                </div>
              </fieldset>
            </div>

            {/* --- RIGHT COLUMN: Transport Details --- */}
            <div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="vehicle_no">
                  Vehicle No
                </label>
                <input
                  id="vehicle_no"
                  name="vehicle_no"
                  value={formData.vehicle_no}
                  onChange={handleFieldChange}
                  className="pr-input"
                  disabled={isReadOnly || !isTransportMethodSelected}
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="driver_name">
                  Driver Name
                </label>
                <input
                  id="driver_name"
                  name="driver_name"
                  value={formData.driver_name}
                  onChange={handleFieldChange}
                  className="pr-input"
                  disabled={isReadOnly || !isTransportMethodSelected}
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="driver_contact">
                  Driver Contact No
                </label>
                <input
                  id="driver_contact"
                  name="driver_contact"
                  value={formData.driver_contact}
                  onChange={handleFieldChange}
                  className="pr-input"
                  disabled={isReadOnly || !isTransportMethodSelected}
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="expected_date">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  id="expected_date"
                  name="expected_date"
                  value={formData.expected_date}
                  onChange={handleFieldChange}
                  className="pr-input"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Form action buttons */}
        <div className="pr-form-actions">
          <button
            type="button"
            className="pr-submit"
            onClick={submitRequest}
          >
            Submit for approval
          </button>
          {request && (
            <button
              type="button"
              className="pr-sidebar-logout"
              onClick={() => {
                setRequest(null);
                setFormData(createInitialFormState(storedUser)); // Reset form
                // No longer need to reset currentItem
                setNextReferenceCode(null);
              }}
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

export default InterbranchTransferSlip;