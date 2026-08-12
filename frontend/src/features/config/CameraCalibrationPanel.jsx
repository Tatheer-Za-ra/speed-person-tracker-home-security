// frontend/src/features/config/CameraCalibrationPanel.jsx

import React, { useState } from "react";
import { updateCameraCalibration } from "../../api/configApi";
import "./CameraCalibrationPanel.css";

function CameraCalibrationPanel() {
  const [recalculating, setRecalculating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleTriggerRecalculation = async () => {
    setRecalculating(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const { response, data } = await updateCameraCalibration({ mode: "ai_self_calibrated" });
      if (response.ok && data.status === "success") {
        setSuccessMessage(`AI Self-Calibration active! ${data.message || "Recalculated event telemetry."}`);
      } else {
        setErrorMessage(data.message || "Failed to trigger speed recalculation.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not connect to backend server.");
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="camera-calibration-card">
      <div className="calibration-header">
        <div className="header-status-badge">
          <span className="status-dot green"></span>
          <span>AUTOMATED AI SELF-CALIBRATION (METHOD 1)</span>
        </div>
        <h2>🤖 AI Object Self-Calibration Engine</h2>
        <p className="calibration-desc">
          Vehicle velocity calculation is <strong>100% automated</strong>. The AI pipeline dynamically calculates local pixel-to-meter scale factors ($S(x, y)$) in real-time by analyzing detected vehicle bounding box footprints against standard ISO physical vehicle dimensions. No manual camera height guessing or angle tuning required.
        </p>
      </div>

      {errorMessage && <div className="calibration-alert error">{errorMessage}</div>}
      {successMessage && <div className="calibration-alert success">{successMessage}</div>}

      {/* ISO Reference Dimensions Display Grid */}
      <div className="iso-dimensions-section">
        <label className="section-label">📐 Active ISO Vehicle Physical Reference Standards</label>
        <div className="dimensions-grid">
          <div className="dim-card">
            <div className="dim-icon">🚗</div>
            <div className="dim-name">Passenger Cars</div>
            <div className="dim-specs">
              <span>Width: <strong>1.85 m</strong></span>
              <span>Length: <strong>4.50 m</strong></span>
            </div>
            <span className="dim-badge">Standard SUV / Sedan</span>
          </div>

          <div className="dim-card">
            <div className="dim-icon">🚚</div>
            <div className="dim-name">Trucks & Commercial</div>
            <div className="dim-specs">
              <span>Width: <strong>2.45 m</strong></span>
              <span>Length: <strong>6.50 m</strong></span>
            </div>
            <span className="dim-badge">Heavy Duty Vehicles</span>
          </div>

          <div className="dim-card">
            <div className="dim-icon">🏍️</div>
            <div className="dim-name">Motorcycles & Bikes</div>
            <div className="dim-specs">
              <span>Width: <strong>0.85 m</strong></span>
              <span>Length: <strong>2.10 m</strong></span>
            </div>
            <span className="dim-badge">Two-Wheel Transport</span>
          </div>
        </div>
      </div>

      <div className="calibration-footer-ai">
        <div className="ai-footer-info">
          <span>✨ <strong>Zero Setup Required:</strong> Every uploaded CCTV video will automatically use AI self-calibrated velocity telemetry.</span>
        </div>

        <button
          type="button"
          className="primary-button recalculate-events-btn"
          onClick={handleTriggerRecalculation}
          disabled={recalculating}
        >
          {recalculating ? "Recalculating DB Events..." : "⚡ Recalculate Recorded Event Speeds"}
        </button>
      </div>
    </div>
  );
}

export default CameraCalibrationPanel;
