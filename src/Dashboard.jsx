import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { API_BASE_URL } from "./config/api";
import "./styles/Dashboard.css";
import ManageUsers from "./ManageUsers.jsx";
import ManageUsersAccess from "./ManageUsersAccess.jsx";
import ManageBranches from "./ManageBranches.jsx";
import ManageDepartments from "./ManageDepartments.jsx";
import RequestPurchase from "./RequestPurchase.jsx";
import RequestRevolvingFund from "./RequestRevolvingFund";
import RequestCashAdvance from "./RequestCashAdvance";
import RequestCashAdvanceLiquidation from "./RequestCashAdvanceLiquidation";
import RequestReimbursement from "./RequestReimbursement";
import RequestPayment from "./RequestPayment";
import RequestMaintenanceRepair from "./RequestMaintenanceRepair";
import RequestOvertimeApproval from "./RequestOvertimeApproval";
import UserSettings from "./UserSettings.jsx";
import FormsList from "./FormsList.jsx";
// import { useNavigate } from "react-router-dom";
import { useNavigate, useParams } from "react-router-dom";
import ReportsAudit from "./reports/ReportsAudit.jsx";
import ReportsPurchaseRequest from "./reports/ReportsPurchaseRequest.jsx";
import ReportsRevolvingFund from "./reports/ReportsRevolvingFund.jsx";
import ReportsCashAdvance from "./reports/ReportsCashAdvance.jsx";
import ReportsCashAdvanceLiquidation from "./reports/ReportsCashAdvanceLiquidation.jsx";
import ReportsReimbursementForm from "./reports/ReportsReimbursementForm.jsx";
import ReportsPayment from "./reports/ReportsPayment.jsx";
import ReportsCAReceipt from "./reports/ReportsCAReceipt.jsx";
import ReportsMaintenanceRepair from "./reports/ReportsMaintenanceRepair.jsx";
import ReportsCreditCard from "./reports/ReportsCreditCard.jsx"
import ReportsInterbranchTransferSlip from "./reports/ReportsInterbranchTransferSlip.jsx";
import ReportsLeaveApplication from "./reports/ReportsLeaveApplication.jsx";
const STORAGE_KEY = "rfg-dashboard-active-view";

const NAVIGATION = [
  {
    id: "workspace",
    title: "Workspace",
    items: [
      {
        id: "overview",
        label: "Overview",
        icon: "📊",
        headline: "Workspace overview",
        description: "Snapshots across standardized forms for quick insights.",
      },
      {
        id: "requests",
        label: "Requests",
        icon: "🗂️",
        headline: "Request pipeline",
        description:
          "Monitor form submissions, approvals, and pending assignments.",
      },
      {
        id: "reports",
        label: "Reports",
        icon: "📑",
        headline: "Reports Center",
        description: "View and export reports for tracking and analytics.",
      },
    ],
  },
  {
    id: "forms",
    title: "Forms",
    items: [
      {
        id: "forms-menu",
        label: "Forms",
        icon: "🧾",
        headline: "Forms Library",
        description: "Access and manage all form templates.",
      },
    ],
  },
  {
    id: "administration",
    title: "Administration",
    items: [
      {
        id: "manage-users",
        label: "Users",
        icon: "👤",
        headline: "Manage organization users",
        description: "Invite, update, and govern account access.",
      },
      {
        id: "manage-access",
        label: "User Access",
        icon: "🔐",
        headline: "Configure form access",
        description: "Define which forms each role can work on.",
      },
      {
        id: "branches",
        label: "Branches",
        icon: "🗺️",
        headline: "Branch directory",
        description: "Keep branch profiles aligned with the latest changes.",
      },
      {
        id: "departments",
        label: "Departments",
        icon: "🏢",
        headline: "Department registry",
        description:
          "Maintain department hierarchy for routing and approvals.",
      },
    ],
  },
];

// const RECENT_ACTIVITY = [
//   {
//     id: 1,
//     icon: "🛠️",
//     message: "Angeline Arangco updated the Purchase Request form template.",
//     meta: "1 hour ago",
//   },
//   {
//     id: 2,
//     icon: "✅",
//     message: "Request PR-00124 approved by Kerwin Gelasing.",
//     meta: "2 hours ago",
//   },
//   {
//     id: 3,
//     icon: "➕",
//     message: "Jo Angel Bayona joined the organization as Staff.",
//     meta: "Yesterday",
//   },
//   {
//     id: 4,
//     icon: "⚙️",
//     message: "System configuration updated by System Admin.",
//     meta: "2 days ago",
//   },
// ];

