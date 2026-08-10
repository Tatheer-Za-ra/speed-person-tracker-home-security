
import { useState } from "react";
import "./app.css";
import { logoutUser } from "./api/authApi";
import AuthPage from "./features/auth/AuthPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import KnownPersonsPage from "./features/known-persons/KnownPersonsPage";
import VideoUploadPage from "./features/videos/VideoUploadPage";  
import { useEffect } from "react";
import { getCurrentUser} from "./api/authApi";

function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(() => {
  return localStorage.getItem("currentPage") || "dashboard";
});
const [authLoading, setAuthLoading] = useState(true);

useEffect(() => {
  localStorage.setItem("currentPage", currentPage);
}, [currentPage]);

useEffect(() => {
  const restoreSession = async () => {
    try {
      const { response, data } = await getCurrentUser();

      if (response.ok && data.user) {
        setLoggedInUser(data.user);
      }
    } catch (error) {
      console.error("Could not restore session:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  restoreSession();
}, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout failed:", error);
    }

    setLoggedInUser(null);
    setCurrentPage("dashboard");
  };

if (authLoading) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Speed Person Tracker Home Security</h1>
        <p className="auth-subtitle">Checking session...</p>
      </div>
    </div>
  );
}

  if (!loggedInUser) {
    return <AuthPage onLoginSuccess={setLoggedInUser} />;
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <h1 className="shell-title">Speed Person Tracker Home Security</h1>
          <p className="shell-subtitle">Welcome, {loggedInUser.name}</p>
        </div>

        <button className="primary-button" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>

      <div className="page-switch">
        <button
          className={currentPage === "dashboard" ? "active" : ""}
          onClick={() => setCurrentPage("dashboard")}
          type="button"
        >
          Dashboard
        </button>
        <button
          className={currentPage === "known-persons" ? "active" : ""}
          onClick={() => setCurrentPage("known-persons")}
          type="button"
        >
          Known Persons
        </button>
        <button
  className={currentPage === "videos" ? "active" : ""}
  onClick={() => setCurrentPage("videos")}
  type="button"
>
  Videos
</button>
      </div>

     {currentPage === "dashboard" ? (
  <DashboardPage />
) : currentPage === "known-persons" ? (
  <KnownPersonsPage />
) : (
  <VideoUploadPage />
)}
    </div>
  );
}

export default App;