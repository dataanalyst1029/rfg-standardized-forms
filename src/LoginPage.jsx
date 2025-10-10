import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("🔄 Logging in...");

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
  setMessage("✅ Login successful!");

  localStorage.setItem("userName", data.name);
  localStorage.setItem("userRole", data.role);

  onLogin({
    role: data.role,
    name: data.name
  });

  setTimeout(() => {
    if (data.role === "user") {
      navigate("/forms-list");
    } else {
      navigate("/");
    }
  }, 1000);
      } else {
        setMessage("❌ Invalid email or password");
      }
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Server error. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>🔐 Login</h2>
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
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}

export default LoginPage;