const METRICS = [
  { id: "users", label: "Total users" },
  { id: "requests", label: "Active requests" },
  { id: "approvals", label: "Pending approvals" },
  { id: "alerts", label: "System alerts" },
];

const flattenNavigation = (nav) =>
  nav.reduce((acc, section) => acc.concat(section.items), []);

const navigationItems = flattenNavigation(NAVIGATION);

const getInitialView = () => {
  if (typeof window === "undefined") return "overview";
  const stored = sessionStorage.getItem(STORAGE_KEY); 
  if (stored) {
    const validIds = [
      ...navigationItems.map((item) => item.id),
      // "overview",
      "purchase-request",
      "revolving-fund-request",
      "cash-advance-budget-request",
      "cash-advance-liquidation",
      "reimbursement",
      "payment-request",
      "maintenance-repair",
      "overtime-approval-request",
      "reports-purchase-request",
      "reports-revolving-fund",
      "reports-cash-advance",
      "reports-cash-advance-liquidation",
      "reports-ca-receipt",
      "reports-reimbursement-form",
      "reports-payment",
      "reports-maintenance-request",
      "approved-requests",
      "profile"
    ];
    if (validIds.includes(stored)) {
      return stored;
    }
  }
  return "overview";
};


function OverviewPanel({ summary, loading, error } = {}) {
  const workloadCards = summary?.workload ?? [];
  const outstandingItems = summary?.outstanding ?? [];
  const engagement = summary?.engagement;
  const alertsCount =
    typeof summary?.alerts === "number"
      ? summary.alerts
      : outstandingItems.filter((item) => Number(item.age_seconds || 0) > 172800).length;

  const metricValues = {
    users: engagement?.total_users,
    requests: workloadCards.reduce((sum, card) => sum + (card.pending || 0), 0),
    approvals: outstandingItems.length,
    alerts: alertsCount,
  };

  const formatMetric = (value) => {
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    if (typeof value === "string") {
      return value;
    }
    return "—";
  };

  const relativeTime = (value) => {
    if (!value) return null;
    try {
      return formatDistanceToNow(new Date(value), { addSuffix: true });
    } catch {
      return null;
    }
  };

  const statusTone = (status = "") => {
    const normalized = status.toLowerCase();
    // if (normalized.includes("declin") || normalized.includes("reject")) return "danger";
    if (normalized.includes("decline") || normalized.includes("reject")) return "danger";
    if (normalized.includes("approve")) return "success";
    return "pending";
  };

  const refreshedLabel = relativeTime(summary?.refreshed_at);

  const workloadContent =
    workloadCards.length === 0 && !loading ? (
      <p className="panel-empty">No submissions yet.</p>
    ) : (
      <div className="dashboard-cards dashboard-cards--compact">
        {workloadCards.map((card) => (
          <article key={card.key} className="dashboard-card dashboard-card--compact">
            <span className="dashboard-card-title">{card.label}</span>
            <span className="dashboard-card-value">{formatMetric(card.total)}</span>
            <div className="workload-breakdown">
              <span className="status-pill status-pill--pending">
                {formatMetric(card.pending)} pending
              </span>
              <span className="status-pill status-pill--success">
                {formatMetric(card.approved)} approved
              </span>
              <span className="status-pill status-pill--danger">
                {formatMetric(card.declined)} declined
              </span>
            </div>
          </article>
        ))}
      </div>
    );

  const outstandingContent =
    outstandingItems.length === 0 && !loading ? (
      <p className="panel-empty">You're all caught up.</p>
    ) : (
      <ul className="outstanding-list">
        {outstandingItems.map((item) => (
          <li key={`${item.form_key}-${item.code}`} className="outstanding-item">
            <div className="outstanding-info">
              <p className="outstanding-code">{item.code}</p>
              <span className="text-muted outstanding-context">
                {item.form_label}
                {item.requester ? ` • ${item.requester}` : ""}
              </span>
            </div>
            <div className="outstanding-status">
              <span className={`status-badge status-badge--${statusTone(item.status)}`}>
                {item.status}
              </span>
              <span className="outstanding-meta">
                {relativeTime(item.activity_ts) || "Awaiting update"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    );

  const engagementRate =
    engagement && engagement.total_users
      ? Math.round((engagement.active_users_7d / engagement.total_users) * 100)
      : null;

  return (
    <div className="dashboard-content">
      <section className="dashboard-cards">
        {METRICS.map((metric) => (
          <article key={metric.id} className="dashboard-card">
            <span className="dashboard-card-title">{metric.label}</span>
            <span className="dashboard-card-value">{formatMetric(metricValues[metric.id])}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <h2>Workload snapshot</h2>
            <p>Live requests by lifecycle stage.</p>
          </div>
          <span className="panel-meta">
            {loading ? "Refreshing…" : refreshedLabel ? `Updated ${refreshedLabel}` : ""}
          </span>
        </div>
        {error && <div className="panel-error">{error}</div>}
        {workloadContent}
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>Outstanding actions</h2>
              <p>Requests that still need attention.</p>
            </div>
          </div>
          {outstandingContent}
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>User engagement</h2>
              <p>Activity from the past 7 days.</p>
            </div>
          </div>
          {engagement ? (
            <div className="engagement-grid">
              <article className="engagement-card">
                <span className="engagement-label">Total users</span>
                <strong>{formatMetric(engagement.total_users)}</strong>
                <span className="engagement-meta">People with access</span>
              </article>
              <article className="engagement-card">
                <span className="engagement-label">Active this week</span>
                <strong>{formatMetric(engagement.active_users_7d)}</strong>
                <span className="engagement-meta">
                  {engagementRate !== null ? `${engagementRate}% of users` : "Tracking logins"}
                </span>
              </article>
              <article className="engagement-card">
                <span className="engagement-label">Submissions (7d)</span>
                <strong>{formatMetric(engagement.submissions_7d)}</strong>
                <span className="engagement-meta">New form entries</span>
              </article>
            </div>
          ) : (
            <p className="panel-empty">{loading ? "Loading engagement data…" : "No data yet."}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function PlaceholderPanel({ title, description }) {
  return (
    <div className="dashboard-content">
      <section className="dashboard-placeholder">
        <h3>{title}</h3>
        <p>{description}</p>
      </section>
    </div>
  );
}

function renderActiveView(view, extraProps = {}) {
  switch (view) {
    case "overview":
      return <OverviewPanel {...extraProps.overview} />;
    case "requests":
      return (
        <PlaceholderPanel
          title="Requests workspace"
          description="This space will surface live forms, routing stages, and the approval board. Hook it up to Supabase or your API to see real-time data."
        />
      );
    case "purchase-request":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <RequestPurchase />
        </div>
      )
    case "revolving-fund-request":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <RequestRevolvingFund />
        </div>
      );

    case "cash-advance-budget-request":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <RequestCashAdvance />
        </div>
      );

    case "cash-advance-liquidation":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <RequestCashAdvanceLiquidation />
        </div>
      );
    
    case "reimbursement":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <RequestReimbursement />
        </div>
      );

    case "payment-request":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <RequestPayment />
        </div>
      );

    case "maintenance-repair":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <RequestMaintenanceRepair />
        </div>
      );

    case "overtime-approval-request":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <RequestOvertimeApproval />
        </div>
      );

    case "reports-summary":
      return (
        <PlaceholderPanel
          title="Summary Report"
          description="Overview of system activity and form submissions."
        />
      );

    case "reports-revolving-fund":
      return (
        <ReportsRevolvingFund/>
      );

    case "reports-purchase-request":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ReportsPurchaseRequest />
        </div>
      );

    case "reports-cash-advance":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ReportsCashAdvance />
        </div>
      );

    case "reports-cash-advance-liquidation":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ReportsCashAdvanceLiquidation />
        </div>
      );

    case "reports-reimbursement-form":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ReportsReimbursementForm/>
        </div>
      );

    case "reports-payment":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ReportsPayment/>
        </div>
      );

    case "reports-ca-receipt":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ReportsCAReceipt/>
        </div>
      );

    case "reports-maintenance-request":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ReportsMaintenanceRepair/>
        </div>
      );

    case "reports-credit-card-acknowledgement":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ReportsCreditCard/>
        </div>
      );

    case "reports-interbranch-transfer-slip":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ReportsInterbranchTransferSlip/>
        </div>
      );

    case "reports-leave-application":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ReportsLeaveApplication/>
        </div>
      );

    case "reports-audit":
      return (
        <ReportsAudit/>
      );

    case "forms-menu":
      return (
        <div className="dashboard-content dashboard-content--centered">
          <FormsList />
        </div>
      );


    case "profile":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <UserSettings />
        </div>
      );

    case "manage-users":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ManageUsers />
        </div>
      );
    case "manage-access":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ManageUsersAccess />
        </div>
      );
    case "branches":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ManageBranches />
        </div>
      );
    case "departments":
      return (
        <div className="dashboard-content dashboard-content--flush">
          <ManageDepartments />
        </div>
      );
    default:
      return (
        <PlaceholderPanel
          title="Coming soon"
          description="We're still wiring up this surface. Connect your Supabase project or backend service to unlock it."
        />
      );
  }
}

