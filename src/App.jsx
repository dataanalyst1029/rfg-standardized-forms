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
// import SubmittedRequests from "./submitted-request/SubmittedRequests";
import SubmittedRevolvingFund from "./submitted-request/SubmittedRevolvingFund";
import SubmittedCashAdvance from "./submitted-request/SubmittedCashAdvance";
import SubmittedCashAdvanceLiquidation from "./submitted-request/SubmittedCashAdvanceLiquidation";
import SubmittedReimbursement from "./submitted-request/SubmittedReimbursement";
import SubmittedPaymentRequest from "./submitted-request/SubmittedPaymentRequest";
import SubmittedInterbranchTransferSlip from "./submitted-request/SubmittedInterbranchTransferSlip";
import SubmittedMaintenanceRepair from "./submitted-request/SubmittedMaintenanceRepair";
import SubmittedCreditCardAcknowledgement from "./submitted-request/SubmittedCreditCardAcknowledgement";
import SubmittedOvertimeApproval from "./submitted-request/SubmittedOvertimeApproval";
import SubmittedLeaveApplication from "./submitted-request/SubmittedLeaveApplication";
import RevolvingFund from "./forms/RevolvingFund";
import CashAdvanceRequest from "./forms/CashAdvanceRequest";
import CashAdvanceLiquidation from "./forms/CashAdvanceLiquidation";
import CAReceipt from "./forms/CAReceipt";
import Reimbursement from "./forms/Reimbursement";
import PaymentRequest from "./forms/PaymentRequest";
import MaintenanceRepair from "./forms/MaintenanceRepair";
import OvertimeApproval from "./forms/OvertimeApproval";
import LeaveApplication from "./forms/LeaveApplication";
import InterbranchTransferSlip from "./forms/InterbranchTransferSlip";
import TransmittalForm from "./forms/TransmittalForm.jsx";
import CreditCardAcknowledgementReceipt from "./forms/CreditCardAcknowledgementReceipt";
import "./styles/App.css";
import SubmittedCAReceipt from "./submitted-request/SubmittedCAReceipt";
import ThemeToggle from "./components/ThemeToggle.jsx";
import SubmittedTransmittals from "./submitted-request/SubmittedTransmittals.jsx";

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
      <ThemeToggle className="app-theme-toggle" />
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
          path="/:view"
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
          path="/forms/ca-receipt-form"
          element={
            user &&
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
              <CAReceipt onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/reimbursement-form"
          element={
            user &&
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
              <Reimbursement onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/payment-request-form"
          element={
            user &&
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
              <PaymentRequest onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/maintenance-or-repair"
          element={
            user && 
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
              <MaintenanceRepair onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/hr-overtime-approval"
          element={
            user && 
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
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
            user && 
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
              <LeaveApplication onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/interbranch-transfer-slip"
          element={
            user && 
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
              <InterbranchTransferSlip onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/transmittal-form"
          element={
            user &&
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
              <TransmittalForm onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/forms/credit-card-acknowledgement-receipt"
          element={
            user && 
            (user.role === "user" || user.role === "staff" || user.role === "admin") ? (
              <CreditCardAcknowledgementReceipt onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

{/* ---------------------------------------------------------------------------------------------------------------------------- */}
        {/* SUBMITTED FORMS */}

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
          path="/forms/submitted-cash-advance-liquidation"
          element={
            user ? (
              <SubmittedCashAdvanceLiquidation onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/submitted-cash-advance-liquidation"
          element={<Navigate to="/forms/submitted-cash-advance-liquidation" replace />}
        />

        <Route
          path="/forms/submitted-ca-receipt"
          element={
            user ? (
              <SubmittedCAReceipt onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/submitted-ca-receipt"
          element={<Navigate to="/forms/submitted-ca-receipt" replace />}
        />

        <Route
          path="/forms/submitted-reimbursement"
          element={
            user ? (
              <SubmittedReimbursement onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/submitted-reimbursement"
          element={<Navigate to="/forms/submitted-reimbursement" replace />}
        />

        <Route
          path="/forms/submitted-payment-request"
          element={
            user ? (
              <SubmittedPaymentRequest onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/submitted-payment-request"
          element={<Navigate to="/forms/submitted-payment-request" replace />}
        />

        <Route
          path="/forms/submitted-maintenance-or-repair"
          element={
            user ? (
              <SubmittedMaintenanceRepair onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/submitted-maintenance-or-repair"
          element={<Navigate to="/forms/submitted-maintenance-or-repair" replace />}
        />

        <Route
          path="/forms/submitted-hr-overtime-approval"
          element={
            user ? (
              <SubmittedOvertimeApproval onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/submitted-hr-overtime-approval"
          element={<Navigate to="/forms/submitted-hr-overtime-approval" replace />}
        />

        <Route
          path="/forms/submitted-hr-leave-application"
          element={
            user ? (
              <SubmittedLeaveApplication onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/submitted-hr-leave-application"
          element={<Navigate to="/forms/submitted-hr-leave-application" replace />}
        />

        {/* <Route
          path="/forms/submitted-hr-leave-application"
          element={
            user ? (
              <SubmittedLeaveApplication onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/forms/hr-leave-application" replace />
            )
          }
        /> */}

        <Route
          path="/forms/submitted-interbranch-transfer-slip"
          element={
            user ? (
              <SubmittedInterbranchTransferSlip onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/submitted-interbranch-transfer-slip"
          element={<Navigate to="/forms/submitted-interbranch-transfer-slip" replace />}
        />

        <Route
          path="/forms/submitted-transmittals"
          element={
            user ? (
              <SubmittedTransmittals onLogout={handleLogout} currentUserId={user.id} />
            ) : (
              <Navigate to="/forms/transmittal-form" replace />
            )
          }
        />

        <Route
          path="/forms/submitted-credit-card-acknowledgement"
          element={
             user ? (
              <SubmittedCreditCardAcknowledgement onLogout={handleLogout} currentUserId={user.id} />
             ) : (
              <Navigate to="/forms/credit-card-acknowledgement-receipt" replace/>
             )
          }
        />

      </Routes>
    </Router>
  );
}

export default App;
