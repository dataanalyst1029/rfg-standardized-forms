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
import SubmittedRequests from "./submitted-request/SubmittedRequests";
import SubmittedRevolvingFund from "./submitted-request/SubmittedRevolvingFund";
import SubmittedCashAdvance from "./submitted-request/SubmittedCashAdvance";
import SubmittedPaymentRequest from "./submitted-request/SubmittedPaymentRequest";
import RevolvingFund from "./forms/RevolvingFund";
import CashAdvanceRequest from "./forms/CashAdvanceRequest";
import CashAdvanceLiquidation from "./forms/CashAdvanceLiquidation";
import PaymentRequest from "./forms/PaymentRequest";
import MaintenanceRepair from "./forms/MaintenanceRepair";
import OvertimeApproval from "./forms/OvertimeApproval";
import LeaveApplication from "./forms/LeaveApplication";
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
            user ? (
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
            user &&
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
              <RevolvingFund onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/cash-advance-budget-request-form"
          element={
            user &&
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
              <CashAdvanceRequest onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/cash-advance-liquidation-form"
          element={
            user &&
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
              <CashAdvanceLiquidation onLogout={handleLogout} currentUserId={user.id} />
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
          path="/forms/maintenance-or-repair"
          element={
            user && user.role === "user" ? (
              <MaintenanceRepair onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/hr-overtime-approval"
          element={
            user && user.role === "user" ? (
              <OvertimeApproval onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/c-o-hr-overtime-approval"
          element={<Navigate to="/forms/hr-overtime-approval" replace />}
        />

        <Route
          path="/forms/hr-leave-application"
          element={
            user && user.role === "user" ? (
              <LeaveApplication onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/submitted-purchase-requests"
          element={
            user ? (
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

        <Route
          path="/forms/submitted-revolving-fund-requests"
          element={
            user ? (
              <SubmittedRevolvingFund onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/submitted-revolving-fund-requests"
          element={<Navigate to="/forms/submitted-revolving-fund-requests" replace />}
        />

        <Route
          path="/forms/submitted-cash-advance-budget-request"
          element={
            user ? (
              <SubmittedCashAdvance onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/submitted-cash-advance-budget-request"
          element={<Navigate to="/forms/submitted-cash-advance-budget-request" replace />}
        />

        <Route
          path="/forms/payment-request-form/submitted"
          element={
            user ? (
              <SubmittedPaymentRequest
                onLogout={handleLogout}
                currentUserId={user.id}
                showAll={user.role !== "user"}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/maintenance-or-repair/submitted"
          element={
            user ? (
              <SubmittedRequests formSlug="maintenance-or-repair" />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/hr-overtime-approval/submitted"
          element={
            user ? (
              <SubmittedRequests formSlug="hr-overtime-approval" />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/hr-leave-application/submitted"
          element={
            user ? (
              <SubmittedRequests formSlug="hr-leave-application" />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

      </Routes>
    </Router>
  );
}

export default App;
