import { useEffect, useState } from "react"; // Removed useMemo
import { useNavigate } from "react-router-dom";
import "./styles/InterbranchTransfer.css";
import "./styles/PurchaseRequest.css";
import "./styles/CAReceipt.css";
import "./styles/CreditCardAcknowledgementReceipt.css"
import { API_BASE_URL } from "../config/api.js";

// Helper: generates default form values
const initialFormData = (storedUser) => ({
  // Form fields
  cardholder_name: storedUser.name || "",
  employee_id: storedUser.employee_id || "",
  department: "",
  position: "",
  bank: "",
  issuer: "",
  card_number: "",
  date_received: "",

  // Received By fields
  received_by_name: "",
  received_by_date: "",
  received_by_signature: null, 

  // Extra fields needed for form UI
  request_date: new Date().toISOString().split("T")[0],
});

// Navigation sections (cleaned)
const NAV_SECTIONS = [
  { id: "details", label: "Credit Card Details" },
  { id: "submitted", label: "View Submitted Receipts" },
];

function CreditCardAcknowledgementReceipt({ onLogout }) {
  const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  // State declarations
  const [request, setRequest] = useState(null);
  const [formData, setFormData] = useState(initialFormData(storedUser));
  const [loading, setLoading] = useState(true);
  // Removed [items, setItems] state
  const [departments, setDepartments] = useState([]);
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextReferenceCode, setNextReferenceCode] = useState(null);
  const [activeSection, setActiveSection] = useState("details"); // Default to 'details'
  const role = (storedUser.role || "").toLowerCase();
  const isUserAccount = role === "user" || role === "staff" || "admin";

  // --- Fetch full user data (including signature) ---
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
            cardholder_name: data.name || storedUser.name,
            received_by_name: data.name || storedUser.name,
            received_by_signature: data.signature || null,
            received_by_date: new Date().toISOString().split("T")[0],
            employee_id: data.employee_id || storedUser.employee_id,
          }));
        })
        .catch((err) => {
          console.error("Error fetching user data:", err);
          // Fallback to storedUser if fetch fails
          setFormData((prev) => ({
            ...prev,
            cardholder_name: storedUser.name || "", // Fixed fallback
            employee_id: storedUser.employee_id || "", // Fixed fallback
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
          `${API_BASE_URL}/api/credit_card_acknowledgement_receipt/next-code`
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

  // Load departments from API
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const departmentRes = await fetch(`${API_BASE_URL}/api/departments`);
        const departmentData = departmentRes.ok
          ? await departmentRes.json()
          : [];

        setDepartments(departmentData);
      } catch (error) {
        console.error("Error loading department lookups:", error); // Fixed message
      }
    };

    loadLookups();
  }, []);

  // Return to form library page
  const handleBackToForms = () => {
    navigate("/forms-list");
  };

  // Display toast-like messages
  const showMessage = (type, text) => {
    setMessage({ type, text });
    if (type !== "error") setTimeout(() => setMessage(null), 2500);
  };

  // Generic form input handler (cleaned)
  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- Item handling functions and memo removed ---

  // Handle form submission
  const submitRequest = async () => {
    if (!isUserAccount) return;

    // --- ADDED SIGNATURE VALIDATION ---
    if (!formData.received_by_signature) {
      return showMessage(
        "error",
        "Your signature is not set up. Please update your profile."
      );
    }
    // --- END VALIDATION ---

    // --- VALIDATION (Updated) ---
    if (!formData.card_number)
      return showMessage("error", "Please enter a credit card number.");
    if (!formData.bank)
      return showMessage("error", "Please enter the bank name.");
    if (!formData.date_received)
      return showMessage("error", "Please enter the date received.");
    if (!formData.department)
      return showMessage("error", "Please enter the department.");
    if (!formData.position)
      return showMessage("error", "Please enter the position.");
    // --- END VALIDATION ---

    setIsSaving(true);

    // Build payload for POST request (cleaned)
    const payload = {
      ...formData,
      form_code: nextReferenceCode,
    };

    console.log("Submitting payload:", payload);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/credit_card_acknowledgement_receipt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to submit receipt.");
      setRequest(data);
      showMessage("success", "Receipt submitted successfully.");
    } catch (error) {
      console.error("Error submitting receipt:", error);
      showMessage("error", error.message || "Unable to submit receipt.");
    } finally {
      setIsSaving(false);
    }
  };

  const isReadOnly = Boolean(request);
  // 'isTransportMethodSelected' removed

  // Navigate between sidebar sections
  const handleNavigate = (sectionId) => {
    if (sectionId === "submitted") {
      navigate("/forms/credit-card-receipt/submitted"); // Fixed URL
      return;
    }

    setActiveSection(sectionId);

    const mainContainer = document.getElementById("its-main");
    const target = document.getElementById(sectionId);

    const header = mainContainer?.querySelector(".pr-topbar");

    if (mainContainer && target) {
      const headerHeight = header ? header.offsetHeight : 0;
      const targetTop = target.offsetTop;
      const scrollToPosition = targetTop - headerHeight;

      mainContainer.scrollTo({
        top: scrollToPosition < 0 ? 0 : scrollToPosition,
        behavior: "smooth",
      });
    }
  };

  if(loading)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading Credit Card Acknowledgement Receipt</span>
      </div>
    );

  // Render main layout
  return (
    <div className="pr-layout">
      <aside className="pr-sidebar">
        <div className="pr-sidebar-header">
          <h2
            onClick={handleBackToForms}
            style={{cursor: "pointer", color:"#007bff"}}
            title="Back to Forms Library"
          >Credit Card Acknowledgement</h2>
          <span>Standardized Form</span>
        </div>

        {/* Sidebar navigation sections (updated) */}
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
            Ensure all details are correct before submitting.
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
            <h1 className="topbar-title">
              Credit Card Acknowledgement Receipt
            </h1>
            <p className="pr-topbar-meta">
              Document acknowledgement of credit card issuance.
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

        {/* --- Credit Card details section --- */}
        <section className="pr-form-section" id="details">
          <h2 className="pr-section-title">Credit Card Details</h2>
          <p className="pr-section-subtitle">
            Confirm the details of the card and the cardholder.
          </p>

          {/* Cardholder, Bank, Issuer */}
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="cardholder_name">
                Name of Cardholder
              </label>
              <input
                type="text"
                id="cardholder_name"
                name="cardholder_name"
                value={formData.cardholder_name}
                onChange={handleFieldChange}
                className="pr-input"
                readOnly
              />
            </div>
            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="pr-label" htmlFor="bank">
                  Bank
                </label>
                <input
                  type="text"
                  id="bank"
                  name="bank"
                  value={formData.bank}
                  onChange={handleFieldChange}
                  className="pr-input"
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div className="pr-field">
                <label className="pr-label" htmlFor="issuer">
                  Issuer
                </label>
                <input
                  type="text"
                  id="issuer"
                  name="issuer"
                  value={formData.issuer}
                  onChange={handleFieldChange}
                  className="pr-input"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* Employee ID, Card Number */}
          <div className="pr-grid-two">
            <div className="pr-field">
              <label className="pr-label" htmlFor="employee_id">
                Employee ID
              </label>
              <input
                type="text"
                id="employee_id"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleFieldChange}
                className="pr-input"
                required
                readOnly
              />
            </div>
            <div className="pr-field">
              <label className="pr-label" htmlFor="card_number">
                Credit Card Number
              </label>
              <input
                id="card_number"
                name="card_number"
                value={formData.card_number}
                onChange={handleFieldChange} // Added onChange
                className="pr-input"
                required
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Department, Position, Date Received */}
          <div className="pr-grid-two">
            <div className="pr-field">
              <div className="pr-grid-two">
                <div className="pr-field">
                  <label className="pr-label" htmlFor="department">
                    Department
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleFieldChange} // Added onChange
                    className="pr-input"
                    required
                    disabled={isReadOnly}
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.department_name}>
                        {dept.department_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pr-field">
                  <label className="pr-label" htmlFor="position">
                    Position
                  </label>
                  <input
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleFieldChange}
                    className="pr-input"
                    required
                    disabled={isReadOnly}
                  />
                </div>
              </div>
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
        </section>

        {/* --- Acknowledgement details section --- */}
        <section className="pr-form-section" id="details">
            <h2 className="pr-section-title">Acknowledgment</h2>
            <p className="pr-section-subtitle">
                Ensure that you have read the conditions and confirm the entries below are correct.
            </p>
            <div className="cc-acknowledgement-block">
            <p>
              I hereby acknowledge receipt of the above-mentioned credit card
              issued under the name of <strong>Ribshack Food Group</strong>. I
              understand that this credit card is to be used exclusively for
              official and authorized business purposes in accordance with the
              company's policies and guidelines.
            </p>
            <p>I agree to:</p>
            <ol className="cc-acknowledgement-list">
              <li>Use the card solely for business-related transactions;</li>
              <li>
                Submit all required receipts and expense reports in a timely
                manner;
              </li>
              <li>
                Ensure the safekeeping and confidentiality of the card and its
                details;
              </li>
              <li>
                Immediately report any loss, theft, or suspicious activity
                involving the card.
              </li>
            </ol>
            <p>
              I understand that any unauthorized or personal use may result in
              disciplinary action, including possible reimbursement of expenses
              and/or cancellation of the card.
            </p>
          </div>

          <div className="pr-grid-two cc-signature-block">
            <div className="pr-field">
              <label className="car-reference-value">Received by</label>
              <input
                type="text"
                name="received_by_name"
                className="car-input"
                value={formData.received_by_name || ""}
                required
                readOnly
              />
            </div>

            <div className="pr-field receive-signature">
              <label className="car-reference-value">Signature</label>
              <input
                type="text"
                name="received_by_signature"
                className="car-input received-signature"
                value={formData.received_by_signature || null}
                readOnly
              />
                    {formData.received_by_signature ? (
                    <img
                        src={`${API_BASE_URL}/uploads/signatures/${formData.received_by_signature}`}
                        alt="Signature"
                        className="img-sign"
                    />
                    ) : (
                        <p className="cc-signature-missing">No signature found</p>
                    )}                
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
            {isSaving ? "Submitting..." : "Submit Receipt"}
          </button>
          {request && (
            <button
              type="button"
              className="pr-sidebar-logout" 
              onClick={() => {
                setRequest(null);
                setNextReferenceCode(null); // Will trigger refetch

                setFormData(prev => ({
                  ...emptyForm,

                  cardholder_name: prev.cardholder_name,
                  employee_id: prev.employee_id,
                  received_by_name: prev.received_by_name,
                  received_by_signature: prev.received_by_signature,
                  received_by_date: new Date().toISOString().split("T")[0], 
                }));
                
              }}
              disabled={isSaving}
            >
              Start new receipt
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default CreditCardAcknowledgementReceipt;