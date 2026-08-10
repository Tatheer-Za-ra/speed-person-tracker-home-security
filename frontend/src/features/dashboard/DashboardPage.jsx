// frontend/src/features/dashboard/DashboardPage.jsx

import React, { useState, useEffect } from "react";
import { fetchEventSummary, fetchEvents, fetchAlerts } from "../../api/eventsApi";
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
          <button className="modal-close-btn" onClick={onClose}>
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
                <span className="meta-label">Track ID</span>
                <span className="meta-val">#{event.track_id ?? "N/A"}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Video Timestamp</span>
                <span className="meta-val">{event.timestamp_seconds}s</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Alert Status</span>
                <span className="meta-val" style={{ color: event.is_alert ? "#ef4444" : "#10b981" }}>
                  {event.is_alert ? "HIGH PRIORITY ALERT" : "NORMAL"}
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

function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async (filterKey = activeFilter) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Executive Summary
      const { data: summaryData } = await fetchEventSummary();
      if (summaryData && summaryData.status === "success") {
        setSummary(summaryData.summary);
      }

      // 2. Fetch Filtered Events Feed
      let filterParams = { limit: 100 };
      if (filterKey === "ALERTS") {
        filterParams.is_alert = true;
      } else if (filterKey === "UNKNOWN_PERSON") {
        filterParams.event_type = "unknown_person";
      } else if (filterKey === "OVERSPEED_VEHICLE") {
        filterParams.event_type = "overspeed_vehicle";
      } else if (filterKey === "CAR") {
        filterParams.label = "car";
      } else if (filterKey === "TRUCK") {
        filterParams.label = "truck";
      } else if (filterKey === "PERSON") {
        filterParams.label = "person";
      }

      const { data: eventsData } = await fetchEvents(filterParams);
      if (eventsData && eventsData.status === "success") {
        setEvents(eventsData.events || []);
      }
    } catch (err) {
      setError("Failed to load dashboard telemetry data from backend.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(activeFilter);
  }, [activeFilter]);

  const handleFilterClick = (key) => {
    setActiveFilter(key);
  };

  return (
    <div className="dashboard-container">
      {/* Executive Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">Total Processed Events</div>
          <div className="metric-value">{summary?.total_events ?? 0}</div>
          <div className="metric-subtext">Recorded across {summary?.total_videos ?? 0} surveillance videos</div>
        </div>

        <div className="metric-card alert-card">
          <div className="metric-title">Security Alerts</div>
          <div className="metric-value" style={{ color: "#ef4444" }}>
            {summary?.total_alerts ?? 0}
          </div>
          <div className="metric-subtext">Unknown intruders & overspeed violations</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Vehicles Tracked</div>
          <div className="metric-value" style={{ color: "#38bdf8" }}>
            {(summary?.breakdown_by_label?.car ?? 0) + (summary?.breakdown_by_label?.truck ?? 0) + (summary?.breakdown_by_label?.motorcycle ?? 0)}
          </div>
          <div className="metric-subtext">
            Cars: {summary?.breakdown_by_label?.car ?? 0} | Trucks: {summary?.breakdown_by_label?.truck ?? 0}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Persons Detected</div>
          <div className="metric-value" style={{ color: "#10b981" }}>
            {summary?.breakdown_by_label?.person ?? 0}
          </div>
          <div className="metric-subtext">Processed via RetinaFace & Facenet512</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <button
          className={`filter-chip ${activeFilter === "ALL" ? "active" : ""}`}
          onClick={() => handleFilterClick("ALL")}
        >
          All Events ({summary?.total_events ?? 0})
        </button>
        <button
          className={`filter-chip alert-chip ${activeFilter === "ALERTS" ? "active" : ""}`}
          onClick={() => handleFilterClick("ALERTS")}
        >
          🚨 Security Alerts ({summary?.total_alerts ?? 0})
        </button>
        <button
          className={`filter-chip ${activeFilter === "UNKNOWN_PERSON" ? "active" : ""}`}
          onClick={() => handleFilterClick("UNKNOWN_PERSON")}
        >
          👤 Unknown Intruders
        </button>
        <button
          className={`filter-chip ${activeFilter === "OVERSPEED_VEHICLE" ? "active" : ""}`}
          onClick={() => handleFilterClick("OVERSPEED_VEHICLE")}
        >
          🏎️ Overspeed Vehicles
        </button>
        <button
          className={`filter-chip ${activeFilter === "CAR" ? "active" : ""}`}
          onClick={() => handleFilterClick("CAR")}
        >
          🚗 Cars ({summary?.breakdown_by_label?.car ?? 0})
        </button>
        <button
          className={`filter-chip ${activeFilter === "TRUCK" ? "active" : ""}`}
          onClick={() => handleFilterClick("TRUCK")}
        >
          🚚 Trucks ({summary?.breakdown_by_label?.truck ?? 0})
        </button>
      </div>

      {/* Events Feed Section */}
      <div className="events-section">
        <div className="section-header">
          <div className="section-title">
            Security Event Feed
            <span className="event-count-badge">{events.length} records</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
            Loading live security telemetry feeds...
          </div>
        ) : error ? (
          <div style={{ padding: "30px", background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: "12px" }}>
            {error}
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            No security events found matching the selected filter criteria.
          </div>
        ) : (
          <div className="events-feed-grid">
            {events.map((ev) => {
              const meta = ev.metadata || {};
              const snapshotUrl = ev.snapshot_url ? `${API_HOST}${ev.snapshot_url}` : null;
              const isOverspeed = meta.speed_status === "OVERSPEED";

              return (
                <div
                  key={ev.id}
                  className={`event-card ${ev.is_alert ? "is-alert" : ""}`}
                  onClick={() => setSelectedEvent(ev)}
                >
                  <div className="snapshot-thumb-container">
                    {snapshotUrl ? (
                      <img src={snapshotUrl} alt={`Event ${ev.id}`} className="snapshot-thumb-img" />
                    ) : (
                      <div className="snapshot-placeholder">No Snapshot</div>
                    )}

                    <div className="badge-overlay-top">
                      {ev.is_alert ? (
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
                        {ev.label?.toUpperCase() || "OBJECT"} #{ev.track_id ?? ev.id}
                      </span>
                      <span className="event-timestamp">@ {ev.timestamp_seconds}s</span>
                    </div>

                    <div className="event-meta-row">
                      <span>Type: {ev.event_type}</span>
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