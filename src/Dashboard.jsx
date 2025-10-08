import { useState, useEffect } from "react";
import ManageUsers from "./ManageUsers";
import ManageUsersAccess from "./ManageUsersAccess";

function Dashboard({ role, onLogout }) {
  const menuItems = [
    { name: "Dashboard", icon: "🏠" },
    { name: "Requests", icon: "📋" },
    { name: "Users", icon: "👥" },
    { name: "Settings", icon: "⚙️" },
  ];

  const [active, setActive] = useState(() => {
    return localStorage.getItem("activePage") || "Dashboard";
  });

  const [activeSubmenu, setActiveSubmenu] = useState(() => {
    return localStorage.getItem("activeSubmenu") || "";
  });

  const [openDropdown, setOpenDropdown] = useState(() => {
    return localStorage.getItem("openDropdown") || "";
  });

  useEffect(() => {
    localStorage.setItem("activePage", active);
  }, [active]);

  useEffect(() => {
    localStorage.setItem("activeSubmenu", activeSubmenu);
  }, [activeSubmenu]);

  useEffect(() => {
    localStorage.setItem("openDropdown", openDropdown);
  }, [openDropdown]);

  return (
    <div className="flex bg-gray-100 min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-800 text-white flex flex-col shadow-lg">
        <div className="p-6 text-2xl font-semibold border-b border-gray-700">
          {role === "admin" ? "RFG Admin Panel" : "RFG Staff Panel"}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            if (item.name === "Users") {
              return (
                <div key={item.name}>
                  {/* USERS MAIN BUTTON (just toggles dropdown) */}
                  <button
                    onClick={() =>
                      setOpenDropdown((prev) =>
                        prev === "Users" ? "" : "Users"
                      )
                    }
                    className={`flex items-center justify-between w-full px-4 py-2 rounded-lg transition ${
                      openDropdown === "Users"
                        ? "bg-gray-700 text-white font-semibold"
                        : "text-gray-800 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </div>
                    <span>{openDropdown === "Users" ? "▾" : "▸"}</span>
                  </button>

                  {/* USERS DROPDOWN MENU */}
                  {openDropdown === "Users" && (
                    <div className="ml-8 mt-1 space-y-1 animate-fadeIn">
                      <button
                        onClick={() => {
                          setActive("Users");
                          setActiveSubmenu("Manage Users");
                        }}
                        className={`block w-full text-left px-4 py-2 rounded transition ${
                          activeSubmenu === "Manage Users"
                            ? "bg-gray-600 text-white font-medium"
                            : "text-gray-800 hover:bg-gray-600 hover:text-white"
                        }`}
                      >
                        Manage Users
                      </button>

                      <button
                        onClick={() => {
                          setActive("Users");
                          setActiveSubmenu("Manage Users Access");
                        }}
                        className={`block w-full text-left px-4 py-2 rounded transition ${
                          activeSubmenu === "Manage Users Access"
                            ? "bg-gray-600 text-white font-medium"
                            : "text-gray-800 hover:bg-gray-600 hover:text-white"
                        }`}
                      >
                        Manage Users Access
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // OTHER MENU BUTTONS
            return (
              <button
                key={item.name}
                onClick={() => {
                  setActive(item.name);
                  setActiveSubmenu("");
                  setOpenDropdown(""); // close dropdowns when navigating elsewhere
                }}
                className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition ${
                  active === item.name
                    ? "bg-gray-700 text-white font-semibold"
                    : "text-gray-800 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-10 fixed inset-0 bg-gray-100 pt-5 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-6 text-left">
          {active} – <span className="capitalize">{role}</span>
        </h1>

        {/* Dashboard Content */}
        {active === "Dashboard" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-lg shadow hover:shadow-md transition">
                <h3 className="text-gray-500 text-sm">Total Users</h3>
                <p className="text-2xl font-bold text-gray-800 mt-2">145</p>
              </div>

              <div className="bg-white p-5 rounded-lg shadow hover:shadow-md transition">
                <h3 className="text-gray-500 text-sm">Active Requests</h3>
                <p className="text-2xl font-bold text-gray-800 mt-2">32</p>
              </div>

              <div className="bg-white p-5 rounded-lg shadow hover:shadow-md transition">
                <h3 className="text-gray-500 text-sm">Pending Approvals</h3>
                <p className="text-2xl font-bold text-gray-800 mt-2">8</p>
              </div>

              <div className="bg-white p-5 rounded-lg shadow hover:shadow-md transition">
                <h3 className="text-gray-500 text-sm">System Alerts</h3>
                <p className="text-2xl font-bold text-gray-800 mt-2">3</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <ul className="space-y-3 text-gray-700">
                <li>✅ User <strong>Jane Doe</strong> updated her profile.</li>
                <li>📝 Request #124 approved by <strong>Admin</strong>.</li>
                <li>⚙️ Settings updated on <strong>October 6, 2025</strong>.</li>
                <li>👥 New user <strong>John Smith</strong> added to the system.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Manage Users */}
        {activeSubmenu === "Manage Users" && <ManageUsers />}

        {/* Manage Users Access */}
        {activeSubmenu === "Manage Users Access" && <ManageUsersAccess />}
      </main>
    </div>
  );
}

export default Dashboard;
