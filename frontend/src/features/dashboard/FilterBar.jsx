// frontend/src/features/dashboard/FilterBar.jsx

import React from "react";

/**
 * Normalizes raw vehicle labels into one of 4 strict categories: Car, Bike, Truck, Other
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
            All Activity ({totalEventsCount})
          </button>

          <button
            type="button"
            className={`command-chip alert-chip ${activeQuickMode === "ALERTS" ? "active" : ""}`}
            onClick={() => {
              setActiveQuickMode("ALERTS");
            }}
          >
            🚨 Security Alerts ({alertEventsCount})
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
            Known Person
          </button>

          <button
            type="button"
            className={`command-chip alert-chip ${personFilter === "UNKNOWN" ? "active" : ""}`}
            onClick={() => {
              setPersonFilter("UNKNOWN");
              setActiveQuickMode("CUSTOM");
            }}
          >
            Unknown Person
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
            🚗 Car
          </button>

          <button
            type="button"
            className={`command-chip ${vehicleFilter === "Bike" ? "active" : ""}`}
            onClick={() => {
              setVehicleFilter("Bike");
              setActiveQuickMode("CUSTOM");
            }}
          >
            🏍️ Bike
          </button>

          <button
            type="button"
            className={`command-chip ${vehicleFilter === "Truck" ? "active" : ""}`}
            onClick={() => {
              setVehicleFilter("Truck");
              setActiveQuickMode("CUSTOM");
            }}
          >
            🚚 Truck
          </button>

          <button
            type="button"
            className={`command-chip ${vehicleFilter === "Other" ? "active" : ""}`}
            onClick={() => {
              setVehicleFilter("Other");
              setActiveQuickMode("CUSTOM");
            }}
          >
            🛸 Other
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterBar;
