import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/LoginPage.css";
import rfgLogo from "./assets/rfg_logo.png";
import { API_BASE_URL } from "./config/api.js";

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!message || message.type === "error") {
      return undefined;
    }
    const timeout = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(timeout);
  }, [message]);

  const showMessage = (type, text) => setMessage({ type, text });

  const handleLogin = async (e) => {
    e.preventDefault();
    showMessage("info", "Logging in...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        showMessage("success", "Login successful!");

        // Store user data in sessionStorage
        sessionStorage.setItem("name", data.name || "");
        sessionStorage.setItem("role", data.role || "");
        sessionStorage.setItem("id", data.id || "");
        if (data.branch) sessionStorage.setItem("branch", data.branch);
        if (data.department) sessionStorage.setItem("department", data.department);
        if (data.employee_id) sessionStorage.setItem("employee_id", data.employee_id);
        if (data.email) sessionStorage.setItem("email", data.email);

        // Also store logged-in user specifically for RequestPurchase
        sessionStorage.setItem("loggedInUser", data.name || "");


        const userPayload = {
          id: data.id,
          role: data.role,
          name: data.name,
          email: data.email,
          employee_id: data.employee_id,
          branch: data.branch,
          department: data.department,
        };

        onLogin(userPayload);

        setTimeout(() => {
          navigate(data.role === "user" ? "/forms-list" : "/overview");
        }, 600);
      } else {
        showMessage("error", "Invalid email or password");
      }
    } catch (err) {
      console.error(err);
      showMessage("error", "Server error. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-container">
          <img src={rfgLogo} alt="RFG Logo" className="rfg-logo" />
        </div>

        <h1 className="app-title">RFG Standardized Forms</h1>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
        <p className="subtitle">Sign in to continue</p>

        {message && (
          <p
            className={`message${
              message.type === "error" ? " message-error" : ""
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
