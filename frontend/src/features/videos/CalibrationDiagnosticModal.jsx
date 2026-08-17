import React from "react";
import { X, Compass, Sliders, CheckCircle2, Eye } from "lucide-react";
import "./CalibrationDiagnosticModal.css";

const API_BASE = "http://localhost:5000";

export default function CalibrationDiagnosticModal({ video, onClose }) {
  if (!video) return null;

  const calib = video.site_calibration || {};
  const diagnosticImageUrl = video.calibration_diagnostic_url
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
                {video.original_filename} • {calib.preset ? calib.preset.toUpperCase() : "CUSTOM SITE"}
              </p>
            </div>
          </div>
          <button className="calib-close-btn" onClick={onClose} title="Close Modal">
            <X size={20} />
          </button>
        </div>

        <div className="calib-modal-body">
          <div className="calib-image-container">
            {diagnosticImageUrl ? (
              <img
                src={diagnosticImageUrl}
                alt="Site Calibration Diagnostic Overlay"
                className="calib-diagnostic-img"
              />
            ) : (
              <div className="calib-placeholder">
                <Eye size={48} />
                <p>Diagnostic image preview unavailable</p>
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
                <span className="metric-value status-trained">
                  <CheckCircle2 size={13} /> SITE PERSPECTIVE TRAINED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
