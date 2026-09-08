// frontend/src/features/dashboard/SnapshotModal.jsx

import React, { useEffect } from "react";
import { normalizeCategory } from "./FilterBar";
import { formatTimestamp, formatFootageClockTime } from "./BatchEventTimeline";

const API_HOST = "http://localhost:5000";

function SnapshotModal({ event, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && event) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [event, onClose]);

  if (!event) return null;

  const meta = event.metadata || {};
  const snapshotFullUrl = event.snapshot_url
    ? `${API_HOST}${event.snapshot_url}`
    : null;

  const clockTimeStr = formatFootageClockTime(
    event.calculated_timestamp,
    event.timestamp_seconds,
    event.recording_start_time
  );

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
              <div className="meta-item" style={{ background: "#f0f9ff", borderRadius: "8px", padding: "6px 8px", border: "1px solid #bae6fd" }}>
                <span className="meta-label" style={{ color: "#0369a1", fontWeight: "700" }}>
                  {event.calculated_timestamp || event.recording_start_time ? "Footage Clock Time" : "Relative Elapsed Time"}
                </span>
                <span className="meta-val" style={{ color: "#0284c7", fontWeight: "800", fontSize: "0.875rem" }}>
                  🕒 {clockTimeStr}
                </span>
              </div>
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
                <span className="meta-label">Video Elapsed Time</span>
                <span className="meta-val">+{formatTimestamp(event.timestamp_seconds)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Footage Baseline</span>
                <span className="meta-val">
                  {event.recording_start_time ? formatFootageClockTime(event.recording_start_time, 0) : "Unknown (Relative T+00s)"}
                </span>
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
                    ? "SECURITY ALERT"
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

export default SnapshotModal;
