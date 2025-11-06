import { useEffect, useState } from "react";
import "./styles/CAReceipt.css";
// import "./styles/CashAdvanceRequest.css";
import { API_BASE_URL } from "../config/api.js";
import { useNavigate } from "react-router-dom";

const initialFormData = {
  car_request_code: "",
  request_date: new Date().toISOString().split("T")[0],
  user_id: "",
  cash_advance_no: "",
  employee_id: "",
  name: "",
  received_from: "",
  php_amount: "",
  php_word: "",
  received_by: "",
  received_signature: "",
};

const NAV_SECTIONS = [
  { id: "pr-main", label: "New CA Receipt" },
  { id: "submitted", label: "View Submitted Requests" },
];

function CAReceipt({ onLogout }) {
  const [formData, setFormData] = useState(initialFormData);
  const [cashAdvanceRequests, setCashAdvanceRequests] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({});
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCashAdvanceRequests = async () => {
      try {
        // Get all cash advance requests
        const [caRes, receiptRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/cash_advance_request`),
          fetch(`${API_BASE_URL}/api/ca_receipt`),
        ]);

        const [caData, receiptData] = await Promise.all([
          caRes.json(),
          receiptRes.json(),
        ]);

        // Get all CA request codes that already exist in ca_receipt (with or without status)
        const usedCARequestCodes = new Set(receiptData.map((r) => r.cash_advance_no));

        const availableRequests = caData.filter(
          (req) => !usedCARequestCodes.has(req.ca_request_code)
        );

        setCashAdvanceRequests(availableRequests);
      } catch (err) {
        console.error("Error fetching cash advance requests:", err);
      }
    };

    fetchCashAdvanceRequests();
  }, []);


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
          received_by: data.name || "",
          received_signature: data.signature || "",
        }));
      })
      .catch((err) => console.error("Error fetching user data:", err));
  }, []);

  useEffect(() => {
    const fetchNextCode = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/ca_receipt/next-code`);
        const data = await res.json();
        if (data.nextCode)
          setFormData((prev) => ({ ...prev, car_request_code: data.nextCode }));
      } catch (error) {
        console.error("Error getting next CAR code:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNextCode();
  }, []);

  // Converts numbers into words (up to millions)
  const numberToWords = (num) => {
    if (num === null || num === undefined || num === "") return "";

    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
      "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    const toWords = (n) => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
      if (n < 1000)
        return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + toWords(n % 100) : "");
      if (n < 1000000)
        return toWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + toWords(n % 1000) : "");
      if (n < 1000000000)
        return toWords(Math.floor(n / 1000000)) + " Million" + (n % 1000000 ? " " + toWords(n % 1000000) : "");
      return "Number too large";
    };

    const [pesos, centavos] = num.toString().split(".");
    let words = toWords(Math.floor(pesos)) + "";
    if (centavos && parseInt(centavos) > 0) {
      words += " and " + toWords(parseInt(centavos)) + " Centavos";
    }
    return words + "";
  };


  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "php_amount") {
      setFormData((prev) => ({
        ...prev,
        php_amount: value,
        php_word: numberToWords(value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };


  const handleCashAdvanceSelect = async (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, cash_advance_no: value }));
    if (!value) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/cash_advance_request/${value}`);
      if (!res.ok) throw new Error("Failed to fetch cash advance data");
      const data = await res.json();

      const amount = data.total_amount || "";

      setFormData((prev) => ({
        ...prev,
        employee_id: data.employee_id || "",
        name: data.name || "",
        received_from: data.received_by || "",
        php_amount: amount,
        php_word: numberToWords(amount),
      }));
    } catch (error) {
      console.error("Error fetching cash advance:", error);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ca_receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit receipt");

      setMessage({ type: "success", text: "CA Receipt submitted successfully!" });
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
      navigate("/submitted-ca-receipt"); 
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
        <span>Loading CA Receipt...</span>
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
          <h2 onClick={() => navigate("/forms-list")} style={{ cursor: "pointer", color: "#007bff" }}>
            CA Receipt
          </h2>
          <span>Standardized Form</span>
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
          <button type="button" className="pr-sidebar-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="pr-main">
        <header className="pr-topbar">
          <div>
            <h1>Cash Receipt Form</h1>
          </div>

          <div className="car-reference-card">
            <span className="car-reference-label">Reference code</span>
            <span className="car-reference-value">
              {formData.car_request_code || "—"}
            </span>
            <span className="car-reference-label">Request date</span>
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
          <section className="car-form-section">

            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="car-reference-value">Cash Adv. No.</label>
                <select
                  name="cash_advance_no"
                  className="car-input"
                  value={formData.cash_advance_no || ""}
                  onChange={handleCashAdvanceSelect}
                  required
                >
                  <option value="">Select Cash Advance No.</option>
                  {cashAdvanceRequests.map((req, index) => (
                    <option key={index} value={req.ca_request_code}>
                      {req.ca_request_code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pr-field">

              </div>
            </div>
            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="car-reference-value">Employee ID</label>
                <input
                  type="text"
                  name="employee_id"
                  value={formData.employee_id || ""}
                  onChange={handleChange}
                  className="car-input"
                  required
                  readOnly
                />
              </div>
              <div className="pr-field">
                <label className="car-reference-value">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  className="car-input"
                  required
                  readOnly
                />
              </div>
            </div>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="car-reference-value">Received From</label>
                <input
                  type="text"
                  name="received_from"
                  value={formData.received_from || ""}
                  onChange={handleChange}
                  className="car-input"
                  required
                  readOnly
                />
              </div>
              <div className="pr-field">

              </div>
            </div>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="car-reference-value">Amount in PHP</label>
                <input
                  type="number"
                  name="php_amount"
                  value={formData.php_amount}
                  onChange={handleChange}
                  className="car-input"
                  required
                  readOnly
                />
              </div>

              <div className="pr-field">
                <label className="car-reference-value">Amount (in words)</label>
                <input
                  type="text"
                  name="php_word"
                  value={formData.php_word}
                  className="car-input"
                  required
                  readOnly
                />
              </div>
            </div>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label className="car-reference-value">Received by:</label>
                <input type="text" name="received_by" className="car-input" value={userData.name || ""} required readOnly/>
              </div>

              <div className="pr-field receive-signature">
                <label className="car-reference-value">Signature</label>
                <input type="text" name="received_signature" className="car-input received-signature" value={userData.signature || ""} readOnly />
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
              {isSubmitting ? "Submitting..." : "Submit CA Receipt"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CAReceipt;
