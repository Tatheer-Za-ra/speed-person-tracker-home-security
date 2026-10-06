// frontend/src/features/dashboard/SnapshotModal.jsx

import React, { useEffect } from "react";
import { 
  X, 
  Clock, 
  Video, 
  Gauge, 
  Zap, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  UserX, 
  Car, 
  User, 
  Activity,
  Sliders
} from "lucide-react";
import { normalizeCategory } from "./FilterBar";
import { formatTimestamp, formatFootageClockTime, formatMMSS } from "./BatchEventTimeline";

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
          <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={18} style={{ color: "#0066cc" }} />
            <span>Event Details ({normalizeCategory(event.label, meta.face_match_status)})</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Close">
            <X size={20} />
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
            <div className="meta-group-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Video size={16} style={{ color: "#0066cc" }} />
              <span>Event Information</span>
            </div>
            <div className="meta-table">
              <div className="meta-item" style={{ background: "#f0f9ff", borderRadius: "8px", padding: "7px 10px", border: "1px solid #bae6fd", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <span className="meta-label" style={{ color: "#0369a1", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                  <Clock size={13} />
                  <span>{event.recording_start_time ? "Footage Clock Time" : "Video Playback Moment"}</span>
                </span>
                <span className="meta-val" style={{ color: "#0284c7", fontWeight: "700", fontSize: "0.775rem", display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                  {event.recording_start_time 
                    ? clockTimeStr 
                    : `Video Timer: ${formatMMSS(event.timestamp_seconds)} (${formatTimestamp(event.timestamp_seconds)})`}
                </span>
              </div>
              {event.recording_start_time && (
                <div className="meta-item">
                  <span className="meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <Video size={14} />
                    <span>Video Position</span>
                  </span>
                  <span className="meta-val">+{formatTimestamp(event.timestamp_seconds)}</span>
                </div>
              )}
              <div className="meta-item">
                <span className="meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  {event.label === "person" ? <User size={14} /> : <Car size={14} />}
                  <span>Detected Subject</span>
                </span>
                <span className="meta-val" style={{ fontWeight: "600" }}>
                  {event.label === "person"
                    ? (meta.face_match_status === "known" ? "Verified Resident" : "Visitor / Pedestrian")
                    : (event.label ? event.label.charAt(0).toUpperCase() + event.label.slice(1) : "Vehicle")}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  {event.is_alert || (event.label === "person" && meta.face_match_status !== "known") ? (
                    <ShieldAlert size={14} style={{ color: "#ef4444" }} />
                  ) : (
                    <ShieldCheck size={14} style={{ color: "#10b981" }} />
                  )}
                  <span>Security Status</span>
                </span>
                <span
                  className="meta-val"
                  style={{
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    color:
                      event.is_alert || (event.label === "person" && meta.face_match_status !== "known")
                        ? "#ef4444"
                        : "#10b981",
                  }}
                >
                  {event.is_alert || (event.label === "person" && meta.face_match_status !== "known") ? (
                    <>
                      <AlertTriangle size={14} />
                      <span>SECURITY ALERT</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>NORMAL ACTIVITY</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {meta.estimated_speed_kmh !== undefined && (
              <>
                <div className="meta-group-title" style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Gauge size={16} style={{ color: "#0066cc" }} />
                  <span>Vehicle Speed Telemetry</span>
                </div>
                <div className="meta-table">
                  <div className="meta-item">
                    <span className="meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <Gauge size={14} />
                      <span>Detected Speed</span>
                    </span>
                    <span className="meta-val" style={{ color: meta.speed_status === "OVERSPEED" ? "#ef4444" : "#0284c7", fontWeight: "700" }}>
                      {meta.estimated_speed_kmh} km/h
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <Zap size={14} />
                      <span>Peak Speed</span>
                    </span>
                    <span className="meta-val">{meta.max_speed_kmh ?? meta.estimated_speed_kmh} km/h</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <Sliders size={14} />
                      <span>Speed Limit</span>
                    </span>
                    <span className="meta-val">{meta.speed_limit_kmh ?? 30} km/h</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      {meta.speed_status === "OVERSPEED" ? <AlertTriangle size={14} style={{ color: "#ef4444" }} /> : <CheckCircle2 size={14} style={{ color: "#10b981" }} />}
                      <span>Speed Status</span>
                    </span>
                    <span
                      className="meta-val"
                      style={{
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        color: meta.speed_status === "OVERSPEED" ? "#ef4444" : "#10b981",
                      }}
                    >
                      {meta.speed_status === "OVERSPEED" ? (
                        <>
                          <AlertTriangle size={14} />
                          <span>Speeding ({meta.estimated_speed_kmh > (meta.speed_limit_kmh ?? 30) ? `+${(meta.estimated_speed_kmh - (meta.speed_limit_kmh ?? 30)).toFixed(0)} km/h` : "Above Limit"})</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Within Speed Limit</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </>
            )}

            {meta.face_match_status && (
              <>
                <div className="meta-group-title" style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <UserCheck size={16} style={{ color: "#059669" }} />
                  <span>Facial Recognition Identity</span>
                </div>
                <div className="meta-table">
                  <div className="meta-item">
                    <span className="meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      {meta.face_match_status === "known" ? <UserCheck size={14} /> : <UserX size={14} />}
                      <span>Identity Match</span>
                    </span>
                    <span
                      className="meta-val"
                      style={{
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        color: meta.face_match_status === "known" ? "#10b981" : "#ef4444",
                      }}
                    >
                      {meta.face_match_status === "known" ? (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Verified Resident</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={14} />
                          <span>Unrecognized Visitor</span>
                        </>
                      )}
                    </span>
                  </div>
                  {(meta.known_person_name || meta.known_person_id) && (
                    <div className="meta-item">
                      <span className="meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <User size={14} />
                        <span>Resident Profile</span>
                      </span>
                      <span className="meta-val" style={{ fontWeight: "700" }}>
                        {meta.known_person_name || `#${meta.known_person_id}`}
                      </span>
                    </div>
                  )}
                  {meta.face_similarity !== null && (
                    <div className="meta-item">
                      <span className="meta-label" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <ShieldCheck size={14} />
                        <span>Facial Match Confidence</span>
                      </span>
                      <span className="meta-val" style={{ fontWeight: "700" }}>{(meta.face_similarity * 100).toFixed(1)}%</span>
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
