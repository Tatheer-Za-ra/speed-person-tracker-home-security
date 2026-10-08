// frontend/src/features/logs/LogHistoryPage.jsx

import React, { useState, useEffect } from "react";
import {
  FileText,
  Video,
  Eye,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  Clock,
  BarChart3,
  HardDrive,
  X,
} from "lucide-react";
import { fetchVideoLogs, deleteVideoLog } from "../../api/logsApi";
import ReportModal from "../dashboard/ReportModal";
import { formatFootageDateTime } from "../videos/dateUtils";
import "./LogHistoryPage.css";

function formatDuration(sec) {
  if (sec === undefined || sec === null) return "—";
  const mins = Math.floor(sec / 60);
  const remainingSecs = Math.floor(sec % 60);
  if (mins > 0) return `${mins}m ${remainingSecs}s`;
  return `${remainingSecs}s`;
}

function DeleteConfirmModal({ video, onClose, onConfirm, isDeleting }) {
  if (!video) return null;

  return (
    <div className="log-modal-overlay" onClick={onClose}>
      <div className="log-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="log-modal-header">
          <AlertTriangle size={22} className="log-modal-icon-alert" />
          <h3>Confirm Video Run Deletion</h3>
        </div>

        <p className="log-modal-body">
          Are you sure you want to permanently delete the video run for{" "}
          <strong>"{video.original_filename}"</strong>?
        </p>
        <p className="log-modal-subbody">
          This action will permanently purge all telemetry events, intruder detections, facial recognition matches, and snapshot image files from disk storage.
        </p>

        <div className="log-modal-actions">
          <button type="button" className="log-btn-cancel" onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" className="log-btn-delete" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Purging Run..." : "Permanently Delete Run"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LogHistoryPage({
  onNavigateToRun,
  onNavigateToUpload,
  onNavigateToAnalytics,
  onNavigateToConfig,
}) {
  const [logs, setLogs] = useState([]);
  const [retentionWarning, setRetentionWarning] = useState(null);
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Deletion Modal State
  const [deletingVideo, setDeletingVideo] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Report Export Modal State
  const [reportTargetVideo, setReportTargetVideo] = useState(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVideoLogs();
      if (data && data.status === "success") {
        setLogs(data.logs || []);
        if (data.retention_warning && data.retention_warning.has_warning) {
          setRetentionWarning(data.retention_warning);
        } else {
          setRetentionWarning(null);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load video processing history logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingVideo) return;
    setIsDeleting(true);
    try {
      await deleteVideoLog(deletingVideo.video_id);
      setSuccessMessage(`Video run "${deletingVideo.original_filename}" deleted successfully.`);
      setDeletingVideo(null);
      await loadLogs();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not delete video run.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="logs-container">
      {/* Header Bar */}
      <div className="logs-header">
        <div>
          <h1 className="logs-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={26} style={{ color: "#0066cc" }} />
            <span>Video Processing Event Logs</span>
          </h1>
          <p className="logs-subtitle">
            Complete audit trail of processed CCTV video sessions, telemetry statistics, and reports.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={onNavigateToAnalytics}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 16px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#0f172a",
              fontWeight: "600",
              fontSize: "0.875rem",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
            }}
          >
            <BarChart3 size={18} style={{ color: "#0284c7" }} />
            <span>Summary Analytics</span>
          </button>

          <button type="button" className="primary-button" onClick={onNavigateToUpload} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Video size={18} />
            <span>Upload New Video</span>
          </button>
        </div>
      </div>

      {successMessage && <div className="logs-alert success">{successMessage}</div>}
      {error && <div className="logs-alert error">{error}</div>}

      {/* 24-Hour Impending Data Purge Disclaimer Alert */}
      {retentionWarning && retentionWarning.has_warning && !isWarningDismissed && (
        <div className="retention-disclaimer-banner">
          <div className="disclaimer-content-left">
            <div className="disclaimer-icon-badge">
              <AlertTriangle size={20} />
            </div>
            <div className="disclaimer-text-group">
              <div className="disclaimer-title-row">
                <strong>Scheduled Storage Retention Notice</strong>
                <span className="disclaimer-tag">Window: {retentionWarning.retention_days} Days</span>
              </div>
              <p className="disclaimer-message">
                {retentionWarning.expiring_count === 1
                  ? `1 video run will reach your ${retentionWarning.retention_days}-day retention limit within the next 24 hours and will be automatically purged by the daily scheduled retention service.`
                  : `${retentionWarning.expiring_count} video runs will reach your ${retentionWarning.retention_days}-day retention limit within the next 24 hours and will be automatically purged by the daily scheduled retention service.`}
                {" "}Export any security audit reports now, or adjust your retention window if you wish to retain this footage.
              </p>
            </div>
          </div>

          <div className="disclaimer-actions">
            {onNavigateToConfig && (
              <button
                type="button"
                className="disclaimer-config-btn"
                onClick={() => onNavigateToConfig("retention")}
              >
                <HardDrive size={15} />
                <span>Adjust Retention Policy</span>
              </button>
            )}
            <button
              type="button"
              className="disclaimer-dismiss-btn"
              onClick={() => setIsWarningDismissed(true)}
              title="Dismiss notice for this session"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* History Table Container */}
      <div className="logs-table-card">
        {loading ? (
          <div style={{ padding: "50px", textAlign: "center", color: "#94a3b8" }}>
            Loading historical video logs...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>
            No video processing history records found. Upload a video to start security tracking.
          </div>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Video / Session</th>
                <th>Date & Recording</th>
                <th style={{ textAlign: "center" }}>Detections</th>
                <th style={{ textAlign: "center" }}>Security Alerts</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const statusUpper = (log.status || "COMPLETED").toUpperCase();
                const isCompleted = statusUpper === "COMPLETED";
                const isFailed = statusUpper === "FAILED";

                return (
                  <tr key={log.video_id}>
                    <td>
                      <div className="log-video-cell">
                        <div className="log-video-title-row">
                          <Video size={16} className="log-video-icon" />
                          <span className="log-video-name" title={log.original_filename}>
                            {log.original_filename}
                          </span>
                          {log.is_expiring_soon && (
                            <span
                              className="log-expiring-badge"
                              title={
                                log.hours_until_purge !== undefined && log.hours_until_purge > 0
                                  ? `Retention cutoff reached in ~${log.hours_until_purge}h. Will be automatically purged in the upcoming scheduled cycle.`
                                  : "Reached retention threshold. Will be automatically purged in the upcoming scheduled cycle."
                              }
                            >
                              <Clock size={11} />
                              <span>Purging &lt; 24h</span>
                            </span>
                          )}
                          {!isCompleted && (
                            <span className={`log-status-badge ${isFailed ? "failed" : "processing"}`}>
                              {statusUpper}
                            </span>
                          )}
                        </div>
                        <div className="log-video-subtext">
                          {log.duration_seconds ? (
                            <span className="log-duration-pill">{formatDuration(log.duration_seconds)} duration</span>
                          ) : (
                            <span className="log-duration-pill muted">Video Session</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="log-date-cell">
                      <div className="log-date-group">
                        {log.recording_start_time ? (
                          <>
                            <div className="log-primary-time clock-time">
                              <Clock size={13} style={{ color: "#0284c7", flexShrink: 0 }} />
                              <span>{formatFootageDateTime(log.recording_start_time)}</span>
                            </div>
                            <div className="log-sub-time">Real CCTV Time</div>
                          </>
                        ) : (
                          <>
                            <div className="log-primary-time">
                              <span>
                                {log.uploaded_at
                                  ? new Date(log.uploaded_at).toLocaleString([], {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit"
                                    })
                                  : "N/A"}
                              </span>
                            </div>
                            <div className="log-sub-time">Upload Timestamp</div>
                          </>
                        )}
                      </div>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <span className="log-detections-badge">
                        <strong>{log.total_events}</strong> events
                      </span>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <span className={`log-alerts-pill ${log.alert_count > 0 ? "has-alerts" : "clean"}`}>
                        <span className="alert-dot" />
                        <strong>{log.alert_count}</strong> {log.alert_count === 1 ? "Alert" : "Alerts"}
                      </span>
                    </td>

                    <td>
                      <div className="log-actions-group">
                        <button
                          type="button"
                          className="log-action-btn inspect"
                          aria-label="Inspect"
                          title="Inspect"
                          onClick={() => onNavigateToRun && onNavigateToRun(log.video_id, "all", log.original_filename)}
                        >
                          <Eye size={15} />
                          <span className="log-action-tooltip">Inspect</span>
                        </button>

                        <button
                          type="button"
                          className="log-action-btn report"
                          aria-label="Report"
                          title="Report"
                          onClick={() => setReportTargetVideo(log)}
                        >
                          <FileSpreadsheet size={15} />
                          <span className="log-action-tooltip">Report</span>
                        </button>

                        <button
                          type="button"
                          className="log-action-btn delete"
                          aria-label="Delete"
                          title="Delete"
                          onClick={() => setDeletingVideo(log)}
                        >
                          <Trash2 size={15} />
                          <span className="log-action-tooltip">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingVideo && (
        <DeleteConfirmModal
          video={deletingVideo}
          onClose={() => setDeletingVideo(null)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* Report Generator Modal */}
      {reportTargetVideo && (
        <ReportModal
          isOpen={!!reportTargetVideo}
          onClose={() => setReportTargetVideo(null)}
          defaultVideoId={reportTargetVideo.video_id}
          videoFilename={reportTargetVideo.original_filename}
          batchId={reportTargetVideo.batch_id}
        />
      )}
    </div>
  );
}

export default LogHistoryPage;
