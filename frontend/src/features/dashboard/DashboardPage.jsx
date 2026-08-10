// frontend/src/features/dashboard/DashboardPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { fetchEventSummary, fetchEvents } from "../../api/eventsApi";
import FilterBar, { normalizeCategory } from "./FilterBar";
import "./DashboardPage.css";

const API_HOST = "http://localhost:5000";

function SnapshotModal({ event, onClose }) {
  if (!event) return null;

  const meta = event.metadata || {};
  const snapshotFullUrl = event.snapshot_url
    ? `${API_HOST}${event.snapshot_url}`
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            Security Event Inspection #{event.id} ({event.label || "Object"})
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body-grid">
          <div className="modal-image-box">
            {snapshotFullUrl ? (
              <img src={snapshotFullUrl} alt={`Event ${event.id}`} />
            ) : (
              <div className="snapshot-placeholder">No Snapshot Image Available</div>
            )}
          </div>

          <div className="modal-metadata-box">
            <div className="meta-group-title">Event Information</div>
            <div className="meta-table">
              <div className="meta-item">
                <span className="meta-label">Event Type</span>
                <span className="meta-val">{event.event_type}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Target Class</span>
                <span className="meta-val">{event.label}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Normalized Category</span>
                <span className="meta-val">{normalizeCategory(event.label, meta.face_match_status)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Track ID</span>
                <span className="meta-val">#{event.track_id ?? "N/A"}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Video Timestamp</span>
                <span className="meta-val">{event.timestamp_seconds}s</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Alert Status</span>
                <span
                  className="meta-val"
                  style={{
                    color:
                      event.is_alert || (event.label === "person" && meta.face_match_status !== "known")
                        ? "#ef4444"
                        : "#10b981",
                  }}
                >
                  {event.is_alert || (event.label === "person" && meta.face_match_status !== "known")
                    ? "HIGH PRIORITY ALERT"
                    : "NORMAL"}
                </span>
              </div>
            </div>

            {meta.estimated_speed_kmh !== undefined && (
              <>
                <div className="meta-group-title" style={{ marginTop: "12px" }}>
                  Vehicle Speed Telemetry
                </div>
                <div className="meta-table">
                  <div className="meta-item">
                    <span className="meta-label">Estimated Speed</span>
                    <span className="meta-val" style={{ color: meta.speed_status === "OVERSPEED" ? "#ef4444" : "#38bdf8" }}>
                      {meta.estimated_speed_kmh} km/h
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Peak Max Speed</span>
                    <span className="meta-val">{meta.max_speed_kmh} km/h</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Speed Limit</span>
                    <span className="meta-val">{meta.speed_limit_kmh} km/h</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Velocity Status</span>
                    <span className="meta-val">{meta.speed_status}</span>
                  </div>
                </div>
              </>
            )}

            {meta.face_match_status && (
              <>
                <div className="meta-group-title" style={{ marginTop: "12px" }}>
                  Facial Recognition Identity
                </div>
                <div className="meta-table">
                  <div className="meta-item">
                    <span className="meta-label">Identity Match</span>
                    <span className="meta-val" style={{ color: meta.face_match_status === "known" ? "#10b981" : "#ef4444" }}>
                      {meta.face_match_status.toUpperCase()}
                    </span>
                  </div>
                  {meta.known_person_id && (
                    <div className="meta-item">
                      <span className="meta-label">Known Person ID</span>
                      <span className="meta-val">#{meta.known_person_id}</span>
                    </div>
                  )}
                  {meta.face_similarity !== null && (
                    <div className="meta-item">
                      <span className="meta-label">Cosine Similarity</span>
                      <span className="meta-val">{(meta.face_similarity * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ currentRunFilter, onResetRunFilter }) {
  const [summary, setSummary] = useState(null);
  const [rawEvents, setRawEvents] = useState([]);
  const [activeQuickMode, setActiveQuickMode] = useState("ALL");
  const [personFilter, setPersonFilter] = useState("ALL");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const videoId = currentRunFilter?.videoId || null;
  const initialMode = currentRunFilter?.mode || "all";

  useEffect(() => {
    if (initialMode === "alerts") {
      setActiveQuickMode("ALERTS");
    } else {
      setActiveQuickMode("ALL");
    }
  }, [initialMode, videoId]);

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
  }, [videoId]);

  // Clean Filtering Engine using useMemo
  const filteredEvents = useMemo(() => {
    return rawEvents.filter((ev) => {
      const meta = ev.metadata || {};

      // 1. Quick Mode Filter
      if (activeQuickMode === "ALERTS") {
        if (!ev.is_alert) return false;
      }

      // 2. Person Identity Filter
      if (personFilter === "KNOWN") {
        if (ev.label !== "person" || meta.face_match_status !== "known") return false;
      } else if (personFilter === "UNKNOWN") {
        if (ev.label !== "person" || meta.face_match_status === "known") return false;
      }

      // 3. Vehicle Category Filter (Strictly: Car, Bike, Truck, Other)
      if (vehicleFilter !== "ALL") {
        if (ev.label === "person") return false;
        const normalizedCat = normalizeVehicleCategory(ev.label);
        if (normalizedCat !== vehicleFilter) return false;
      }

      return true;
    });
  }, [rawEvents, activeQuickMode, personFilter, vehicleFilter]);

  const alertEventsCount = useMemo(() => {
    return rawEvents.filter((ev) => ev.is_alert).length;
  }, [rawEvents]);

  return (
    <div className="dashboard-container">
      {/* Current Run Isolation Banner */}
      {videoId && (
        <div className="isolation-banner">
          <div className="isolation-info">
            <span className="isolation-tag">Run Isolation Active</span>
            <span className="isolation-text">
              Displaying telemetry strictly for Video Run #{videoId} {currentRunFilter?.filename ? `(${currentRunFilter.filename})` : ""}
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
            {videoId ? `Run #${videoId} Total Events` : "Total Processed Events"}
          </div>
          <div className="metric-value">{videoId ? rawEvents.length : (summary?.total_events ?? 0)}</div>
          <div className="metric-subtext">
            {videoId ? `Strictly isolated to Run #${videoId}` : `Recorded across ${summary?.total_videos ?? 0} videos`}
          </div>
        </div>

        <div className="metric-card alert-card">
          <div className="metric-title">Security Alerts</div>
          <div className="metric-value" style={{ color: "#ef4444" }}>
            {alertEventsCount}
          </div>
          <div className="metric-subtext">Unknown intruders & overspeed flags</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Vehicles Tracked</div>
          <div className="metric-value" style={{ color: "#38bdf8" }}>
            {rawEvents.filter((e) => e.label !== "person").length}
          </div>
          <div className="metric-subtext">Normalized: Car, Bike, Truck, Other</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Persons Detected</div>
          <div className="metric-value" style={{ color: "#10b981" }}>
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

      {/* Events Feed Section */}
      <div className="events-section">
        <div className="section-header">
          <div className="section-title">
            Security Event Feed
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
        ) : filteredEvents.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            No security events match the current filter selection.
          </div>
        ) : (
          <div className="events-feed-grid">
            {filteredEvents.map((ev) => {
              const meta = ev.metadata || {};
              const snapshotUrl = ev.snapshot_url ? `${API_HOST}${ev.snapshot_url}` : null;
              const isOverspeed = meta.speed_status === "OVERSPEED";
              const normCategory = normalizeCategory(ev.label, meta.face_match_status);
              const isUnknownPerson = ev.label === "person" && meta.face_match_status !== "known";
              const isAlert = ev.is_alert || isUnknownPerson;

              return (
                <div
                  key={ev.id}
                  className={`event-card ${isAlert ? "is-alert" : ""}`}
                  onClick={() => setSelectedEvent(ev)}
                >
                  <div className="snapshot-thumb-container">
                    {snapshotUrl ? (
                      <img src={snapshotUrl} alt={`Event ${ev.id}`} className="snapshot-thumb-img" />
                    ) : (
                      <div className="snapshot-placeholder">No Snapshot</div>
                    )}

                    <div className="badge-overlay-top">
                      {isAlert ? (
                        <span className="status-badge alert">ALERT</span>
                      ) : meta.face_match_status === "known" ? (
                        <span className="status-badge known">KNOWN</span>
                      ) : (
                        <span className="status-badge normal">DETECTED</span>
                      )}
                    </div>

                    {meta.estimated_speed_kmh !== undefined && (
                      <div className={`speed-badge-top ${isOverspeed ? "overspeed" : ""}`}>
                        ⚡ {meta.estimated_speed_kmh} km/h
                      </div>
                    )}
                  </div>

                  <div className="event-details-body">
                    <div className="event-main-header">
                      <span className="event-type-name">
                        {normCategory.toUpperCase()} #{ev.track_id ?? ev.id}
                      </span>
                      <span className="event-timestamp">@ {ev.timestamp_seconds}s</span>
                    </div>

                    <div className="event-meta-row">
                      <span>Raw: {ev.label}</span>
                      <span>Conf: {ev.confidence ? `${(ev.confidence * 100).toFixed(0)}%` : "N/A"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Snapshot Lightbox Modal */}
      {selectedEvent && (
        <SnapshotModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

export default DashboardPage;