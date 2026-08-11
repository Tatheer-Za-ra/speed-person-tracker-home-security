// frontend/src/features/dashboard/SpeedConfigModal.jsx

import React, { useState, useEffect } from "react";
import { fetchSpeedThresholds, updateSpeedThresholds } from "../../api/configApi";
import "./SpeedConfigModal.css";

const DEFAULT_THRESHOLDS = {
  car: 30.0,
  motorcycle: 40.0,
  truck: 25.0,
};

function SpeedConfigModal({ isOpen, onClose, onThresholdsUpdated }) {
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch current speed limits when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadThresholds = async () => {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      try {
        const { response, data } = await fetchSpeedThresholds();
        if (response.ok && data.status === "success" && data.thresholds) {
          setThresholds({
            car: data.thresholds.car ?? 30.0,
            motorcycle: data.thresholds.motorcycle ?? 40.0,
            truck: data.thresholds.truck ?? 25.0,
          });
        }
      } catch (err) {
        console.error("Could not fetch speed thresholds:", err);
      } finally {
        setLoading(false);
      }
    };

    loadThresholds();
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (category, value) => {
    setThresholds((prev) => ({
      ...prev,
      [category]: value,
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleResetDefaults = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    setErrorMessage("");
    setSuccessMessage("Reset to default thresholds. Click Save to apply.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Validate inputs
    const carVal = parseFloat(thresholds.car);
    const motoVal = parseFloat(thresholds.motorcycle);
    const truckVal = parseFloat(thresholds.truck);

    const invalidCategories = [];
    if (isNaN(carVal) || carVal <= 0) invalidCategories.push("Car");
    if (isNaN(motoVal) || motoVal <= 0) invalidCategories.push("Bike/Motorcycle");
    if (isNaN(truckVal) || truckVal <= 0) invalidCategories.push("Truck");

    if (invalidCategories.length > 1) {
      setErrorMessage("Speed limit values must be positive.");
      return;
    } else if (invalidCategories.length === 1) {
      setErrorMessage(`${invalidCategories[0]} speed limit value must be positive.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        car: carVal,
        motorcycle: motoVal,
        truck: truckVal,
      };

      const { response, data } = await updateSpeedThresholds(payload);

      if (!response.ok || data.status !== "success") {
        setErrorMessage(data.message || "Failed to update speed thresholds.");
        return;
      }

      setSuccessMessage("Speed limit thresholds updated successfully!");
      if (onThresholdsUpdated) {
        onThresholdsUpdated(data.thresholds);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not connect to backend server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="speed-modal-overlay" onClick={onClose}>
      <div className="speed-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="speed-modal-header">
          <div className="speed-modal-title">
            <span className="speed-modal-icon">⚡</span>
            <span>Speed Limit Threshold Settings</span>
          </div>

          <button type="button" className="speed-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <p className="speed-modal-description">
          Set maximum velocity speed limits (km/h) for vehicle categories. Any detected target exceeding its limit will automatically trigger a <strong>SECURITY ALERT</strong>.
        </p>

        {errorMessage && <div className="speed-modal-alert error">{errorMessage}</div>}
        {successMessage && <div className="speed-modal-alert success">{successMessage}</div>}

        {loading ? (
          <div className="speed-modal-loading">Loading speed settings...</div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="speed-modal-form">
            <div className="threshold-input-row">
              <label htmlFor="speed-car" className="threshold-label">
                <span className="cat-icon">🚗</span>
                <span>Car Speed Limit (km/h)</span>
              </label>
              <input
                id="speed-car"
                type="number"
                step="0.5"
                value={thresholds.car}
                onChange={(e) => handleChange("car", e.target.value)}
              />
            </div>

            <div className="threshold-input-row">
              <label htmlFor="speed-moto" className="threshold-label">
                <span className="cat-icon">🏍️</span>
                <span>Bike / Motorcycle Speed Limit (km/h)</span>
              </label>
              <input
                id="speed-moto"
                type="number"
                step="0.5"
                value={thresholds.motorcycle}
                onChange={(e) => handleChange("motorcycle", e.target.value)}
              />
            </div>

            <div className="threshold-input-row">
              <label htmlFor="speed-truck" className="threshold-label">
                <span className="cat-icon">🚚</span>
                <span>Truck Speed Limit (km/h)</span>
              </label>
              <input
                id="speed-truck"
                type="number"
                step="0.5"
                value={thresholds.truck}
                onChange={(e) => handleChange("truck", e.target.value)}
              />
            </div>

            <div className="speed-modal-actions">
              <button
                type="button"
                className="reset-defaults-btn"
                onClick={handleResetDefaults}
                disabled={saving}
              >
                ↺ Reset Defaults (30/40/25)
              </button>

              <div className="main-actions-group">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-thresholds-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Thresholds"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default SpeedConfigModal;
