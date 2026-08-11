// frontend/src/features/dashboard/FilterBar.jsx

import React from "react";

/**
 * Normalizes raw vehicle & person labels into strict categories.
 * Vehicle Categories: "Car", "Bike", "Truck", "Other" (maps any unrecognized vehicle label to "Other")
 * Person Categories: "Known Person", "Unknown Person"
 */
export function normalizeCategory(label, faceStatus = null) {
  if (!label) return "Other";
  const l = label.toLowerCase();
  if (l === "person") {
    return faceStatus === "known" ? "Known Person" : "Unknown Person";
  }
  if (["car", "sedan", "suv", "van", "automobile"].includes(l)) return "Car";
  if (["motorcycle", "motorbike", "bike", "bicycle", "scooter"].includes(l)) return "Bike";
  if (["truck", "pickup", "lorry", "hauler"].includes(l)) return "Truck";
  return "Other";
}

/* Contextual SVG Icons for Command Center Dashboard */
const IconShieldAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const IconUserCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <polyline points="17 11 19 13 23 9"/>
  </svg>
);

const IconUserX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="18" y1="8" x2="23" y2="13"/>
    <line x1="23" y1="8" x2="18" y2="13"/>
  </svg>
);

const IconCar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.2 1 12.1 1 13v3c0 .6.4 1 1 1h2"/>
    <circle cx="7" cy="17" r="2"/>
    <circle cx="17" cy="17" r="2"/>
  </svg>
);

const IconBike = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="17.5" r="3.5"/>
    <circle cx="18.5" cy="17.5" r="3.5"/>
    <path d="M15 6h2l2 4"/>
    <path d="M12 17.5V14l-3-3 4-3 2 3h3"/>
  </svg>
);

const IconTruck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

const IconHelpCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

function FilterBar({
  personFilter,
  setPersonFilter,
  vehicleFilter,
  setVehicleFilter,
  activeQuickMode,
  setActiveQuickMode,
  totalEventsCount,
  alertEventsCount,
}) {
  return (
    <div className="command-filter-container">
      {/* Quick Mode Filters */}
      <div className="filter-group">
        <span className="filter-group-label">Quick Views</span>
        <div className="filter-chips-row">
          <button
            type="button"
            className={`command-chip ${activeQuickMode === "ALL" ? "active" : ""}`}
            onClick={() => {
              setActiveQuickMode("ALL");
              setPersonFilter("ALL");
              setVehicleFilter("ALL");
            }}
          >
            <IconGrid />
            <span>All Activity ({totalEventsCount})</span>
          </button>

          <button
            type="button"
            className={`command-chip alert-chip ${activeQuickMode === "ALERTS" ? "active" : ""}`}
            onClick={() => {
              setActiveQuickMode("ALERTS");
            }}
          >
            <IconShieldAlert />
            <span>Security Alerts ({alertEventsCount})</span>
          </button>
        </div>
      </div>

      {/* Person Category Filters */}
      <div className="filter-group">
        <span className="filter-group-label">Person Identity</span>
        <div className="filter-chips-row">
          <button
            type="button"
            className={`command-chip ${personFilter === "ALL" && activeQuickMode !== "ALERTS" ? "active" : ""}`}
            onClick={() => {
              setPersonFilter("ALL");
              setActiveQuickMode("CUSTOM");
            }}
          >
            All Persons
          </button>

          <button
            type="button"
            className={`command-chip known-chip ${personFilter === "KNOWN" ? "active" : ""}`}
            onClick={() => {
              setPersonFilter("KNOWN");
              setActiveQuickMode("CUSTOM");
            }}
          >
            <IconUserCheck />
            <span>Known Person</span>
          </button>

          <button
            type="button"
            className={`command-chip alert-chip ${personFilter === "UNKNOWN" ? "active" : ""}`}
            onClick={() => {
              setPersonFilter("UNKNOWN");
              setActiveQuickMode("CUSTOM");
            }}
          >
            <IconUserX />
            <span>Unknown Person</span>
          </button>
        </div>
      </div>

      {/* Vehicle Category Filters (Strictly 4 Categories) */}
      <div className="filter-group">
        <span className="filter-group-label">Vehicle Category</span>
        <div className="filter-chips-row">
          <button
            type="button"
            className={`command-chip ${vehicleFilter === "ALL" && activeQuickMode !== "ALERTS" ? "active" : ""}`}
            onClick={() => {
              setVehicleFilter("ALL");
              setActiveQuickMode("CUSTOM");
            }}
          >
            All Vehicles
          </button>

          <button
            type="button"
            className={`command-chip ${vehicleFilter === "Car" ? "active" : ""}`}
            onClick={() => {
              setVehicleFilter("Car");
              setActiveQuickMode("CUSTOM");
            }}
          >
            <IconCar />
            <span>Car</span>
          </button>

          <button
            type="button"
            className={`command-chip ${vehicleFilter === "Bike" ? "active" : ""}`}
            onClick={() => {
              setVehicleFilter("Bike");
              setActiveQuickMode("CUSTOM");
            }}
          >
            <IconBike />
            <span>Bike</span>
          </button>

          <button
            type="button"
            className={`command-chip ${vehicleFilter === "Truck" ? "active" : ""}`}
            onClick={() => {
              setVehicleFilter("Truck");
              setActiveQuickMode("CUSTOM");
            }}
          >
            <IconTruck />
            <span>Truck</span>
          </button>

          <button
            type="button"
            className={`command-chip ${vehicleFilter === "Other" ? "active" : ""}`}
            onClick={() => {
              setVehicleFilter("Other");
              setActiveQuickMode("CUSTOM");
            }}
          >
            <IconHelpCircle />
            <span>Other</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterBar;
