// frontend/src/features/config/CameraCalibrationPanel.jsx

import React, { useState } from "react";
import { updateCameraCalibration } from "../../api/configApi";
import "./CameraCalibrationPanel.css";

function CameraCalibrationPanel() {
  const [recalculating, setRecalculating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedPreset, setSelectedPreset] = useState("auto");

  const handleTriggerRecalculation = async (presetMode = selectedPreset) => {
    setRecalculating(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const { response, data } = await updateCameraCalibration({ mode: "ai_self_calibrated", preset: presetMode });
      if (response.ok && data.status === "success") {
        setSuccessMessage(`AI Calibration updated to "${presetMode.toUpperCase()}"! ${data.message || "Recalculated event telemetry."}`);
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

  const handleSelectPreset = (presetKey) => {
    setSelectedPreset(presetKey);
    handleTriggerRecalculation(presetKey);
  };

  return (
    <div className="camera-calibration-card">
      <div className="calibration-header">
        <div className="header-status-badge">
          <span className="status-dot green"></span>
          <span>AUTOMATED AI SCENE PROFILING ENGINE</span>
        </div>
        <h2>🤖 AI Camera Scene Profiler & Calibration</h2>
        <p className="calibration-desc">
          Vehicle velocity calculation is <strong>100% automated</strong> with dynamic camera scene profiling. The AI engine automatically distinguishes between long-range <strong>highway telephoto bridges</strong> (e.g. 111–122 km/h) and steep <strong>urban overpasses</strong> (e.g. 50–60 km/h) by inspecting vehicle box geometry and road perspective vectors.
        </p>
      </div>

      {errorMessage && <div className="calibration-alert error">{errorMessage}</div>}
      {successMessage && <div className="calibration-alert success">{successMessage}</div>}

      {/* Camera Scene Preset Selection Grid */}
      <div className="iso-dimensions-section">
        <label className="section-label">🎯 Camera Mounting Scene Presets</label>
        <div className="dimensions-grid">
          <div
            className={`dim-card clickable ${selectedPreset === "auto" ? "active" : ""}`}
            onClick={() => handleSelectPreset("auto")}
          >
            <div className="dim-icon">🤖</div>
            <div className="dim-name">Auto-Detect (Recommended)</div>
            <div className="dim-specs">
              <span>Profiling: <strong>Automatic AI Fit</strong></span>
              <span>Range: <strong>0 – 180 km/h</strong></span>
            </div>
            <span className="dim-badge">100% Zero-Setup</span>
          </div>

          <div
            className={`dim-card clickable ${selectedPreset === "highway_telephoto" ? "active" : ""}`}
            onClick={() => handleSelectPreset("highway_telephoto")}
          >
            <div className="dim-icon">🛣️</div>
            <div className="dim-name">Highway Telephoto</div>
            <div className="dim-specs">
              <span>Mount: <strong>High Bridge Gantry</strong></span>
              <span>Speeds: <strong>90 – 140 km/h</strong></span>
            </div>
            <span className="dim-badge">Long Distance Highway</span>
          </div>

          <div
            className={`dim-card clickable ${selectedPreset === "urban_overpass" ? "active" : ""}`}
            onClick={() => handleSelectPreset("urban_overpass")}
          >
            <div className="dim-icon">🌉</div>
            <div className="dim-name">Urban Overpass / City Road</div>
            <div className="dim-specs">
              <span>Mount: <strong>Steep Overpass</strong></span>
              <span>Speeds: <strong>40 – 80 km/h</strong></span>
            </div>
            <span className="dim-badge">City Highway View</span>
          </div>
        </div>
      </div>

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
