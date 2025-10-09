import { useState, useEffect } from "react";
import ManageUsers from "./ManageUsers";
import ManageUsersAccess from "./ManageUsersAccess";
import ManageBranches from "./ManageBranches";
import ManageDepartments from "./ManageDepartments";

function Dashboard({ role, name, onLogout }) {
  const storedName = name || localStorage.getItem("name");

  const menuItems = [
    { name: "Dashboard", icon: "🏠" },
    { name: "Requests", icon: "📋" },
    { name: "Users", icon: "👥" },
    { name: "Organization", icon: "🏢" }, // ✅ New dropdown section
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
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">{storedName}</h2>
          <p className="text-sm text-gray-400">
            {role === "admin" ? "Admin" : "Staff"}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            // 🔹 USERS DROPDOWN
            if (item.name === "Users") {
              return (
                <div key={item.name}>
                  <button
                    onClick={() =>
                      setOpenDropdown((prev) =>
                        prev === "Users" ? "" : "Users"
                      )
                    }
                    className={`flex items-center justify-between w-full px-4 py-2 rounded-lg transition ${
                      openDropdown === "Users"
                        ? "bg-gray-700 text-white font-semibold"
                        : "text-gray-700 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </div>
                    <span>{openDropdown === "Users" ? "▾" : "▸"}</span>
                  </button>

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
                            : "text-gray-700 hover:bg-gray-600 hover:text-white"
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
                            : "text-gray-700 hover:bg-gray-600 hover:text-white"
                        }`}
                      >
                        Manage Users Access
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // 🔹 ORGANIZATION DROPDOWN (NEW)
            if (item.name === "Organization") {
              return (
                <div key={item.name}>
                  <button
                    onClick={() =>
                      setOpenDropdown((prev) =>
                        prev === "Organization" ? "" : "Organization"
                      )
                    }
                    className={`flex items-center justify-between w-full px-4 py-2 rounded-lg transition ${
                      openDropdown === "Organization"
                        ? "bg-gray-700 text-white font-semibold"
                        : "text-gray-700 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </div>
                    <span>{openDropdown === "Organization" ? "▾" : "▸"}</span>
                  </button>

                  {openDropdown === "Organization" && (
                    <div className="ml-8 mt-1 space-y-1 animate-fadeIn">
                      <button
                        onClick={() => {
                          setActive("Organization");
                          setActiveSubmenu("Branches");
                        }}
                        className={`block w-full text-left px-4 py-2 rounded transition ${
                          activeSubmenu === "Branches"
                            ? "bg-gray-600 text-white font-medium"
                            : "text-gray-700 hover:bg-gray-600 hover:text-white"
                        }`}
                      >
                        Branches
                      </button>

                      <button
                        onClick={() => {
                          setActive("Organization");
                          setActiveSubmenu("Departments");
                        }}
                        className={`block w-full text-left px-4 py-2 rounded transition ${
                          activeSubmenu === "Departments"
                            ? "bg-gray-600 text-white font-medium"
                            : "text-gray-700 hover:bg-gray-600 hover:text-white"
                        }`}
                      >
                        Departments
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // 🔹 DEFAULT SINGLE MENU ITEMS
            return (
              <button
                key={item.name}
                onClick={() => {
                  setActive(item.name);
                  setActiveSubmenu("");
                  setOpenDropdown("");
                }}
                className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition ${
                  active === item.name
                    ? "bg-gray-700 text-white font-semibold"
                    : "text-gray-700 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
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

        {/* Example Dashboard Content */}
        {active === "Dashboard" && (
          <div className="space-y-6">
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

        {/* Example pages */}
        {activeSubmenu === "Manage Users" && <ManageUsers />}
        {activeSubmenu === "Manage Users Access" && <ManageUsersAccess />}
        {activeSubmenu === "Manage Branches" && <ManageBranches />}
        {activeSubmenu === "Manage Departments" && <ManageDepartments />}

        {/* ✅ Placeholder for Organization pages */}
        {activeSubmenu === "Branches" && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold">Branch Management</h2>
            <p className="text-gray-600 mt-2">
              This is where branch management features will go.
            </p>
          </div>
        )}

        {activeSubmenu === "Departments" && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold">Department Management</h2>
            <p className="text-gray-600 mt-2">
              This is where department management features will go.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
