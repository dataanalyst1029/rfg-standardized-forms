import { useEffect, useMemo, useState } from "react";
import "./Dashboard.css";
import ManageUsers from "./ManageUsers.jsx";
import ManageUsersAccess from "./ManageUsersAccess.jsx";
import ManageBranches from "./ManageBranches.jsx";
import ManageDepartments from "./ManageDepartments.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";

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
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return navigationItems.some((item) => item.id === stored)
    ? stored
    : "overview";
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, activeView);
    }
  }, [activeView]);

  const activeItem = useMemo(
    () =>
      navigationItems.find((item) => item.id === activeView) ||
      navigationItems[0],
    [activeView],
  );

  const storedName =
    name ||
    (typeof window !== "undefined" ? window.localStorage.getItem("name") : "");

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

        {NAVIGATION.map((section) => (
          <div key={section.id} className="sidebar-section">
            <span className="sidebar-section-title">{section.title}</span>
            <nav className="sidebar-nav">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`sidebar-item${
                    activeView === item.id ? " sidebar-item-active" : ""
                  }`}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        ))}

        <div className="sidebar-user">
          <div className="sidebar-user-meta">
            <span className="sidebar-user-name">
              {storedName || "Workspace User"}
            </span>
            <span className="sidebar-user-role">
              {role ? role.toUpperCase() : "STAFF"}
            </span>
          </div>
          <button type="button" className="sidebar-logout" onClick={onLogout}>
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
