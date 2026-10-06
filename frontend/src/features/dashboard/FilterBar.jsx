import React from "react";
import { ShieldAlert, UserCheck, UserX, Car, Bike, Truck, LayoutGrid, HelpCircle } from "lucide-react";

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
            <LayoutGrid size={15} />
            <span>All Activity</span>
          </button>

          <button
            type="button"
            className={`command-chip alert-chip ${activeQuickMode === "ALERTS" ? "active" : ""}`}
            onClick={() => {
              setActiveQuickMode("ALERTS");
            }}
          >
            <ShieldAlert size={15} />
            <span>Security Alerts</span>
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
            <UserCheck size={15} />
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
            <UserX size={15} />
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
            <Car size={15} />
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
            <Bike size={15} />
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
            <Truck size={15} />
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
            <HelpCircle size={15} />
            <span>Other</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterBar;
