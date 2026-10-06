// frontend/src/components/Header.jsx

import React, { useState } from "react";
import { UserCheck, Gauge, HardDrive, ChevronDown, User, LogOut, ShieldCheck } from "lucide-react";
import "./Header.css";

function Header({ currentPage, setCurrentPage, onNavigateToConfig, onResetRunFilter, currentRunFilter, userName, onLogout }) {
  const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false);

  const handleSelectConfigOption = (tabName) => {
    if (onNavigateToConfig) {
      onNavigateToConfig(tabName);
    } else {
      setCurrentPage("config");
    }
    setIsConfigDropdownOpen(false);
  };

  const handleBrandClick = () => {
    if (onResetRunFilter) {
      onResetRunFilter();
    } else {
      setCurrentPage("dashboard");
    }
  };

  return (
    <header className="haventrack-header">
      <div className="header-container">
        {/* Brand Logo with Shield Emblem */}
        <div className="header-brand" onClick={handleBrandClick} style={{ cursor: "pointer" }}>
          <div className="brand-logo-emblem">
            <ShieldCheck size={20} className="brand-emblem-icon" />
          </div>
          <span className="brand-name">Haven<span className="brand-accent">Track</span></span>
        </div>

        {/* Primary Horizontal Navigation Links */}
        <nav className="header-nav">
          {/* Configuration Menu with Dropdown */}
          <div
            className="nav-dropdown-wrapper"
            onMouseEnter={() => setIsConfigDropdownOpen(true)}
            onMouseLeave={() => setIsConfigDropdownOpen(false)}
          >
            <button
              type="button"
              className={`nav-link ${currentPage === "config" ? "active" : ""}`}
              onClick={() => handleSelectConfigOption(null)}
            >
              <span>Configuration</span>
              <ChevronDown size={14} className={`dropdown-caret ${isConfigDropdownOpen ? "open" : ""}`} />
            </button>

            {isConfigDropdownOpen && (
              <div className="header-dropdown-menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => handleSelectConfigOption("persons")}
                >
                  <UserCheck size={16} className="dropdown-item-icon green" />
                  <span className="dropdown-item-text">Known Person Configuration</span>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => handleSelectConfigOption("speed")}
                >
                  <Gauge size={16} className="dropdown-item-icon cyan" />
                  <span className="dropdown-item-text">Speed Configuration</span>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => handleSelectConfigOption("retention")}
                >
                  <HardDrive size={16} className="dropdown-item-icon purple" />
                  <span className="dropdown-item-text">Data Retention & Storage</span>
                </button>
              </div>
            )}
          </div>

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
            Event Logs
          </button>

          {currentRunFilter && (
            <button
              type="button"
              className={`nav-link ${currentPage === "event-details" ? "active" : ""}`}
              onClick={() => setCurrentPage("event-details")}
            >
              {currentRunFilter.videoId ? "Event Details" : "Traffic Analytics"}
            </button>
          )}
        </nav>

        {/* Right-Side Utilities */}
        <div className="header-utilities">
          <div className="user-greeting">
            <User size={16} className="user-icon" />
            <span className="user-name">{userName || "User"}</span>
          </div>

          <button type="button" className="logout-btn" onClick={onLogout} title="Logout">
            <LogOut size={15} className="logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
