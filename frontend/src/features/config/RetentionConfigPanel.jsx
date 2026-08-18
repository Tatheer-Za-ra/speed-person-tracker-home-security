// frontend/src/features/config/RetentionConfigPanel.jsx

import React, { useState, useEffect } from "react";
import { HardDrive, Zap, Save, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
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
  const [activeRetentionDays, setActiveRetentionDays] = useState(30);
  const [selectedPolicyDays, setSelectedPolicyDays] = useState(30);
  const [lastCleanupAt, setLastCleanupAt] = useState(null);
  const [totalVideos, setTotalVideos] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  // Toast / Alert notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [cleanupReportModal, setCleanupReportModal] = useState(null);

  const loadRetentionInfo = async () => {
    setLoading(true);
    try {
      const { response, data } = await fetchRetentionConfig();
      if (response.ok && data.status === "success" && data.retention) {
        const days = data.retention.retention_days ?? 30;
        setActiveRetentionDays(days);
        setSelectedPolicyDays(days);
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

  const handleSavePolicy = async () => {
    setSaving(true);
    setToastMessage(null);
    try {
      const { response, data } = await updateRetentionConfig(selectedPolicyDays);
      if (response.ok && data.status === "success") {
        setActiveRetentionDays(selectedPolicyDays);
        setToastMessage({
          type: "success",
          text: `Retention policy settings saved successfully! Window set to ${
            selectedPolicyDays === 0 ? "Disabled (Keep Forever)" : `${selectedPolicyDays} Days`
          }.`,
        });
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setToastMessage({ type: "error", text: data.message || "Failed to save retention policy." });
      }
    } catch (err) {
      console.error(err);
      setToastMessage({ type: "error", text: "Could not connect to backend server." });
    } finally {
      setSaving(false);
    }
  };

  const handleRunCleanupNow = async () => {
    setCleaning(true);
    setToastMessage(null);
    try {
      const { response, data } = await triggerManualCleanup();
      if (response.ok && data.status === "success") {
        const report = data.result || {};
        setCleanupReportModal({
          purgedVideos: report.purged_videos ?? 0,
          retentionDays: report.retention_days ?? activeRetentionDays,
          lastCleanupAt: report.last_cleanup_at || new Date().toISOString(),
          cutoffDate: report.cutoff_date || null,
          message: data.message,
        });

        setToastMessage({
          type: "success",
          text: data.message,
        });

        await loadRetentionInfo();
      } else {
        setToastMessage({ type: "error", text: data.message || "Storage cleanup failed." });
      }
    } catch (err) {
      console.error(err);
      setToastMessage({ type: "error", text: "Could not execute storage cleanup." });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="retention-panel">
      <div className="retention-card">
        <div className="retention-header">
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <HardDrive size={22} style={{ color: "#7c3aed" }} />
              <span>Data Retention & Storage Cleanup Policy</span>
            </h2>
            <p className="retention-desc">
              Configure automatic data retention thresholds. Videos, events, and snapshot image files older than your retention limit will be safely purged to free up disk storage.
            </p>
          </div>

          <button
            type="button"
            className="cleanup-now-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            onClick={handleRunCleanupNow}
            disabled={cleaning}
          >
            <Zap size={16} />
            <span>{cleaning ? "Purging Storage..." : "Run Storage Cleanup Now"}</span>
          </button>
        </div>

        {/* Toast Alert Notification */}
        {toastMessage && (
          <div className={`retention-alert ${toastMessage.type}`}>
            <span className="alert-icon">
              {toastMessage.type === "success" ? <CheckCircle2 size={18} style={{ color: "#10b981" }} /> : <AlertTriangle size={18} style={{ color: "#ef4444" }} />}
            </span>
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="retention-stats-grid">
          <div className="retention-stat-box">
            <span className="stat-label">Active Retention Window</span>
            <span className="stat-val highlight">
              {activeRetentionDays === 0 ? "Disabled (Keep Forever)" : `${activeRetentionDays} Days`}
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
              const isSelected = selectedPolicyDays === opt.value;
              return (
                <div
                  key={opt.value}
                  className={`retention-opt-card ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedPolicyDays(opt.value)}
                >
                  <div className="opt-radio">
                    <input
                      type="radio"
                      name="retentionPolicy"
                      checked={isSelected}
                      onChange={() => setSelectedPolicyDays(opt.value)}
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

          {/* Explicit Save Button */}
          <div className="retention-save-bar">
            <button
              type="button"
              className="primary-button save-retention-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              onClick={handleSavePolicy}
              disabled={saving}
            >
              <Save size={16} />
              <span>{saving ? "Saving Settings..." : "Save Retention Settings"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Storage Cleanup Execution Report Modal / Alert */}
      {cleanupReportModal && (
        <div className="retention-modal-overlay" onClick={() => setCleanupReportModal(null)}>
          <div className="retention-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="retention-modal-header">
              <span className="modal-header-icon">
                <Trash2 size={20} style={{ color: "#7c3aed" }} />
              </span>
              <div>
                <h3>Storage Cleanup Execution Report</h3>
                <p className="modal-header-sub">Manual storage retention purge results</p>
              </div>
            </div>

            <div className="retention-report-details">
              <div className="report-row">
                <span className="report-key">Execution Status:</span>
                <span className="report-val success">SUCCESS</span>
              </div>
              <div className="report-row">
                <span className="report-key">Purged Video Runs:</span>
                <span className="report-val highlight">{cleanupReportModal.purgedVideos} Runs</span>
              </div>
              <div className="report-row">
                <span className="report-key">Retention Window:</span>
                <span className="report-val">{cleanupReportModal.retentionDays} Days</span>
              </div>
              {cleanupReportModal.cutoffDate && (
                <div className="report-row">
                  <span className="report-key">Cutoff Upload Date:</span>
                  <span className="report-val">{new Date(cleanupReportModal.cutoffDate).toLocaleString()}</span>
                </div>
              )}
              <div className="report-row">
                <span className="report-key">Completed Timestamp:</span>
                <span className="report-val">{new Date(cleanupReportModal.lastCleanupAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="retention-modal-footer">
              <button
                type="button"
                className="primary-button modal-close-btn"
                onClick={() => setCleanupReportModal(null)}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RetentionConfigPanel;
