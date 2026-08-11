// frontend/src/features/config/RetentionConfigPanel.jsx

import React, { useState, useEffect } from "react";
import {
  fetchRetentionConfig,
  updateRetentionConfig,
  triggerManualCleanup,
} from "../../api/configApi";
import "./RetentionConfigPanel.css";

const RETENTION_OPTIONS = [
  { label: "7 Days", value: 7, desc: "Auto-purge video runs older than 1 week" },
  { label: "14 Days", value: 14, desc: "Auto-purge video runs older than 2 weeks" },
  { label: "30 Days (Default)", value: 30, desc: "Auto-purge video runs older than 1 month" },
  { label: "90 Days", value: 90, desc: "Auto-purge video runs older than 3 months" },
  { label: "Disabled (Keep Forever)", value: 0, desc: "Never automatically purge storage entries" },
];

function RetentionConfigPanel() {
  const [retentionDays, setRetentionDays] = useState(30);
  const [lastCleanupAt, setLastCleanupAt] = useState(null);
  const [totalVideos, setTotalVideos] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState(null);

  const loadRetentionInfo = async () => {
    setLoading(true);
    try {
      const { response, data } = await fetchRetentionConfig();
      if (response.ok && data.status === "success" && data.retention) {
        setRetentionDays(data.retention.retention_days ?? 30);
        setLastCleanupAt(data.retention.last_cleanup_at || null);
        setTotalVideos(data.retention.total_videos ?? 0);
      }
    } catch (err) {
      console.error("Could not fetch retention settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRetentionInfo();
  }, []);

  const handleSavePolicy = async (daysVal) => {
    setSaving(true);
    setMessage(null);
    try {
      const { response, data } = await updateRetentionConfig(daysVal);
      if (response.ok && data.status === "success") {
        setRetentionDays(daysVal);
        setMessage({ type: "success", text: `Retention policy updated to ${daysVal === 0 ? "Disabled (Keep Forever)" : `${daysVal} days`}.` });
      } else {
        setMessage({ type: "error", text: data.message || "Failed to save retention policy." });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Could not connect to backend server." });
    } finally {
      setSaving(false);
    }
  };

  const handleRunCleanupNow = async () => {
    setCleaning(true);
    setMessage(null);
    try {
      const { response, data } = await triggerManualCleanup();
      if (response.ok && data.status === "success") {
        setMessage({ type: "success", text: data.message });
        await loadRetentionInfo();
      } else {
        setMessage({ type: "error", text: data.message || "Storage cleanup failed." });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Could not execute storage cleanup." });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="retention-panel">
      <div className="retention-card">
        <div className="retention-header">
          <div>
            <h2>🧹 Data Retention & Storage Cleanup Policy</h2>
            <p className="retention-desc">
              Configure automatic data retention thresholds. Videos, events, and snapshot image files older than your retention limit will be safely purged to free up disk storage.
            </p>
          </div>

          <button
            type="button"
            className="cleanup-now-btn"
            onClick={handleRunCleanupNow}
            disabled={cleaning}
          >
            {cleaning ? "Purging Storage..." : "⚡ Run Storage Cleanup Now"}
          </button>
        </div>

        {message && (
          <div className={`retention-alert ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Stats Grid */}
        <div className="retention-stats-grid">
          <div className="retention-stat-box">
            <span className="stat-label">Active Retention Window</span>
            <span className="stat-val highlight">
              {retentionDays === 0 ? "Disabled (Keep Forever)" : `${retentionDays} Days`}
            </span>
          </div>

          <div className="retention-stat-box">
            <span className="stat-label">Stored Video Sessions</span>
            <span className="stat-val">{totalVideos} Runs</span>
          </div>

          <div className="retention-stat-box">
            <span className="stat-label">Last Storage Purge</span>
            <span className="stat-val date">
              {lastCleanupAt ? new Date(lastCleanupAt).toLocaleString() : "Never"}
            </span>
          </div>
        </div>

        {/* Policy Selection Options */}
        <div className="retention-options-section">
          <h3>Select Auto-Purge Retention Threshold:</h3>

          <div className="retention-options-grid">
            {RETENTION_OPTIONS.map((opt) => {
              const isSelected = retentionDays === opt.value;
              return (
                <div
                  key={opt.value}
                  className={`retention-opt-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSavePolicy(opt.value)}
                >
                  <div className="opt-radio">
                    <input
                      type="radio"
                      name="retentionPolicy"
                      checked={isSelected}
                      onChange={() => {}}
                    />
                  </div>
                  <div className="opt-info">
                    <div className="opt-title">{opt.label}</div>
                    <div className="opt-desc">{opt.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RetentionConfigPanel;
