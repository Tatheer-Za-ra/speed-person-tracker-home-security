// frontend/src/components/Header.jsx

import React from "react";
import "./Header.css";

function Header({ currentPage, setCurrentPage, currentRunFilter, userName, onLogout }) {
  return (
    <header className="haventrack-header">
      <div className="header-container">
        {/* Brand Logo */}
        <div className="header-brand" onClick={() => setCurrentPage("dashboard")} style={{ cursor: "pointer" }}>
          <span className="brand-name">Haven<span className="brand-accent">Track</span></span>
        </div>

        {/* Primary Horizontal Navigation Links */}
        <nav className="header-nav">
          <button
            type="button"
            className={`nav-link ${currentPage === "dashboard" ? "active" : ""}`}
            onClick={() => setCurrentPage("dashboard")}
          >
            Dashboard
          </button>

          <button
            type="button"
            className={`nav-link ${currentPage === "config" ? "active" : ""}`}
            onClick={() => setCurrentPage("config")}
          >
            Configuration
          </button>

          <button
            type="button"
            className={`nav-link ${currentPage === "videos" ? "active" : ""}`}
            onClick={() => setCurrentPage("videos")}
          >
            Video Upload
          </button>

          <button
            type="button"
            className={`nav-link ${currentPage === "logs" ? "active" : ""}`}
            onClick={() => setCurrentPage("logs")}
          >
            Event Logs / History
          </button>

          {currentRunFilter && (
            <button
              type="button"
              className={`nav-link ${currentPage === "event-details" ? "active" : ""}`}
              onClick={() => setCurrentPage("event-details")}
            >
              Event Details ({currentRunFilter.filename || "Run"})
            </button>
          )}
        </nav>

        {/* Right-Side Utilities */}
        <div className="header-utilities">
          <div className="user-greeting">
            <span className="user-icon">👤</span>
            <span className="user-name">{userName || "User"}</span>
          </div>

          <button type="button" className="logout-btn" onClick={onLogout} title="Logout">
            <span className="logout-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
