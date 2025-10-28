import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "./config/api";
import "./styles/Dashboard.css";
import ManageUsers from "./ManageUsers.jsx";
import ManageUsersAccess from "./ManageUsersAccess.jsx";
import ManageBranches from "./ManageBranches.jsx";
import ManageDepartments from "./ManageDepartments.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import RequestPurchase from "./RequestPurchase.jsx";
import RequestRevolvingFund from "./RequestRevolvingFund";
import RequestCashAdvance from "./RequestCashAdvance";
import RequestCashAdvanceLiquidation from "./RequestCashAdvanceLiquidation";
import UserSettings from "./UserSettings.jsx";
import FormsList from "./FormsList.jsx";
import { useNavigate } from "react-router-dom";
import ReportsAudit from "./reports/ReportsAudit.jsx";
import ReportsPurchaseRequest from "./reports/ReportsPurchaseRequest.jsx";
import ReportsRevolvingFund from "./reports/ReportsRevolvingFund.jsx";
import ReportsCashAdvance from "./reports/ReportsCashAdvance.jsx";
import ReportsCashAdvanceLiquidation from "./reports/ReportsCashAdvanceLiquidation.jsx";

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

const RECENT_ACTIVITY = [
  {
    id: 1,
    icon: "🛠️",
    message: "Angeline Arangco updated the Purchase Request form template.",
    meta: "1 hour ago",
  },
  {
    id: 2,
    icon: "✅",
    message: "Request PR-00124 approved by Kerwin Gelasing.",
    meta: "2 hours ago",
  },
  {
    id: 3,
    icon: "➕",
    message: "Jo Angel Bayona joined the organization as Staff.",
    meta: "Yesterday",
  },
  {
    id: 4,
    icon: "⚙️",
    message: "System configuration updated by System Admin.",
    meta: "2 days ago",
  },
];

const METRICS = [
  { id: "users", label: "Total users", value: "145" },
  { id: "requests", label: "Active requests", value: "32" },
  { id: "approvals", label: "Pending approvals", value: "8" },
  { id: "alerts", label: "System alerts", value: "3" },
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
      "purchase-request",
      "revolving-fund-request",
      "profile"
    ];
    if (validIds.includes(stored)) {
      return stored;
    }
  }
  return "overview";
};


