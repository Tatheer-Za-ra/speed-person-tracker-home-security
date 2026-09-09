import React, { useState } from "react";
import { X, Compass, Sliders, CheckCircle2, Eye, Camera } from "lucide-react";
import "./CalibrationDiagnosticModal.css";

const API_BASE = "http://localhost:5000";

export default function CalibrationDiagnosticModal({ video, onClose }) {
  if (!video) return null;

  const calib = video.site_calibration || {};
  const [imageError, setImageError] = useState(false);
  const hasStandaloneMap = Boolean(video.has_standalone_site_calibration);
  const isProfileFallback = Boolean(video.is_active_profile_fallback);

  const diagnosticImageUrl = (!imageError && video.calibration_diagnostic_url)
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
                {video.original_filename} • {hasStandaloneMap ? (calib.preset ? calib.preset.toUpperCase() : "SITE PERSPECTIVE TRAINED") : "ACTIVE CAMERA PROFILE APPLIED"}
              </p>
            </div>
          </div>
          <button className="calib-close-btn" onClick={onClose} title="Close Modal">
            <X size={20} />
          </button>
        </div>

        <div className="calib-modal-body">
          {!hasStandaloneMap && (
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0369a1", padding: "10px 14px", borderRadius: "10px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "0.8125rem", fontWeight: "600" }}>
              <Camera size={18} style={{ color: "#0284c7", flexShrink: 0 }} />
              <span>Speed telemetry uses calibrated geometry from your active account camera profile.</span>
            </div>
          )}

          <div className="calib-image-container">
            {diagnosticImageUrl ? (
              <img
                src={diagnosticImageUrl}
                alt="Site Calibration Diagnostic Overlay"
                className="calib-diagnostic-img"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="calib-placeholder" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", textAlign: "center" }}>
                <Eye size={44} style={{ color: "#0284c7" }} />
                <p style={{ marginTop: "12px", fontWeight: "600", color: "#334155" }}>
                  {hasStandaloneMap ? "Site Calibration Map Active" : "Active Camera Profile Parameters"}
                </p>
                <span style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
                  Vehicle speed telemetry is calibrated using the perspective geometry below.
                </span>
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
                <span className="metric-value status-trained" style={{ color: "#10b981" }}>
                  <CheckCircle2 size={13} /> {hasStandaloneMap ? "SITE PERSPECTIVE TRAINED" : "ACTIVE CAMERA PROFILE APPLIED"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
