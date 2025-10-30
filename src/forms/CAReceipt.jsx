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
        const res = await fetch(`${API_BASE_URL}/api/cash_advance_request`);
        const data = await res.json();
        setCashAdvanceRequests(data);
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

          <div className="pr-reference-card">
            <span className="pr-reference-label">Reference code</span>
            <span className="pr-reference-value">
              {formData.car_request_code || "—"}
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

        <form onSubmit={handleSubmit} className="cash-receipt-form">
          <section className="pr-form-section" id="details">

            <div className="pr-grid-two">
              <div className="pr-field">
                <label>Cash Adv. No.</label>
                <select
                  name="cash_advance_no"
                  className="pr-input"
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
                <label>Employee ID</label>
                <input
                  type="text"
                  name="employee_id"
                  value={formData.employee_id || ""}
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>
              <div className="pr-field">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>
            </div>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label>Received From</label>
                <input
                  type="text"
                  name="received_from"
                  value={formData.received_from || ""}
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>
              <div className="pr-field">

              </div>
            </div>

            <div className="pr-grid-two">
              <div className="pr-field">
                <label>Amount in PHP</label>
                <input
                  type="number"
                  name="php_amount"
                  value={formData.php_amount}
                  onChange={handleChange}
                  className="pr-input"
                  required
                />
              </div>

              <div className="pr-field">
                <label>Amount (in words)</label>
                <input
                  type="text"
                  name="php_word"
                  value={formData.php_word}
                  readOnly
                  className="pr-input"
                  required
                />
              </div>
            </div>
          </section>


            <section className="rfr-form-section" id="signature">
              <div className="signature-details">
                <label htmlFor="receive-by">
                  <input type="text" name="received_by" value={userData.name || ""} />
                  <p>Received by:</p>
                </label>
                <label htmlFor="receive-by" class="signature-by">
                  {userData.signature ? (
                  <img
                    src={`${API_BASE_URL}/uploads/signatures/${userData.signature}`}
                    alt="Signature"
                    className="car-signature-img"/>
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
                {isSubmitting ? "Submitting..." : "Submit CA Receipt"}
              </button>
            </div>
        </form>
      </main>
    </div>
  );
}

export default CAReceipt;
