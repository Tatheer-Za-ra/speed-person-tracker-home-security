// frontend/src/features/dashboard/EventDetailsPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { fetchEvents } from "../../api/eventsApi";
import FilterBar, { normalizeCategory } from "./FilterBar";
import BatchEventTimeline from "./BatchEventTimeline";
import SnapshotModal from "./SnapshotModal";
import "./DashboardPage.css";

function EventDetailsPage({ runFilter, onBackToVideos }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [activeQuickMode, setActiveQuickMode] = useState("ALL");
  const [personFilter, setPersonFilter] = useState("ALL");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const videoId = runFilter?.videoId || null;
  const filename = runFilter?.filename || null;

  useEffect(() => {
    if (!videoId) return;

    const loadRunEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await fetchEvents({ video_id: videoId, limit: 300 });
        if (data && data.status === "success") {
          setEvents(data.events || []);
        } else {
          setError("Could not load event data for this video run.");
        }
      } catch (err) {
        console.error(err);
        setError("Could not connect to backend server.");
      } finally {
        setLoading(false);
      }
    };

    loadRunEvents();
  }, [videoId]);

  // Clean Filtering Engine
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const meta = ev.metadata || {};
      const normCat = normalizeCategory(ev.label, meta.face_match_status);

      // 1. Quick Mode Filter
      if (activeQuickMode === "ALERTS") {
        const isUnknownPerson = ev.label === "person" && meta.face_match_status !== "known";
        if (!ev.is_alert && !isUnknownPerson) return false;
      }

      // 2. Person Identity Filter
      if (personFilter === "KNOWN" && normCat !== "Known Person") return false;
      if (personFilter === "UNKNOWN" && normCat !== "Unknown Person") return false;

      // 3. Vehicle Category Filter
      if (vehicleFilter !== "ALL") {
        if (ev.label === "person") return false;
        if (normCat !== vehicleFilter) return false;
      }

      return true;
    });
  }, [events, activeQuickMode, personFilter, vehicleFilter]);

  const alertEventsCount = useMemo(() => {
    return events.filter((ev) => {
      const meta = ev.metadata || {};
      const isUnknownPerson = ev.label === "person" && meta.face_match_status !== "known";
      return ev.is_alert || isUnknownPerson;
    }).length;
  }, [events]);

  const handleTriggerReportGeneration = () => {
    alert(`📄 Report Generation triggered for Video Run #${videoId}!\nPDF/CSV Export Engine will compile telemetric summary report.`);
  };

  if (!videoId) {
    return (
      <div className="dashboard-container" style={{ padding: "40px", textAlign: "center" }}>
        <h2>No Active Video Processing Session</h2>
        <p style={{ color: "#94a3b8", margin: "12px 0 24px" }}>
          The Event Details page strictly displays telemetry for a completed video processing run. Please upload a video first.
        </p>
        <button type="button" className="primary-button" onClick={onBackToVideos}>
          📹 Go to Video Upload Page
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Dynamic Run Header & Report Trigger Banner */}
      <div className="isolation-banner">
        <div className="isolation-info">
          <span className="isolation-tag">Last Run Data Isolation</span>
          <span className="isolation-text">
            Strictly displaying telemetry for {filename ? `"${filename}"` : `Video ${videoId}`}
          </span>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {/* Prominent Report Generation Button */}
          <button
            type="button"
            className="primary-button"
            style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)", boxShadow: "0 0 14px rgba(52, 211, 153, 0.4)" }}
            onClick={handleTriggerReportGeneration}
          >
            📄 Generate Security Audit Report
          </button>

          <button type="button" className="reset-run-btn" onClick={onBackToVideos}>
            ← Back to Videos
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">{filename ? filename : "Run Total Events"}</div>
          <div className="metric-value">{events.length}</div>
          <div className="metric-subtext">Isolated strictly to {filename ? `"${filename}"` : `Video ${videoId}`}</div>
        </div>

        <div className="metric-card alert-card">
          <div className="metric-title">Security Alerts</div>
          <div className="metric-value alert-val">{alertEventsCount}</div>
          <div className="metric-subtext">Intruders & velocity violations</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Vehicles Tracked</div>
          <div className="metric-value vehicle-val">
            {events.filter((e) => e.label !== "person").length}
          </div>
          <div className="metric-subtext">Normalized: Car, Bike, Truck, Other</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Persons Detected</div>
          <div className="metric-value person-val">
            {events.filter((e) => e.label === "person").length}
          </div>
          <div className="metric-subtext">RetinaFace & Facenet512</div>
        </div>
      </div>

      {/* Filtering Engine */}
      <FilterBar
        personFilter={personFilter}
        setPersonFilter={setPersonFilter}
        vehicleFilter={vehicleFilter}
        setVehicleFilter={setVehicleFilter}
        activeQuickMode={activeQuickMode}
        setActiveQuickMode={setActiveQuickMode}
        totalEventsCount={events.length}
        alertEventsCount={alertEventsCount}
      />

      {/* Batch Segregation Event Feed */}
      <div className="events-section">
        <div className="section-header">
          <div className="section-title">
            Run Event Feed & Timeline
            <span className="event-count-badge">{filteredEvents.length} matching events</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
            Loading isolated run telemetry...
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

      {/* Snapshot Lightbox Inspection Modal */}
      {selectedEvent && (
        <SnapshotModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

export default EventDetailsPage;
