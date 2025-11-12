import { useEffect, useState, useMemo } from "react"; // Added useMemo
import { useNavigate } from "react-router-dom";
import "./styles/InterbranchTransfer.css";
// You will likely need styles from PurchaseRequest.css for the item table
import "./styles/PurchaseRequest.css";
import { API_BASE_URL } from "../config/api.js";

// Helper: generates default form values
const initialFormData = (storedUser) => ({
  // Form fields
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
  // MODIFIED: Set to null initially, will be fetched
  prepared_signature: null, 

  // Item Details fields removed from here

  // Extra fields needed for form UI
  request_date: new Date().toISOString().split("T")[0],
  employee_id: storedUser.employee_id || "",
});

// Define an empty item row, similar to PaymentRequest
const emptyItem = {
  item_code: "",
  qty: "",
  unit_measure: "",
  item_description: "",
  remarks: "",
};

// --- ADDED THIS ---
const NAV_SECTIONS = [
  { id: "details", label: "Transfer Details" },
  { id: "items", label: "Item Details" },
  { id: "dispatch", label: "Mode of Transport" },
  { id: "submitted", label: "View Submitted Requests" },
];
// --- END ADD ---

function InterbranchTransferSlip({ onLogout }) {
  const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  // State declarations
  const [request, setRequest] = useState(null);
  const [formData, setFormData] = useState(initialFormData(storedUser));
  const [loading, setLoading] = useState(true);
  // Updated to use 'items' state for multiple items
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextReferenceCode, setNextReferenceCode] = useState(null);
  // --- MODIFIED THIS ---
  const [activeSection, setActiveSection] = useState("its-main");
  // --- END MODIFY ---
  const role = (storedUser.role || "").toLowerCase();
  const isUserAccount = role === "user" || role === "staff" || "admin";

  // --- NEW: Fetch full user data (including signature) ---
  useEffect(() => {
    if (storedUser.id) {
      fetch(`${API_BASE_URL}/users/${storedUser.id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch user data");
          return res.json();
        })
        .then((data) => {
          // Update formData with fetched signature and name
          setFormData((prev) => ({
            ...prev,
            prepared_by: data.name || storedUser.name,
            prepared_signature: data.signature || null, // <-- This is the fix
            employee_id: data.employee_id || storedUser.employee_id,
          }));
        })
        .catch((err) => {
          console.error("Error fetching user data:", err);
          // Fallback to storedUser if fetch fails
          setFormData((prev) => ({
            ...prev,
            prepared_by: storedUser.name || "",
            employee_id: storedUser.employee_id || "",
          }));
        });
    }
  }, [storedUser.id, storedUser.name, storedUser.employee_id]);
  // --- END NEW ---

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
      } finally {
        setLoading(false);
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

  // Generic form input handler (no longer handles item fields)
  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      // If user selects a radio option (dispatch method)
      if (name === "dispatch_method") {
        const isOther = value === "Other";
        return {
          ...prev,
          dispatch_method_type: value, // track which radio was chosen
          // If selecting Other, keep previous custom text as dispatch_method,
          // otherwise set dispatch_method directly to the selected fixed value.
          dispatch_method: isOther
          ? `Other: ${prev.dispatch_other_text}`
          : value,
        };
      }

      // If user types in the "Other" textbox
      if (name === "dispatch_other_text") {
        return {
          ...prev,
          dispatch_other_text: value,
          dispatch_method_type: "Other",
          dispatch_method: `Other: ${value}`, // live-sync custom text with the main field
        };
      }

      // Default for other fields
      return { ...prev, [name]: value };
    });
  };

  // --- Item handling functions (from PaymentRequest) ---

  const handleItemChange = (index, event) => {
    const { name, value } = event.target;

    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [name]: value };
      // No 'amount' calculation needed here
      next[index] = item;
      return next;
    });
  };

  const addItemRow = () => setItems((prev) => [...prev, emptyItem]);

  const removeItemRow = (index) =>
    setItems((prev) =>
     prev.filter((_, i) => i !== index)
    );

  // Memoized list of valid items to be submitted
  const sanitizedItems = useMemo(
    () =>
      items.filter(
        (item) => item.item_code && (item.qty || "0") !== "0"
      ),
    [items]
  );

  // --- End Item handling functions ---

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
    
    // --- ADDED SIGNATURE VALIDATION ---
    if (!formData.prepared_signature) {
       return showMessage("error", "Your signature is not set up. Please update your profile.");
    }
    // --- END VALIDATION ---

    // Updated validation rules
    if (!formData.from_branch)
      return showMessage("error", "Select an origin branch.");
    if (!formData.to_branch)
      return showMessage("error", "Select a destination branch.");
    if (!formData.date_transferred)
      return showMessage("error", "Specify the transfer date.");
    if (!formData.dispatch_method)
      return showMessage("error", "Select a mode of transport.");

    // Validation for multiple items
    if (sanitizedItems.length === 0) {
      return showMessage(
        "error",
        "Please provide at least one item with an item code and quantity."
      );
    }

    setIsSaving(true);

    // Build payload for POST request, now including 'items'
    const payload = {
      ...formData,
      form_code: nextReferenceCode,
      items: sanitizedItems, // Add the array of items
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
      navigate("/forms/interbranch-transfer-slip/submitted");
      return;
    } 
    
    setActiveSection(sectionId);

    const mainContainer = document.getElementById("its-main");
    const target = document.getElementById(sectionId);

    const header = mainContainer?.querySelector(".pr-topbar");

    if (mainContainer && target) {
      const headerHeight = header ? header.offsetHeight : 0;  // Get header height

      const targetTop = target.offsetTop;                     // Get target's position relative to container's content

      const scrollToPosition = targetTop - headerHeight;      // Scroll to target position - header height (leaves space for header)

      mainContainer.scrollTo({
        top: scrollToPosition < 0 ? 0 : scrollToPosition,
        behavior: "smooth",
      })
    }
  };

  if(loading)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading Interbranch Transfer Slip</span>
      </div>
  )

  // Render main layout
  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2
            onClick={handleBackToForms}
            style={{ cursor:"pointer", color:"#007bff"}}
            title="Back to Forms Library"
          >
            Interbranch Transfer</h2>
          <span>Standardized Form</span>
        </div>

        {/* Sidebar navigation sections */}
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
      <main className="pr-main" id="its-main">
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
                {new Date(formData.request_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
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
                className="pr-input"
                disabled={isReadOnly}
                readOnly // <-- This was added
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
                className="pr-input"
                disabled={isReadOnly}
                readOnly // <-- This was added
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

        {/* --- Item Details section (MODIFIED) --- */}
        <section className="pr-items-card" id="items">
          <div className="pr-items-header">
            <div>
              <h2 className="pr-section-title">Item Details</h2>
              <p className="pr-section-subtitle">
                Provide details for all items being transferred.
              </p>
            </div>
            <button
              type="button"
              className="pr-items-add"
              onClick={addItemRow}
              disabled={isReadOnly}
            >
              Add item
            </button>
          </div>

          <div className="table-wrapper">
            <table className="pr-items-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Quantity</th>
                  <th>Unit of Measure</th>
                  <th>Item Description</th>
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
                          onChange={(event) => handleItemChange(index, event)}
                          className="pr-input"
                          disabled={isReadOnly}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="qty"
                          min="0"
                          value={item.qty}
                          onChange={(event) => handleItemChange(index, event)}
                          className="its-numeric-input pr-input"
                          disabled={isReadOnly}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="unit_measure"
                          value={item.unit_measure}
                          onChange={(event) => handleItemChange(index, event)}
                          className="pr-input"
                          disabled={isReadOnly}
                        />
                      </td>
                      <td>
                        <textarea
                          name="item_description"
                          value={item.item_description}
                          onChange={(event) => handleItemChange(index, event)}
                          className="pr-textarea"
                          rows={2}
                          disabled={isReadOnly}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="remarks"
                          value={item.remarks}
                          onChange={(event) => handleItemChange(index, event)}
                          className="pr-input"
                          disabled={isReadOnly}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="pr-table-action"
                          onClick={() => removeItemRow(index)}
                          disabled={isReadOnly}
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
        {/* --- End of Item Details section --- */}

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
                    htmlFor="dispatch_courier"
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
                    disabled={
                      isReadOnly || formData.dispatch_method_type !== "Other"
                    }
                    style={{ marginLeft: "10px", flex: 1 }}
                  />
                </div>
              </fieldset>
            </div>

            {/* --- RIGHT COLUMN: Transport Details --- */}
            <div className="its-input-col">
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
            disabled={isReadOnly || isSaving} // Disable if read-only or saving
          >
            {isSaving ? "Submitting..." : "Submit for approval"}
          </button>
          {request && (
            <button
              type="button"
              className="pr-sidebar-logout" // Re-using class, might want a different one
              onClick={() => {
                setRequest(null);
                setFormData(initialFormData(storedUser)); // Reset form
                setItems([]); // Reset items
                setNextReferenceCode(null); // Will trigger refetch
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