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
import Header from "./components/Header";
import Footer from "./components/Footer";

function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem("currentPage") || "dashboard";
  });
  const [configTab, setConfigTab] = useState("persons");
  const [authLoading, setAuthLoading] = useState(true);

  // Isolated Run Filter state: { videoId: int|null, mode: 'events'|'summary'|'alerts', filename: string }
  const [currentRunFilter, setCurrentRunFilter] = useState(null);

  const handleNavigateToConfig = (tab = "persons") => {
    setConfigTab(tab);
    setCurrentPage("config");
  };

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
          <h1 className="auth-title">HavenTrack</h1>
          <p className="auth-subtitle">Loading security session...</p>
        </div>
      </div>
    );
  }

  if (!loggedInUser) {
    return (
      <AuthPage
        onLoginSuccess={(user) => {
          setLoggedInUser(user);
          setCurrentPage("dashboard");
        }}
      />
    );
  }

  return (
    <div className="app-root-layout">
      {/* Sleek Horizontal Header Navigation Bar */}
      <Header
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onNavigateToConfig={handleNavigateToConfig}
        currentRunFilter={currentRunFilter}
        userName={loggedInUser.name}
        onLogout={handleLogout}
      />

      {/* Main View Router Content */}
      <main className="app-main-content">
        {currentPage === "dashboard" ? (
          <DashboardPage
            currentRunFilter={currentRunFilter}
            onResetRunFilter={handleResetRunFilter}
            onNavigateToRun={handleNavigateToRun}
            onNavigateToPage={setCurrentPage}
            onNavigateToConfig={handleNavigateToConfig}
          />
        ) : currentPage === "config" ? (
          <ConfigurationPage initialTab={configTab} />
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
      </main>

      {/* Anchored Clean White Footer */}
      <Footer />
    </div>
  );
}

export default App;