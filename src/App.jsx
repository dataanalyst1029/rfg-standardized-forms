import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import FormsList from "./FormsList";
import PurchaseRequest from "./forms/PurchaseRequest";
import SubmittedPurchaseRequests from "./submitted-request/SubmittedPurchaseRequests";
import RevolvingFund from "./forms/RevolvingFund";
import CashAdvanceRequest from "./forms/CashAdvanceRequest";
import PaymentRequest from "./forms/PaymentRequest";
import "./styles/App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionUser = sessionStorage.getItem("user");
    if (sessionUser) {
      setUser(JSON.parse(sessionUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    setUser(null);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
          fontSize: "1.05rem",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            !user ? (
              <LoginPage onLogin={handleLogin} />
            ) : user.role === "user" ? (
              <Navigate to="/forms-list" replace />
            ) : (
              <Dashboard role={user.role} name={user.name} onLogout={handleLogout} />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            user && user.role !== "user" ? (
              <Dashboard role={user.role} name={user.name} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms-list"
          element={
            user && user.role === "user" ? (
              <FormsList onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/purchase-request"
          element={
            user &&
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
              <PurchaseRequest onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/revolving-fund"
          element={
            user && user.role === "user" ? (
              <RevolvingFund onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/cash-advance-request"
          element={
            user && user.role === "user" ? (
              <CashAdvanceRequest onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/payment-request-form"
          element={
            user && user.role === "user" ? (
              <PaymentRequest onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/submitted-purchase-requests"
          element={
            user && user.role === "user" ? (
              <SubmittedPurchaseRequests onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/submitted-requests"
          element={<Navigate to="/forms/submitted-purchase-requests" replace />}
        />

      </Routes>
    </Router>
  );
}

export default App;
