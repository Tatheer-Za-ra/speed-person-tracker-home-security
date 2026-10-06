// frontend/src/App.jsx

import React, { useState, useEffect, useCallback } from "react";
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

// Helper: Parse URL parameters into route state
function parseUrlState() {
  const params = new URLSearchParams(window.location.search);
  const pageParam = params.get("page");
  const tabParam = params.get("tab");
  const videoIdParam = params.get("video_id");
  const modeParam = params.get("mode");
  const filenameParam = params.get("filename");
  const sourcePageParam = params.get("source");

  let page = pageParam || "dashboard";
  let tab = tabParam || "persons";
  let runFilter = null;

  if (page === "analytics") {
    page = "event-details";
    runFilter = { videoId: null, mode: "summary", filename: null, sourcePage: sourcePageParam || "home" };
  } else if (page === "event-details") {
    runFilter = {
      videoId: videoIdParam ? Number(videoIdParam) : null,
      mode: modeParam || "events",
      filename: filenameParam || null,
      sourcePage: sourcePageParam || null,
    };
  }

  return { page, tab, runFilter };
}

// Helper: Build URL string from route state
function buildUrl(page, tab, runFilter) {
  if (!page || page === "dashboard") {
    return window.location.pathname;
  }
  const params = new URLSearchParams();
  if (page === "event-details" && !runFilter?.videoId) {
    params.set("page", "analytics");
    if (runFilter?.sourcePage) params.set("source", runFilter.sourcePage);
  } else {
    params.set("page", page);
    if (page === "config" && tab) {
      params.set("tab", tab);
    }
    if (page === "event-details" && runFilter) {
      if (runFilter.videoId) params.set("video_id", String(runFilter.videoId));
      if (runFilter.mode) params.set("mode", runFilter.mode);
      if (runFilter.filename) params.set("filename", runFilter.filename);
      if (runFilter.sourcePage) params.set("source", runFilter.sourcePage);
    }
  }
  const q = params.toString();
  return q ? `${window.location.pathname}?${q}` : window.location.pathname;
}

function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(() => {
    const urlState = parseUrlState();
    return urlState.page || localStorage.getItem("currentPage") || "dashboard";
  });
  const [configTab, setConfigTab] = useState(() => {
    const urlState = parseUrlState();
    return urlState.tab || localStorage.getItem("configTab") || "persons";
  });
  const [currentRunFilter, setCurrentRunFilter] = useState(() => {
    const urlState = parseUrlState();
    return urlState.runFilter;
  });
  const [authLoading, setAuthLoading] = useState(true);

  // Unified navigation function that synchronizes with browser history
  const navigateTo = useCallback((targetPage, options = {}) => {
    const resolvedTab = options.tab !== undefined ? options.tab : (targetPage === "config" ? configTab : null);
    const resolvedFilter = options.runFilter !== undefined ? options.runFilter : (targetPage === "event-details" ? currentRunFilter : null);
    const replace = Boolean(options.replace);

    const targetUrl = buildUrl(targetPage, resolvedTab, resolvedFilter);
    const stateData = {
      page: targetPage,
      tab: resolvedTab,
      runFilter: resolvedFilter,
    };

    const currentFullSearch = window.location.search;
    const isSameLocation = targetUrl === `${window.location.pathname}${currentFullSearch}`;

    if (!isSameLocation) {
      if (replace) {
        window.history.replaceState(stateData, "", targetUrl);
      } else {
        window.history.pushState(stateData, "", targetUrl);
      }
    }

    setCurrentPage(targetPage);
    if (resolvedTab) {
      setConfigTab(resolvedTab);
      localStorage.setItem("configTab", resolvedTab);
    }
    setCurrentRunFilter(resolvedFilter);
    localStorage.setItem("currentPage", targetPage);
  }, [configTab, currentRunFilter]);

  // Synchronize initial URL with browser history on mount
  useEffect(() => {
    const initial = parseUrlState();
    const stateData = {
      page: initial.page,
      tab: initial.tab,
      runFilter: initial.runFilter,
    };
    window.history.replaceState(stateData, "", window.location.href);
  }, []);

  // Browser Navigation: Listen to native browser Back and Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state || parseUrlState();
      const resolvedPage = state.page || "dashboard";
      const resolvedTab = state.tab || "persons";
      const resolvedFilter = state.runFilter || null;

      setCurrentPage(resolvedPage);
      setConfigTab(resolvedTab);
      setCurrentRunFilter(resolvedFilter);
      localStorage.setItem("currentPage", resolvedPage);
      localStorage.setItem("configTab", resolvedTab);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
    navigateTo("dashboard", { runFilter: null, replace: true });
  };

  const handleNavigateToConfig = (tab) => {
    const targetTab = tab || configTab || "persons";
    navigateTo("config", { tab: targetTab });
  };

  const handleNavigateToRun = (videoId, mode, filename) => {
    navigateTo("event-details", {
      runFilter: { videoId, mode, filename },
    });
  };

  const handleResetRunFilter = () => {
    navigateTo("dashboard", { runFilter: null });
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
          navigateTo("dashboard", { runFilter: null, replace: true });
        }}
      />
    );
  }

  return (
    <div className="app-root-layout">
      {/* Sleek Horizontal Header Navigation Bar */}
      <Header
        currentPage={currentPage}
        setCurrentPage={(page) => navigateTo(page)}
        onNavigateToConfig={handleNavigateToConfig}
        onResetRunFilter={handleResetRunFilter}
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
            onNavigateToPage={(page) => navigateTo(page)}
            onNavigateToConfig={handleNavigateToConfig}
          />
        ) : currentPage === "config" ? (
          <ConfigurationPage
            initialTab={configTab}
            onTabChange={(tab) => navigateTo("config", { tab })}
          />
        ) : currentPage === "videos" ? (
          <VideoUploadPage onNavigateToRun={handleNavigateToRun} />
        ) : currentPage === "logs" ? (
          <LogHistoryPage
            onNavigateToRun={handleNavigateToRun}
            onNavigateToUpload={() => navigateTo("videos")}
            onNavigateToAnalytics={() => {
              navigateTo("event-details", {
                runFilter: { videoId: null, mode: "summary", filename: null, sourcePage: "logs" },
              });
            }}
          />
        ) : (
          <EventDetailsPage
            runFilter={currentRunFilter}
            onBackToVideos={() => navigateTo("videos")}
            onBackToLogs={() => navigateTo("logs")}
          />
        )}
      </main>

      {/* Anchored Clean White Footer */}
      <Footer />
    </div>
  );
}

export default App;