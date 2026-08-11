// frontend/src/App.jsx

import React, { useState, useEffect } from "react";
import "./App.css";
import { getCurrentUser, logoutUser } from "./api/authApi";
import AuthPage from "./features/auth/AuthPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import ConfigurationPage from "./features/config/ConfigurationPage";
import VideoUploadPage from "./features/videos/VideoUploadPage";
import EventDetailsPage from "./features/dashboard/EventDetailsPage";
import LogHistoryPage from "./features/logs/LogHistoryPage";

function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem("currentPage") || "dashboard";
  });
  const [authLoading, setAuthLoading] = useState(true);

  // Isolated Run Filter state: { videoId: int|null, mode: 'events'|'summary'|'alerts', filename: string }
  const [currentRunFilter, setCurrentRunFilter] = useState(null);

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

  const handleNavigateToRun = (videoId, mode, filename) => {
    setCurrentRunFilter({ videoId, mode, filename });
    setCurrentPage("event-details");
  };

  const handleResetRunFilter = () => {
    setCurrentRunFilter(null);
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
      {/* Central Topbar Header */}
      <div className="topbar">
        <div>
          <h1 className="shell-title">Speed Person Tracker Home Security</h1>
          <p className="shell-subtitle">Welcome, {loggedInUser.name} | Security Command Center</p>
        </div>

        <button className="primary-button" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>

      {/* Global Navigation Hub */}
      <div className="page-switch">
        <button
          className={currentPage === "dashboard" ? "active" : ""}
          onClick={() => setCurrentPage("dashboard")}
          type="button"
        >
          🏠 Dashboard Hub
        </button>

        <button
          className={currentPage === "config" ? "active" : ""}
          onClick={() => setCurrentPage("config")}
          type="button"
        >
          ⚙️ Configuration
        </button>

        <button
          className={currentPage === "videos" ? "active" : ""}
          onClick={() => setCurrentPage("videos")}
          type="button"
        >
          📹 Video Upload
        </button>

        <button
          className={currentPage === "logs" ? "active" : ""}
          onClick={() => setCurrentPage("logs")}
          type="button"
        >
          📜 Event Logs / History
        </button>

        {currentRunFilter && (
          <button
            className={currentPage === "event-details" ? "active" : ""}
            onClick={() => setCurrentPage("event-details")}
            type="button"
          >
            🔍 Event Details ({currentRunFilter.filename || "Processed Run"})
          </button>
        )}
      </div>

      {/* Main View Router */}
      {currentPage === "dashboard" ? (
        <DashboardPage
          currentRunFilter={currentRunFilter}
          onResetRunFilter={handleResetRunFilter}
          onNavigateToRun={handleNavigateToRun}
          onNavigateToPage={setCurrentPage}
        />
      ) : currentPage === "config" ? (
        <ConfigurationPage />
      ) : currentPage === "videos" ? (
        <VideoUploadPage onNavigateToRun={handleNavigateToRun} />
      ) : currentPage === "logs" ? (
        <LogHistoryPage
          onNavigateToRun={handleNavigateToRun}
          onNavigateToUpload={() => setCurrentPage("videos")}
        />
      ) : (
        <EventDetailsPage
          runFilter={currentRunFilter}
          onBackToVideos={() => setCurrentPage("videos")}
        />
      )}
    </div>
  );
}

export default App;