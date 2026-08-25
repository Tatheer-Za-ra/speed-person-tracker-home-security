import React from "react";
import { X, Compass, Sliders, CheckCircle2, Eye, AlertTriangle } from "lucide-react";
import "./CalibrationDiagnosticModal.css";

const API_BASE = "http://localhost:5000";

export default function CalibrationDiagnosticModal({ video, onClose }) {
  if (!video) return null;

  const calib = video.site_calibration || {};
  const isMapDeleted = video.has_standalone_site_calibration === false;
  const diagnosticImageUrl = (!isMapDeleted && video.calibration_diagnostic_url)
    ? `${API_BASE}${video.calibration_diagnostic_url}`
    : null;

  return (
    <div className="calib-modal-overlay" onClick={onClose}>
      <div className="calib-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="calib-modal-header">
          <div className="calib-modal-title">
            <Compass size={22} className="calib-icon" />
            <div>
              <h3>Site Speed Calibration Map</h3>
              <p className="calib-subtitle">
                {video.original_filename} • {isMapDeleted ? "CALIBRATION MAP DELETED (DEFAULT PROFILE ACTIVE)" : (video.is_active_profile_fallback ? "ACTIVE PROFILE APPLIED" : (calib.preset ? calib.preset.toUpperCase() : "CUSTOM SITE"))}
              </p>
            </div>
          </div>
          <button className="calib-close-btn" onClick={onClose} title="Close Modal">
            <X size={20} />
          </button>
        </div>

        <div className="calib-modal-body">
          {isMapDeleted && (
            <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "0.875rem", fontWeight: "600" }}>
              <AlertTriangle size={20} style={{ color: "#e11d48", flexShrink: 0 }} />
              <span>The standalone site calibration map for this video was permanently deleted. Speed telemetry defaults to your active account profile.</span>
            </div>
          )}

          <div className="calib-image-container">
            {diagnosticImageUrl ? (
              <img
                src={diagnosticImageUrl}
                alt="Site Calibration Diagnostic Overlay"
                className="calib-diagnostic-img"
              />
            ) : (
              <div className="calib-placeholder" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", textAlign: "center" }}>
                {isMapDeleted ? <AlertTriangle size={44} style={{ color: "#f43f5e" }} /> : <Eye size={44} />}
                <p style={{ marginTop: "12px", fontWeight: "600", color: "#334155" }}>
                  {isMapDeleted ? "Site Calibration Map Permanently Deleted" : "Diagnostic image preview unavailable"}
                </p>
                {isMapDeleted && (
                  <span style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
                    Telemetry for this video uses active account camera calibration.
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="calib-metrics-card">
            <h4>
              <Sliders size={16} /> Site Calibration Parameters
            </h4>
            <div className="calib-metrics-grid">
              <div className="metric-item">
                <span className="metric-label">Scene Preset</span>
                <span className="metric-value badge-preset">
                  {calib.preset ? calib.preset.toUpperCase() : "AUTO"}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Camera Height</span>
                <span className="metric-value">{calib.camera_height_m ?? "3.5"} meters</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Tilt Angle</span>
                <span className="metric-value">{calib.camera_tilt_deg ?? "30"}° degrees</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Vertical FOV</span>
                <span className="metric-value">{calib.fov_deg ?? "55"}° degrees</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Horizon Level (Y)</span>
                <span className="metric-value">{calib.vanishing_point_y ? `${Math.round(calib.vanishing_point_y)} px` : "N/A"}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Precision Status</span>
                <span className="metric-value status-trained" style={{ color: isMapDeleted ? "#e11d48" : "#10b981" }}>
                  <CheckCircle2 size={13} /> {isMapDeleted ? "MAP DELETED (DEFAULT PROFILE)" : (video.is_active_profile_fallback ? "ACTIVE ACCOUNT PROFILE APPLIED" : "SITE PERSPECTIVE TRAINED")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
