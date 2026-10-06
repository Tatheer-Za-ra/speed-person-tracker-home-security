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
              <h3>Camera Perspective &amp; Speed Calibration</h3>
              <p className="calib-subtitle">
                {video.original_filename} • {hasStandaloneMap ? "Perspective Calibrated for This Camera" : "Default Camera Profile Active"}
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
              <span>Vehicle speed calculations use the perspective angles calibrated for this camera view.</span>
            </div>
          )}

          <div className="calib-image-container">
            {diagnosticImageUrl ? (
              <img
                src={diagnosticImageUrl}
                alt="Camera Perspective Calibration Overlay"
                className="calib-diagnostic-img"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="calib-placeholder" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", textAlign: "center" }}>
                <Eye size={44} style={{ color: "#0284c7" }} />
                <p style={{ marginTop: "12px", fontWeight: "600", color: "#334155" }}>
                  {hasStandaloneMap ? "Perspective Calibration Active" : "Camera Profile Settings"}
                </p>
                <span style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
                  Vehicle speed measurements are calibrated using the perspective angles below.
                </span>
              </div>
            )}
          </div>

          <div className="calib-metrics-card">
            <h4>
              <Sliders size={16} /> Camera Perspective &amp; Distance Settings
            </h4>
            <div className="calib-metrics-grid">
              <div className="metric-item">
                <span className="metric-label">Camera Preset</span>
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
                <span className="metric-label">Field of View</span>
                <span className="metric-value">{calib.fov_deg ?? "55"}° degrees</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Road Horizon Level</span>
                <span className="metric-value">{calib.vanishing_point_y ? `${Math.round(calib.vanishing_point_y)} px` : "Auto-detected"}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Calibration Status</span>
                <span className="metric-value status-trained" style={{ color: "#10b981" }}>
                  <CheckCircle2 size={13} /> {hasStandaloneMap ? "Calibrated for This Perspective" : "Active Camera Profile Applied"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
