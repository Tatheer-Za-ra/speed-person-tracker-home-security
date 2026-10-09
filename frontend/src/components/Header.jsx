// frontend/src/components/Header.jsx

import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Gauge,
  HardDrive,
  ChevronDown,
  User,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Video,
  FileText,
  BarChart3,
  Sliders,
} from "lucide-react";
import "./Header.css";

function Header({
  currentPage,
  setCurrentPage,
  onNavigateToConfig,
  onResetRunFilter,
  currentRunFilter,
  userName,
  onLogout,
}) {
  const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileConfigExpanded, setIsMobileConfigExpanded] = useState(true);

  // Close mobile menu on Escape key and prevent background scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleSelectConfigOption = (tabName) => {
    if (onNavigateToConfig) {
      onNavigateToConfig(tabName);
    } else {
      setCurrentPage("config");
    }
    setIsConfigDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleBrandClick = () => {
    if (onResetRunFilter) {
      onResetRunFilter();
    } else {
      setCurrentPage("dashboard");
    }
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = (page) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="haventrack-header">
      <div className="header-container">
        {/* Brand Logo with Shield Emblem */}
        <div className="header-brand" onClick={handleBrandClick} style={{ cursor: "pointer" }}>
          <div className="brand-logo-emblem">
            <ShieldCheck size={20} className="brand-emblem-icon" />
          </div>
          <span className="brand-name">
            Haven<span className="brand-accent">Track</span>
          </span>
        </div>

        {/* Primary Desktop/Tablet Horizontal Navigation Links */}
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

        {/* Desktop/Tablet Right-Side Utilities */}
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

        {/* Mobile Hamburger Toggle Button (Shown on mobile screens <= 720px) */}
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu Backdrop & Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-menu-drawer" onClick={(e) => e.stopPropagation()}>
            {/* User Profile Bar */}
            <div className="mobile-user-profile">
              <div className="mobile-user-avatar">
                <User size={18} />
              </div>
              <div className="mobile-user-info">
                <span className="mobile-user-name">{userName || "Security Administrator"}</span>
                <span className="mobile-user-role">Resident Profile Active</span>
              </div>
            </div>

            {/* Mobile Navigation List */}
            <nav className="mobile-nav-list">
              {/* Configuration Section */}
              <div className="mobile-nav-group">
                <button
                  type="button"
                  className={`mobile-nav-item parent ${currentPage === "config" ? "active" : ""}`}
                  onClick={() => setIsMobileConfigExpanded((prev) => !prev)}
                >
                  <span className="mobile-nav-item-left">
                    <Sliders size={18} className="mobile-nav-icon" />
                    <span>Configuration</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`mobile-chevron ${isMobileConfigExpanded ? "open" : ""}`}
                  />
                </button>

                {isMobileConfigExpanded && (
                  <div className="mobile-submenu">
                    <button
                      type="button"
                      className="mobile-submenu-item"
                      onClick={() => handleSelectConfigOption("persons")}
                    >
                      <UserCheck size={16} className="sub-icon green" />
                      <span>Known Persons</span>
                    </button>
                    <button
                      type="button"
                      className="mobile-submenu-item"
                      onClick={() => handleSelectConfigOption("speed")}
                    >
                      <Gauge size={16} className="sub-icon cyan" />
                      <span>Speed Limits</span>
                    </button>
                    <button
                      type="button"
                      className="mobile-submenu-item"
                      onClick={() => handleSelectConfigOption("retention")}
                    >
                      <HardDrive size={16} className="sub-icon purple" />
                      <span>Data Retention</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Video Upload */}
              <button
                type="button"
                className={`mobile-nav-item ${currentPage === "videos" ? "active" : ""}`}
                onClick={() => handleNavClick("videos")}
              >
                <Video size={18} className="mobile-nav-icon" />
                <span>Video Upload</span>
              </button>

              {/* Event Logs */}
              <button
                type="button"
                className={`mobile-nav-item ${currentPage === "logs" ? "active" : ""}`}
                onClick={() => handleNavClick("logs")}
              >
                <FileText size={18} className="mobile-nav-icon" />
                <span>Event Logs</span>
              </button>

              {/* Traffic Analytics or Event Details if active */}
              {currentRunFilter && (
                <button
                  type="button"
                  className={`mobile-nav-item ${currentPage === "event-details" ? "active" : ""}`}
                  onClick={() => handleNavClick("event-details")}
                >
                  <BarChart3 size={18} className="mobile-nav-icon" />
                  <span>{currentRunFilter.videoId ? "Event Details" : "Traffic Analytics"}</span>
                </button>
              )}
            </nav>

            {/* Mobile Footer with Logout */}
            <div className="mobile-menu-footer">
              <button
                type="button"
                className="mobile-logout-btn"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