function Dashboard({ role, name, onLogout }) {
  const [activeView, setActiveView] = useState(getInitialView);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const storedId = sessionStorage.getItem("id");
  const [userAccess, setUserAccess] = useState([]);
  const [userRole, setUserRole] = useState([]);
  const { view } = useParams();
  const navigate = useNavigate();

  // const [activeView, setActiveView] = useState(view || "overview");

  useEffect(() => {
    if (view && view !== activeView) {
      setActiveView(view);
    }
  }, [view]);

  const handleMenuClick = (menuId) => {
    setActiveView(menuId);
    navigate(`/${menuId}`);
  };


  useEffect(() => {
    let ignore = false;

    const fetchSummary = async () => {
      if (!ignore) {
        setSummaryLoading(true);
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
        if (!response.ok) {
          throw new Error("Unable to load dashboard overview");
        }
        const data = await response.json();
        if (!ignore) {
          setDashboardSummary(data);
          setSummaryError(null);
        }
      } catch (err) {
        console.error("Error loading dashboard summary:", err);
        if (!ignore) {
          setSummaryError(err.message || "Unable to load dashboard overview");
        }
      } finally {
        if (!ignore) {
          setSummaryLoading(false);
        }
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 60000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const fetchAccess = async () => {
      if (!storedId) return;
      try {
        const response = await fetch(`${API_BASE_URL}/user-access/${storedId}`);
        const data = await response.json();
        if (response.ok) {
          setUserAccess(data.access_forms || []);
          setUserRole(data.role || "staff");
        } else {
          console.error("Failed to load access:", data.error);
        }
      } catch (err) {
        console.error("Error fetching access:", err);
      }
    };

    fetchAccess();
  }, [storedId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, activeView);
    }
  }, [activeView]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeView]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (
        stored &&
        [
          "requests",
          "purchase-request",
          "revolving-fund-request",
          "cash-advance-budget-request",
          "cash-advance-liquidation",
          "reimbursement",
          "payment-request",
          "maintenance-repair",
          "overtime-approval-request",
          "approved-requests",
        ].includes(stored)
      ) {
        setRequestsOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (
        stored &&
        [
          "reports",
          "reports-purchase-request",
          "reports-revolving-fund",
          "reports-cash-advance",
          "reports-cash-advance-liquidation",
          "reports-ca-receipt",
          "reports-reimbursement-form",
          "reports-payment",
          "reports-maintenance-request",
          "approved-requests",
        ].includes(stored)
      ) {
        setReportsOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const activeItem = useMemo(
    () =>
      navigationItems.find((item) => item.id === activeView) ||
      navigationItems[0],
    [activeView]
  );

  const storedName =
    name ||
    (typeof window !== "undefined" ? localStorage.getItem("name") : "");

  return (
    <div className={`dashboard-layout${isSidebarOpen ? " dashboard-layout--sidebar-open" : ""}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-project-name">RFG Forms Console</span>
          <span className="sidebar-project-env">
            Production
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.2rem 0.5rem",
                borderRadius: "9999px",
                background: "rgba(36, 207, 142, 0.12)",
                color: "var(--color-accent)",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              Live
            </span>
          </span>
        </div>

        <div className="sidebar-content scrollbar">
          {NAVIGATION.map((section) => {
          if (section.id === "administration" && role !== "admin") return null;

          return (
            <div key={section.id} className="sidebar-section">
              <span className="sidebar-section-title">{section.title}</span>
              <nav className="sidebar-nav">
                {section.items.map((item) => {
                  if (item.id === "overview") {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`sidebar-item${activeView === "overview" ? " sidebar-item-active" : ""}`}
                        onClick={() => handleMenuClick("overview")}
                      >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  } 
                  
                  if (item.id === "manage-users") {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`sidebar-item${activeView === "manage-users" ? " sidebar-item-active" : ""}`}
                        onClick={() => handleMenuClick("manage-users")}
                      >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  } 

                  if (item.id === "manage-access") {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`sidebar-item${activeView === "manage-access" ? " sidebar-item-active" : ""}`}
                        onClick={() => handleMenuClick("manage-access")}
                      >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  } 

                  if (item.id === "branches") {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`sidebar-item${activeView === "branches" ? " sidebar-item-active" : ""}`}
                        onClick={() => handleMenuClick("branches")}
                      >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  } 

                  if (item.id === "departments") {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`sidebar-item${activeView === "departments" ? " sidebar-item-active" : ""}`}
                        onClick={() => handleMenuClick("departments")}
                      >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  } 

                  if (item.id === "requests") {
                    if (role === "admin") return null;
                    return (
                      <div key={item.id} className="sidebar-dropdown">
                        <button
                          type="button"
                          className={`sidebar-item${
                            activeView === "requests" || activeView === "purchase-request" || activeView === "revolving-fund-request" || activeView === "cash-advance-budget-request" || activeView === "cash-advance-liquidation" || activeView === "reimbursement" || activeView === "payment-request" || activeView === "maintenance-repair" || activeView === "overtime-approval-request" ? " sidebar-item-active" : ""
                          }`}
                          onClick={
                            () => {setRequestsOpen((prev) => !prev);
                            setReportsOpen(false);
                            }
                          }
                        >
                          <span className="sidebar-item-icon">{item.icon}</span>
                          <span>{item.label}</span>
                          <span className="sidebar-dropdown-arrow">{requestsOpen ? "▲" : "▼"}</span>
                        </button>

                        {/* <button
                          type="button"
                          className={`sidebar-item${
                            activeView === "requests" || activeView === "revolving-fund-request" ? " sidebar-item-active" : ""
                          }`}
                          onClick={() => setRequestsOpen((prev) => !prev)}
                        >
                          <span className="sidebar-item-icon">{item.icon}</span>
                          <span>{item.label}</span>
                          <span className="sidebar-dropdown-arrow">{requestsOpen ? "▲" : "▼"}</span>
                        </button> */}


                        {requestsOpen && (
                          <div className="sidebar-dropdown-items">
                            {userAccess.includes("Purchase Request") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "purchase-request" ? " underline-active" : ""
                                }`}
                                onClick={() => handleMenuClick("purchase-request")}
                              >
                                Purchase Request
                              </button>
                            )}

                            {userAccess.includes("Revolving Fund") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "revolving-fund-request" ? " underline-active" : ""
                                }`}
                                onClick={() => handleMenuClick("revolving-fund-request")}
                              >
                                Revolving Fund
                              </button>
                            )}
                            {userAccess.includes("Cash Advance Request") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "cash-advance-budget-request" ? " underline-active" : ""
                                }`}
                                onClick={() => handleMenuClick("cash-advance-budget-request")}
                              >
                                Cash Advance Request
                              </button>
                            )}
                            {userAccess.includes("Cash Advance Liquidation") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "cash-advance-liquidation" ? " underline-active" : ""
                                }`}
                                onClick={() => handleMenuClick("cash-advance-liquidation")}
                              >
                                Cash Advance Liquidation
                              </button>
                            )}
                            {/* {userAccess.includes("CA Receipt Form") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "purchase-request" ? " underline-active" : ""
                                }`}
                                onClick={() => setActiveView("purchase-request")}
                              >
                                CA Receipt Form
                              </button>
                            )} */}
                            {userAccess.includes("Reimbursement Form") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "reimbursement" ? " underline-active" : ""
                                }`}
                                onClick={() => handleMenuClick("reimbursement")}
                              >
                                Reimbursement Form
                              </button>
                            )}
                            {userAccess.includes("Payment Request Form") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "payment-request" ? " underline-active" : ""
                                }`}
                                onClick={() => handleMenuClick("payment-request")}
                              >
                                Payment Request
                              </button>
                            )}
                            {userAccess.includes("Maintenance or Repair") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "maintenance-repair" ? " underline-active" : ""
                                }`}
                                onClick={() => handleMenuClick("maintenance-repair")}
                              >
                                Maintenance or Repair
                              </button>
                            )}
                            {userAccess.includes("c/o HR Overtime Approval") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "overtime-approval-request" ? " underline-active" : ""
                                }`}
                                onClick={() => handleMenuClick("overtime-approval-request")}
                              >
                                HR Overtime Approval
                              </button>
                            )}
                            {userAccess.includes("HR Leave Application") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "purchase-request" ? " underline-active" : ""
                                }`}
                                onClick={() => handleMenuClick("purchase-request")}
                              >
                                HR Leave Application
                              </button>
                            )}
                            {userAccess.includes("Interbranch Transfer Slip") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "purchase-request" ? " underline-active" : ""
                                }`}
                                onClick={() => handleMenuClick("purchase-request")}
                              >
                                Interbranch Transfer Slip
                              </button>
                            )}
                            {userAccess.includes("Credit Card Acknowledgement Receipt") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "purchase-request" ? " underline-active" : ""
                                }`}
                                onClick={() => handleMenuClick("purchase-request")}
                              >
                                Credit Card Acknowledgement Receipt
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (item.id === "reports") {
                    return (
                      <div key={item.id} className="sidebar-dropdown">
                        <button
                          type="button"
                          className={`sidebar-item${
                            activeView.startsWith("reports") ? " sidebar-item-active" : ""
                          }`}
                          onClick={
                            () => {setReportsOpen((prev) => !prev);
                            setRequestsOpen(false);
                            }
                          }
                        >
                          <span className="sidebar-item-icon">{item.icon}</span>
                          <span>{item.label}</span>
                          <span className="sidebar-dropdown-arrow">{reportsOpen ? "▲" : "▼"}</span>
                        </button>
                        {/* <button
                          type="button"
                          className={`sidebar-item${
                            activeView.startsWith("reports") || activeView === "reports-purchase-request"  ? " sidebar-item-active" : ""
                          }`}
                          onClick={() => {
                            setReportsOpen((prev) => !prev);
                            setRequestsOpen(false);
                          }}
                        >
                          <span className="sidebar-item-icon">📑</span>
                          <span>{item.label}</span>
                          <span className="sidebar-dropdown-arrow">{reportsOpen ? "▲" : "▼"}</span>
                        </button> */}

                        {reportsOpen && (
                          <div className="sidebar-dropdown-items">
                            {(role === "admin" || userAccess.includes("Purchase Request")) && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "reports-purchase-request" ? " underline-active" : ""
                                }`}
                                onClick={() => handleMenuClick("reports-purchase-request")}
                              >
                                Purchase Request
                              </button>
                            )}

                            {(role === "admin" || userAccess.includes("Revolving Fund")) && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "reports-revolving-fund" ? " underline-active" : ""
                                }`}
                                  onClick={() => handleMenuClick("reports-revolving-fund")}
                                >
                                  Revolving Fund
                                </button>
                              )}

                              {(role === "admin" || userAccess.includes("Cash Advance Request")) && (
                                <button
                                  type="button"
                                  className={`sidebar-item sidebar-item-nested${
                                    activeView === "reports-cash-advance" ? " underline-active" : ""
                                  }`}
                                  onClick={() => handleMenuClick("reports-cash-advance")}
                                >
                                  Cash Advance Request
                                </button>
                              )}

                              {(role === "admin" || userAccess.includes("Cash Advance Liquidation")) && (
                                <button
                                  type="button"
                                  className={`sidebar-item sidebar-item-nested${
                                    activeView === "reports-cash-advance-liquidation" ? " underline-active" : ""
                                  }`}
                                  onClick={() => handleMenuClick("reports-cash-advance-liquidation")}
                                >
                                  Cash Advance Liquidation
                                </button>
                              )}

                              {(role === "admin" || userAccess.includes("CA Receipt Form")) && (
                                <button
                                  type="button"
                                  className={`sidebar-item sidebar-item-nested${
                                    activeView === "reports-ca-receipt" ? " underline-active" : ""
                                  }`}
                                  onClick={() => handleMenuClick("reports-ca-receipt")}
                                >
                                  CA Receipt Form
                                </button>
                              )}

                              {(role === "admin" || userAccess.includes("Reimbursement Form")) && (
                                <button
                                  type="button"
                                  className={`sidebar-item sidebar-item-nested${
                                    activeView === "reports-reimbursement-form" ? " underline-active" : ""
                                  }`}
                                  onClick={() => handleMenuClick("reports-reimbursement-form")}
                                >
                                  Reimbursement Form
                                </button>
                              )}

                              {(role === "admin" || userAccess.includes("Payment Request Form")) && (
                                <button
                                  type="button"
                                  className={`sidebar-item sidebar-item-nested${
                                    activeView === "reports-payment" ? " underline-active" : ""
                                  }`}
                                  onClick={() => handleMenuClick("reports-payment")}
                                >
                                  Payment Request Form
                                </button>
                              )}

                              {(role === "admin" || userAccess.includes("Maintenance or Repair")) && (
                                <button
                                  type="button"
                                  className={`sidebar-item sidebar-item-nested${
                                    activeView === "reports-maintenance-request" ? " underline-active" : ""
                                  }`}
                                  onClick={() => handleMenuClick("reports-maintenance-request")}
                                >
                                  Maintenance or Repair
                                </button>
                              )}

                              {(role === "admin" || userAccess.includes("HR Overtime Approval")) && (
                                <button
                                  type="button"
                                  className={`sidebar-item sidebar-item-nested${
                                    activeView === "reports-audit" ? " underline-active" : ""
                                  }`}
                                  onClick={() => handleMenuClick("reports-audit")}
                                >
                                  HR Overtime Approval
                                </button>
                              )}

                              {(role === "admin" || userAccess.includes("HR Leave Application")) && (
                                <button
                                  type="button"
                                  className={`sidebar-item sidebar-item-nested${
                                    activeView === "reports-leave-application" ? " underline-active" : ""
                                  }`}
                                  onClick={() => handleMenuClick("reports-leave-application")}
                                >
                                  HR Leave Application
                                </button>
                              )}

                              {(role === "admin" || userAccess.includes("Interbranch Transfer Slip")) && (
                                <button
                                  type="button"
                                  className={`sidebar-item sidebar-item-nested${
                                    activeView === "reports-interbranch-transfer-slip" ? " underline-active" : ""
                                  }`}
                                  onClick={() => handleMenuClick("reports-interbranch-transfer-slip")}
                                >
                                  Interbranch Transfer Slip
                                </button>
                              )}

                              {(role === "admin" || userAccess.includes("Credit Card Acknowledgement Receipt")) && (
                                <button
                                  type="button"
                                  className={`sidebar-item sidebar-item-nested${
                                    activeView === "reports-credit-card-acknowledgement" ? " underline-active" : ""
                                  }`}
                                  onClick={() => handleMenuClick("reports-credit-card-acknowledgement")}
                                >
                                  Credit Card Acknowledgement Receipt
                                </button>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (item.id === "forms-menu") {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate("/forms-list")}
                        className="sidebar-item"
                      >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  }



                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveView(item.id);
                        setRequestsOpen(false); 
                        setReportsOpen(false);  
                      }}
                      className={`sidebar-item${
                        activeView === item.id ? " sidebar-item-active" : ""
                      }`}
                    >
                      <span className="sidebar-item-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );

                })}
              </nav>
            </div>
          );
        })}
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-meta">
            <span className="sidebar-user-name">
              {storedName || "Workspace User"}
            </span>
            <span className="sidebar-user-role">
              {role ? role.toUpperCase() : "STAFF"}
            </span>
          </div>

          <button
            type="button"
            className={`sidebar-item${activeView === "profile" ? " sidebar-item-active" : ""}`}
            onClick={() => {
              handleMenuClick("profile");
              setRequestsOpen(false);
              setReportsOpen(false);
            }}
            style={{ marginBottom: "0.5rem" }}
          >
            ⚙️ Profile & Settings
          </button>

          <button
            type="button"
            className="sidebar-logout"
            onClick={() => {
              sessionStorage.removeItem(STORAGE_KEY);
              onLogout();
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      {isSidebarOpen && (
        <div
          className="dashboard-overlay"
          role="presentation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={`${isSidebarOpen ? "Close" : "Open"} navigation`}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="topbar-heading">
            <h1 className="topbar-title">{activeItem?.headline}</h1>
            <p className="topbar-subtitle">{activeItem?.description}</p>
          </div>
          {/* <div className="topbar-actions">
            <input
              type="search"
              placeholder="Quick find (⌘K)"
              className="topbar-search"
            />
          </div> */}
        </header>

        {renderActiveView(activeView, {
          overview: {
            summary: dashboardSummary,
            loading: summaryLoading,
            error: summaryError,
          },
        })}
      </section>
    </div>
  );
}

export default Dashboard;
