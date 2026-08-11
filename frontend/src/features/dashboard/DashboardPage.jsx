// frontend/src/features/dashboard/DashboardPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { fetchEventSummary, fetchEvents } from "../../api/eventsApi";
import { fetchSpeedThresholds } from "../../api/configApi";
import FilterBar, { normalizeCategory } from "./FilterBar";
import SpeedConfigModal from "./SpeedConfigModal";
import BatchEventTimeline from "./BatchEventTimeline";
import SnapshotModal from "./SnapshotModal";
import "./DashboardPage.css";

const API_HOST = "http://localhost:5000";

function DashboardPage({ currentRunFilter, onResetRunFilter, onNavigateToPage }) {
  const [summary, setSummary] = useState(null);
  const [rawEvents, setRawEvents] = useState([]);
  const [activeQuickMode, setActiveQuickMode] = useState("ALL");
  const [personFilter, setPersonFilter] = useState("ALL");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Speed Limit Threshold State & Modal Visibility
  const [speedThresholds, setSpeedThresholds] = useState({
    car: 30.0,
    motorcycle: 40.0,
    truck: 25.0,
  });
  const [isSpeedModalOpen, setIsSpeedModalOpen] = useState(false);

  const videoId = currentRunFilter?.videoId || null;
  const initialMode = currentRunFilter?.mode || "all";

  useEffect(() => {
    if (initialMode === "alerts") {
      setActiveQuickMode("ALERTS");
    } else {
      setActiveQuickMode("ALL");
    }
  }, [initialMode, videoId]);

  // Fetch Speed Limits Configuration
  const loadSpeedThresholds = async () => {
    try {
      const { response, data } = await fetchSpeedThresholds();
      if (response.ok && data.status === "success" && data.thresholds) {
        setSpeedThresholds(data.thresholds);
      }
    } catch (err) {
      console.error("Could not fetch speed thresholds:", err);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Executive Summary
      const { data: summaryData } = await fetchEventSummary();
      if (summaryData && summaryData.status === "success") {
        setSummary(summaryData.summary);
      }

      // 2. Fetch Events Feed (Isolate by videoId if locked to current run)
      const filterParams = { limit: 200 };
      if (videoId) {
        filterParams.video_id = videoId;
      }

      const { data: eventsData } = await fetchEvents(filterParams);
      if (eventsData && eventsData.status === "success") {
        setRawEvents(eventsData.events || []);
      }
    } catch (err) {
      setError("Failed to load telemetry data from backend server.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadSpeedThresholds();
  }, [videoId]);

  // Clean Filtering Engine using useMemo
  const filteredEvents = useMemo(() => {
    return rawEvents.filter((ev) => {
      const meta = ev.metadata || {};
      const normCat = normalizeCategory(ev.label, meta.face_match_status);

      // 1. Quick Mode Filter
      if (activeQuickMode === "ALERTS") {
        const isUnknownPerson = ev.label === "person" && meta.face_match_status !== "known";
        if (!ev.is_alert && !isUnknownPerson) return false;
      }

      // 2. Person Identity Filter
      if (personFilter === "KNOWN") {
        if (normCat !== "Known Person") return false;
      } else if (personFilter === "UNKNOWN") {
        if (normCat !== "Unknown Person") return false;
      }

      // 3. Vehicle Category Filter (Strictly: Car, Bike, Truck, Other)
      if (vehicleFilter !== "ALL") {
        if (ev.label === "person") return false;
        if (normCat !== vehicleFilter) return false;
      }

      return true;
    });
  }, [rawEvents, activeQuickMode, personFilter, vehicleFilter]);

  const alertEventsCount = useMemo(() => {
    return rawEvents.filter((ev) => {
      const meta = ev.metadata || {};
      const isUnknownPerson = ev.label === "person" && meta.face_match_status !== "known";
      return ev.is_alert || isUnknownPerson;
    }).length;
  }, [rawEvents]);

  return (
    <div className="dashboard-container">
      {/* Top Navigation Hub Bar */}
      <div className="dashboard-header-actions">
        <div className="speed-threshold-pills">
          <span className="threshold-pill">
            🚗 Car Limit: <strong>{speedThresholds.car ?? 30} km/h</strong>
          </span>
          <span className="threshold-pill">
            🏍️ Bike Limit: <strong>{speedThresholds.motorcycle ?? 40} km/h</strong>
          </span>
          <span className="threshold-pill">
            🚚 Truck Limit: <strong>{speedThresholds.truck ?? 25} km/h</strong>
          </span>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="speed-settings-btn"
            onClick={() => onNavigateToPage && onNavigateToPage("config")}
          >
            ⚙️ Configuration Hub
          </button>

          <button
            type="button"
            className="speed-settings-btn"
            onClick={() => setIsSpeedModalOpen(true)}
          >
            ⚡ Speed Settings
          </button>
        </div>
      </div>

      {/* Current Run Isolation Banner */}
      {videoId && (
        <div className="isolation-banner">
          <div className="isolation-info">
            <span className="isolation-tag">Run Isolation Active</span>
            <span className="isolation-text">
              Displaying telemetry strictly for {currentRunFilter?.filename ? `"${currentRunFilter.filename}"` : `Video ${videoId}`}
            </span>
          </div>

          <button type="button" className="reset-run-btn" onClick={onResetRunFilter}>
            ← Reset to All Runs
          </button>
        </div>
      )}

      {/* Executive Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">
            {videoId ? (currentRunFilter?.filename || "Isolated Video Events") : "Total Processed Events"}
          </div>
          <div className="metric-value">{videoId ? rawEvents.length : (summary?.total_events ?? 0)}</div>
          <div className="metric-subtext">
            {videoId ? `Strictly isolated to ${currentRunFilter?.filename ? `"${currentRunFilter.filename}"` : `Video ${videoId}`}` : `Recorded across ${summary?.total_videos ?? 0} videos`}
          </div>
        </div>

        <div className="metric-card alert-card">
          <div className="metric-title">Security Alerts</div>
          <div className="metric-value alert-val">
            {alertEventsCount}
          </div>
          <div className="metric-subtext">Unknown intruders & overspeed flags</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Vehicles Tracked</div>
          <div className="metric-value vehicle-val">
            {rawEvents.filter((e) => e.label !== "person").length}
          </div>
          <div className="metric-subtext">Normalized: Car, Bike, Truck, Other</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Persons Detected</div>
          <div className="metric-value person-val">
            {rawEvents.filter((e) => e.label === "person").length}
          </div>
          <div className="metric-subtext">RetinaFace & Facenet512 classification</div>
        </div>
      </div>

      {/* Clean Filtering Engine */}
      <FilterBar
        personFilter={personFilter}
        setPersonFilter={setPersonFilter}
        vehicleFilter={vehicleFilter}
        setVehicleFilter={setVehicleFilter}
        activeQuickMode={activeQuickMode}
        setActiveQuickMode={setActiveQuickMode}
        totalEventsCount={rawEvents.length}
        alertEventsCount={alertEventsCount}
      />

      {/* Events Feed Section with Batch Segregation */}
      <div className="events-section">
        <div className="section-header">
          <div className="section-title">
            Security Event Feed & Video Segregation
            <span className="event-count-badge">{filteredEvents.length} matching events</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
            Loading telemetry feeds...
          </div>
        ) : error ? (
          <div style={{ padding: "30px", background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: "12px" }}>
            {error}
          </div>
        ) : (
          <BatchEventTimeline
            events={filteredEvents}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
          />
        )}
      </div>

      {/* Speed Threshold Settings Modal */}
      <SpeedConfigModal
        isOpen={isSpeedModalOpen}
        onClose={() => setIsSpeedModalOpen(false)}
        onThresholdsUpdated={(updated) => setSpeedThresholds(updated)}
      />

      {/* Snapshot Lightbox Modal */}
      {selectedEvent && (
        <SnapshotModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

export default DashboardPage;