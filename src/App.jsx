"use client";

import React, { useState, useEffect, createContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
// import Dashboard from "./pages/Dashboard";
// import DealerForm from "./pages/DealerForm";
// import History from "./pages/History";
// import Tracker from "./pages/Tracker";
// import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Attendance from "./pages/Attendents"; // Corrected typo here, assuming it's "Attendance" in file path
import Sidebar from "./components/Sidebaar";
import Travel from "./pages/Travel";
import History from "./pages/History";
export const AuthContext = createContext(null);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notification, setNotification] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // This will store all user info
  const [userType, setUserType] = useState(null); // This is essentially currentUser.role
  const [tabs, setTabs] = useState([]); // State to hold the tabs preference

  // Spreadsheet ID for Google Sheets data
  const SPREADSHEET_ID = "13OMuFL3ki3gQr2ChP3Khhn5-BpGqDiwCF3sbGNUCC8A"; // Your Tracker's Spreadsheet ID

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated");
    const storedUser = localStorage.getItem("currentUser"); // Corrected potential typo in key
    const storedUserType = localStorage.getItem("userType"); // This is currentUser.role

    if (auth === "true" && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setIsAuthenticated(true);
      setCurrentUser(parsedUser);
      setUserType(storedUserType); // Still keep userType for simplicity if used elsewhere
      setTabs(parsedUser.tabs || []); // Set tabs from stored user data
      
      // Debug: Log what tabs are loaded from localStorage
      console.log("Loaded from localStorage - tabs:", parsedUser.tabs);
    }
  }, []);

  const login = async (username, password) => {
    try {
      // Updated column mapping for Master sheet:
      // Column A (index 0) = Sales Person Name
      // Column B (index 1) = Username  
      // Column C (index 2) = Password
      // Column D (index 3) = Role
      // Column E (index 4) = Access/Tabs

      const masterSheetUrl =
        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Master`;
      const response = await fetch(masterSheetUrl);
      const text = await response.text();

      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonData = text.substring(jsonStart, jsonEnd);
      const data = JSON.parse(jsonData);

      if (!data?.table?.rows) {
        showNotification("Failed to fetch user data from Master sheet.", "error");
        return false;
      }

      const rows = data.table.rows;

      // Check for username and password in columns B (index 1) and C (index 2)
      const foundUserRow = rows.find(
        (row) => row.c?.[1]?.v === username && row.c?.[2]?.v === password
      );

      if (foundUserRow) {
        // Debug: Log the found user row
        console.log("=== DEBUG LOGIN DATA ===");
        console.log("Found user row:", foundUserRow);
        console.log("Column E value (Access/Tabs):", foundUserRow.c?.[4]?.v);

        const accessValue = foundUserRow.c?.[4]?.v;
        let userTabs = [];

        if (accessValue === "all") {
          userTabs = [
            // "Dashboard",
            // "Dealer Form",
            // "Tracker",
            "History",
            "Travel", 
            "Attendance",
          ];
        } else if (accessValue && typeof accessValue === 'string') {
          userTabs = accessValue.split(",").map((t) => t.trim()).filter(Boolean);
        }

        const userInfo = {
          username: username,
          // Column A (index 0) = Sales Person Name
          salesPersonName: foundUserRow.c?.[0]?.v || "Unknown Sales Person",
          // Column D (index 3) = Role
          role: foundUserRow.c?.[3]?.v || "user",
          loginTime: new Date().toISOString(),
          // Column E (index 4) = Access/Tabs
          tabs: userTabs,
        };

        console.log("User info tabs:", userInfo.tabs);
        console.log("========================");

        setIsAuthenticated(true);
        setCurrentUser(userInfo);
        setUserType(userInfo.role); // Set userType state from userInfo.role
        setTabs(userInfo.tabs); // Set tabs from user info

        // Store currentUser as a single JSON object in localStorage
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("currentUser", JSON.stringify(userInfo)); // Store all relevant user data
        localStorage.setItem("userType", userInfo.role); // Still store userType separately for backward compatibility if needed

        showNotification(`Welcome, ${userInfo.salesPersonName || username}!`, "success");
        return true;
      } else {
        showNotification("Invalid username or password", "error");
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      showNotification("An error occurred during login", "error");
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserType(null);
    setTabs([]); // Reset tabs on logout
    localStorage.clear(); // Clear all localStorage items on logout
    showNotification("Logged out successfully", "success");
  };

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const isAdmin = () => userType === "admin"; // Check if userType is 'admin'

  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (adminOnly && !isAdmin()) {
      showNotification(
        "You don't have permission to access this page",
        "error"
      );
      return <Navigate to="/attendance" />; // Redirect to attendance instead of dashboard
    }
    return children;
  };

  // Debug: Log tabs when they change
  useEffect(() => {
    console.log("=== TABS STATE CHANGED ===");
    console.log("Current tabs state:", tabs);
    console.log("Current user:", currentUser);
    console.log("=========================");
  }, [tabs, currentUser]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        currentUser, // Provide currentUser object
        userType, // Still provide userType for compatibility
        isAdmin,
        showNotification,
        tabs, // Use actual tabs state from user data
      }}
    >
      <Router>
        <div className="flex h-screen bg-gray-50 text-gray-900">
          {isAuthenticated && (
            <div className=" md:fixed md:inset-y-0 md:left-0 md:w-64 md:bg-gray-800 md:text-white md:z-20 md:shadow-lg">
              <Sidebar
                logout={logout}
                userType={userType}
                username={currentUser?.salesPersonName || currentUser?.username} // Show sales person name or fallback to username
                tabs={tabs}
              />
            </div>
          )}

          {/* Main Content Wrapper */}
          <div
            className={`flex flex-col flex-1 overflow-hidden ${isAuthenticated ? "md:ml-64" : ""
              }`}
          >
            {/* Notification bar */}
            {notification && (
              <div
                className={`p-4 text-sm ${notification.type === "error"
                  ? "bg-red-100 text-red-700"
                  : notification.type === "success"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                  }`}
              >
                {notification.message}
              </div>
            )}

            {/* Scrollable Content Area */}
            <div className="sm:mt-0 mt-12 flex-1 min-h-0 overflow-y-auto px-2 sm:px-6 py-4 flex flex-col justify-between">
              <div className="mb-5">
                <Routes>
                  <Route
                    path="/login"
                    element={!isAuthenticated ? <Login /> : <Navigate to="/attendance" />}
                  />
                  {/* 
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dealer-form"
                    element={
                      <ProtectedRoute>
                        <DealerForm />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tracker"
                    element={
                      <ProtectedRoute>
                        <Tracker />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute>
                        <History />
                      </ProtectedRoute>
                    }
                  />
                  */}

                  <Route
                    path="/travel"
                    element={
                      <ProtectedRoute>
                        <Travel />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute>
                        <History />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/attendance"
                    element={
                      <ProtectedRoute>
                        <Attendance />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/attendance" />} />
                </Routes>
              </div>
              {/* Footer */}
              <footer className=" fixed bottom-0 left-0 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white text-center py-3 shadow-inner z-50">
                <p className="text-sm font-medium">
                  Powered by{" "}
                  <a
                    href="https://www.botivate.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-yellow-300 transition"
                  >
                    Botivate
                  </a>
                </p>
              </footer>
            </div>
          </div>
        </div>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;