function OverviewPanel() {
  return (
    <div className="dashboard-content">
      <section className="dashboard-cards">
        {METRICS.map((metric) => (
          <article key={metric.id} className="dashboard-card">
            <span className="dashboard-card-title">{metric.label}</span>
            <span className="dashboard-card-value">{metric.value}</span>
          </article>
        ))}
      </section>

      <section className="recent-activity">
        <h2>Recent activity</h2>
        <div className="recent-activity-list">
          {RECENT_ACTIVITY.map((item) => (
            <div key={item.id} className="recent-activity-entry">
              <span className="recent-activity-icon">{item.icon}</span>
              <div>
                <div>{item.message}</div>
                <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                  {item.meta}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
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

function renderActiveView(view) {
  switch (view) {
    case "overview":
      return <OverviewPanel />;
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
  const storedId = sessionStorage.getItem("id");
  const [userAccess, setUserAccess] = useState([]);
  const navigate = useNavigate();

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
          "approved-requests",
        ].includes(stored)
      ) {
        setRequestsOpen(true);
      }
    }
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
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar scrollbar">
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

        {NAVIGATION.map((section) => {
          if (section.id === "administration" && role !== "admin") return null;

          return (
            <div key={section.id} className="sidebar-section">
              <span className="sidebar-section-title">{section.title}</span>
              <nav className="sidebar-nav">
                {section.items.map((item) => {
                  if (item.id === "requests") {
                    if (role === "admin") return null;
                    return (
                      <div key={item.id} className="sidebar-dropdown">
                        <button
                          type="button"
                          className={`sidebar-item${
                            activeView === "requests" || activeView === "purchase-request" ? " sidebar-item-active" : ""
                          }`}
                          onClick={() => setRequestsOpen((prev) => !prev)}
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
                                onClick={() => setActiveView("purchase-request")}
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
                                onClick={() => setActiveView("revolving-fund-request")}
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
                                onClick={() => setActiveView("cash-advance-budget-request")}
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
                                onClick={() => setActiveView("cash-advance-liquidation")}
                              >
                                Cash Advance Liquidation
                              </button>
                            )}
                            {userAccess.includes("CA Receipt Form") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "purchase-request" ? " underline-active" : ""
                                }`}
                                onClick={() => setActiveView("purchase-request")}
                              >
                                CA Receipt Form
                              </button>
                            )}
                            {userAccess.includes("Reimbursement Form") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "purchase-request" ? " underline-active" : ""
                                }`}
                                onClick={() => setActiveView("purchase-request")}
                              >
                                Reimbursement Form
                              </button>
                            )}
                            {userAccess.includes("Payment Request Form") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "purchase-request" ? " underline-active" : ""
                                }`}
                                onClick={() => setActiveView("purchase-request")}
                              >
                                Payment Request Form
                              </button>
                            )}
                            {userAccess.includes("Maintenance or Repair") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "purchase-request" ? " underline-active" : ""
                                }`}
                                onClick={() => setActiveView("purchase-request")}
                              >
                                Maintenance or Repair
                              </button>
                            )}
                            {userAccess.includes("HR Overtime Approval") && (
                              <button
                                type="button"
                                className={`sidebar-item sidebar-item-nested${
                                  activeView === "purchase-request" ? " underline-active" : ""
                                }`}
                                onClick={() => setActiveView("purchase-request")}
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
                                onClick={() => setActiveView("purchase-request")}
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
                                onClick={() => setActiveView("purchase-request")}
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
                                onClick={() => setActiveView("purchase-request")}
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
                            activeView.startsWith("reports-") ? " sidebar-item-active" : ""
                          }`}
                          onClick={() => {
                            setReportsOpen((prev) => !prev);
                            setRequestsOpen(false);
                          }}
                        >
                          <span className="sidebar-item-icon">📑</span>
                          <span>{item.label}</span>
                          <span className="sidebar-dropdown-arrow">{reportsOpen ? "▲" : "▼"}</span>
                        </button>

                        {reportsOpen && (
                          <div className="sidebar-dropdown-items">
                              <button
                              type="button"
                              className={`sidebar-item sidebar-item-nested${
                                activeView === "reports-purchase-request" ? " underline-active" : ""
                              }`}
                              onClick={() => setActiveView("reports-purchase-request")}
                            >
                              Purchase Request
                            </button>
                            <button
                              type="button"
                              className={`sidebar-item sidebar-item-nested${
                                activeView === "reports-revolving-fund" ? " underline-active" : ""
                              }`}
                              onClick={() => setActiveView("reports-revolving-fund")}
                            >
                              Revolving Fund
                            </button>
                            <button
                              type="button"
                              className={`sidebar-item sidebar-item-nested${
                                activeView === "reports-cash-advance" ? " underline-active" : ""
                              }`}
                              onClick={() => setActiveView("reports-cash-advance")}
                            >
                              Cash Advance Request
                            </button>
                            <button
                              type="button"
                              className={`sidebar-item sidebar-item-nested${
                                activeView === "reports-cash-advance-liquidation" ? " underline-active" : ""
                              }`}
                              onClick={() => setActiveView("reports-cash-advance-liquidation")}
                            >
                              Cash Advance Liquidation
                            </button>
                            <button
                              type="button"
                              className={`sidebar-item sidebar-item-nested${
                                activeView === "reports-audit" ? " underline-active" : ""
                              }`}
                              onClick={() => setActiveView("reports-audit")}
                            >
                              CA Receipt Form
                            </button>
                            <button
                              type="button"
                              className={`sidebar-item sidebar-item-nested${
                                activeView === "reports-audit" ? " underline-active" : ""
                              }`}
                              onClick={() => setActiveView("reports-audit")}
                            >
                              Reimbursement Form
                            </button>
                            <button
                              type="button"
                              className={`sidebar-item sidebar-item-nested${
                                activeView === "reports-audit" ? " underline-active" : ""
                              }`}
                              onClick={() => setActiveView("reports-audit")}
                            >
                              Payment Request Form
                            </button>
                            <button
                              type="button"
                              className={`sidebar-item sidebar-item-nested${
                                activeView === "reports-audit" ? " underline-active" : ""
                              }`}
                              onClick={() => setActiveView("reports-audit")}
                            >
                              Maintenance or Repair
                            </button>
                            <button
                              type="button"
                              className={`sidebar-item sidebar-item-nested${
                                activeView === "reports-audit" ? " underline-active" : ""
                              }`}
                              onClick={() => setActiveView("reports-audit")}
                            >
                              HR Overtime Approval
                            </button>
                            <button
                              type="button"
                              className={`sidebar-item sidebar-item-nested${
                                activeView === "reports-audit" ? " underline-active" : ""
                              }`}
                              onClick={() => setActiveView("reports-audit")}
                            >
                              HR Leave Application
                            </button>
                            <button
                              type="button"
                              className={`sidebar-item sidebar-item-nested${
                                activeView === "reports-audit" ? " underline-active" : ""
                              }`}
                              onClick={() => setActiveView("reports-audit")}
                            >
                              Interbranch Transfer Slip
                            </button>
                            <button
                              type="button"
                              className={`sidebar-item sidebar-item-nested${
                                activeView === "reports-audit" ? " underline-active" : ""
                              }`}
                              onClick={() => setActiveView("reports-audit")}
                            >
                              Credit Card Acknowledgement Receipt
                            </button>
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
              setActiveView("profile");
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

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-heading">
            <h1 className="topbar-title">{activeItem?.headline}</h1>
            <p className="topbar-subtitle">{activeItem?.description}</p>
          </div>
          <div className="topbar-actions">
            <input
              type="search"
              placeholder="Quick find (⌘K)"
              className="topbar-search"
            />
            <ThemeToggle />
          </div>
        </header>

        {renderActiveView(activeView)}
      </section>
    </div>
  );
}

export default Dashboard;
