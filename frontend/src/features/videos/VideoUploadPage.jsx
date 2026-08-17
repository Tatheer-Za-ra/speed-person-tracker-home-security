import React, { useEffect, useState } from "react";
import { Zap, Eye, BarChart2, ShieldAlert, Loader2, Upload, FileVideo, Film, X, Target, Compass } from "lucide-react";
import "./VideoUploadPage.css";
import { listVideos, uploadVideos } from "../../api/videoApi";
import CalibrationDiagnosticModal from "./CalibrationDiagnosticModal";

function getStatusClass(status) {
  switch ((status || "").toLowerCase()) {
    case "queued":
      return "status-badge queued";
    case "processing":
      return "status-badge processing";
    case "completed":
      return "status-badge completed";
    case "failed":
      return "status-badge failed";
    default:
      return "status-badge";
  }
}

function VideoUploadPage({ onNavigateToRun }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [enableSiteCalibration, setEnableSiteCalibration] = useState(false);
  const [activeCalibVideo, setActiveCalibVideo] = useState(null);

  const fetchVideos = async () => {
    try {
      const { response, data } = await listVideos();
      if (response.ok && data) {
        const list = Array.isArray(data) ? data : (data.videos || data.results || []);
        setVideos(list);
      }
    } catch (err) {
      console.error("Could not fetch uploaded videos list:", err);
    }
  };

  useEffect(() => {
    fetchVideos();
    const intervalId = setInterval(() => {
      fetchVideos();
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setMessage(""); // Clear banner message when new files are selected
  };

  const removeSelectedFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setMessage("");
  };

  const isProcessingBatch = isUploading || videos.some((v) => {
    const st = (v.status || "").toLowerCase();
    return st === "processing" || st === "queued";
  });

  const handleUpload = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setMessageType("error");
      setMessage("Please select at least one video file first.");
      return;
    }

    if (isProcessingBatch) {
      return;
    }

    try {
      setIsUploading(true);
      setMessageType("info");
      setMessage("Uploading and starting processing...");
      await uploadVideos(selectedFiles, enableSiteCalibration);
      setMessageType("success");
      setMessage("Video upload completed successfully.");
      setSelectedFiles([]);
      setFileInputKey((prev) => prev + 1);
      fetchVideos();
    } catch {
      setMessageType("error");
      setMessage("Could not connect to backend");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="videos-layout">
      {activeCalibVideo && (
        <CalibrationDiagnosticModal
          video={activeCalibVideo}
          onClose={() => setActiveCalibVideo(null)}
        />
      )}

      <div className="videos-card">
        <h2>Upload Security Videos</h2>

        {message && <p className={`message ${messageType}`}>{message}</p>}

        <form onSubmit={handleUpload}>
          <div className="videos-field">
            <label className="videos-label">
              Select one or more CCTV videos (.mp4, .avi, .mov, .mkv) <span className="required-asterisk">*</span>
            </label>

            <div className="custom-file-upload-wrapper">
              <input
                key={fileInputKey}
                id="cctv-video-file-input"
                type="file"
                accept=".mp4,.avi,.mov,.mkv"
                multiple
                disabled={isProcessingBatch}
                onChange={handleFileChange}
                className="hidden-file-input"
              />
              <label
                htmlFor="cctv-video-file-input"
                className={`custom-file-upload-btn ${isProcessingBatch ? "disabled" : ""}`}
              >
                <Upload size={16} className="upload-icon" />
                <span className="file-upload-text">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} video file(s) selected`
                    : "Choose CCTV video files"}
                </span>
              </label>
            </div>
          </div>

          <div className="site-calibration-toggle-card">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={enableSiteCalibration}
                onChange={(e) => setEnableSiteCalibration(e.target.checked)}
                disabled={isProcessingBatch}
              />
              <div className="checkbox-text">
                <span className="checkbox-title">
                  Optimize Precision for New Camera Location (Site Auto-Calibration)
                </span>
                <span className="checkbox-desc">
                  First time uploading video from a new camera angle? Enable Site Auto-Calibration for maximum precision and visual perspective analysis.
                </span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            className="primary-button upload-submit-btn"
            disabled={isProcessingBatch}
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Uploading Batch...</span>
              </>
            ) : isProcessingBatch ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Processing in Progress...</span>
              </>
            ) : (
              "Upload & Start Processing"
            )}
          </button>
        </form>

        {selectedFiles.length > 0 && (
          <div className="selected-files-card">
            <div className="selected-files-header">
              <Film size={16} className="selected-files-icon" />
              <span>Selected Videos ({selectedFiles.length})</span>
            </div>

            <div className="selected-files-list">
              {selectedFiles.map((file, index) => {
                const sizeInMB = file.size ? (file.size / (1024 * 1024)).toFixed(1) : null;
                return (
                  <div key={`${file.name}-${index}`} className="selected-file-item">
                    <div className="file-info-left">
                      <FileVideo size={16} className="file-type-icon" />
                      <div className="file-name-meta">
                        <span className="file-name">{file.name}</span>
                        {sizeInMB && <span className="file-size">{sizeInMB} MB</span>}
                      </div>
                    </div>

                    {!isProcessingBatch && (
                      <button
                        type="button"
                        className="remove-file-btn"
                        onClick={() => removeSelectedFile(index)}
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="videos-card">
        <h2>Uploaded Videos & Status</h2>

        {videos.length === 0 ? (
          <p>No videos uploaded yet.</p>
        ) : (
          <div className="video-list">
            {videos.map((video) => {
              const statusLower = (video.status || "").toLowerCase();
              const isCompleted = statusLower === "completed";
              const isProcessing = statusLower === "processing" || statusLower === "queued";
              const progressPct = video.progress_percent ?? (isCompleted ? 100 : isProcessing ? 15 : 0);

              return (
                <div key={video.id} className="video-item-wrapper">
                  <div className="video-item">
                    <p className="video-title">
                      <strong>{video.original_filename}</strong>
                    </p>

                    <p className="video-meta">
                      Status:{" "}
                      <span className={getStatusClass(video.status)}>
                        {video.status || "unknown"}
                      </span>
                    </p>

                    {!isProcessing && video.message && (
                      <p className="video-meta" style={{ fontSize: "0.8125rem" }}>
                        {video.message}
                      </p>
                    )}

                    {/* Dynamic Real-Time Frame Processing Progress Bar */}
                    {isProcessing && (
                      <div className="processing-progress-box" style={{ marginTop: "12px", background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "0.8125rem", fontWeight: "600", color: "#0284c7", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <Loader2 size={14} style={{ animation: "spin 1.2s linear infinite" }} />
                            <span>{video.message || "AI Frame Processing & Tracking..."}</span>
                          </span>
                          <span style={{ fontSize: "0.8125rem", fontWeight: "700", color: "#0369a1" }}>
                            {progressPct}%
                          </span>
                        </div>

                        <div style={{ width: "100%", height: "8px", background: "#cbd5e1", borderRadius: "10px", overflow: "hidden" }}>
                          <div style={{
                            width: `${Math.max(6, progressPct)}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #0284c7 0%, #059669 100%)",
                            borderRadius: "10px",
                            transition: "width 0.5s ease-in-out"
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Post-Processing Action Panel */}
                  {isCompleted && (
                    <div className="post-processing-action-card">
                      <div className="action-card-header" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Zap size={15} style={{ color: "#059669" }} />
                        <span>Processing Finished — Post-Run Actions</span>
                      </div>

                      <div className="action-buttons-group" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="action-btn details-btn"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                          onClick={() =>
                            onNavigateToRun &&
                            onNavigateToRun(video.id, "events", video.original_filename)
                          }
                        >
                          <Eye size={14} />
                          <span>Event Details</span>
                        </button>

                        <button
                          type="button"
                          className="action-btn summary-btn"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                          onClick={() =>
                            onNavigateToRun &&
                            onNavigateToRun(video.id, "summary", video.original_filename)
                          }
                        >
                          <BarChart2 size={14} />
                          <span>Run Summary</span>
                        </button>

                        <button
                          type="button"
                          className="action-btn alerts-btn"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                          onClick={() =>
                            onNavigateToRun &&
                            onNavigateToRun(video.id, "alerts", video.original_filename)
                          }
                        >
                          <ShieldAlert size={14} />
                          <span>Security Alerts</span>
                        </button>

                        {(video.calibration_diagnostic_url || video.site_calibration) && (
                          <button
                            type="button"
                            className="calib-map-btn"
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                            onClick={() => setActiveCalibVideo(video)}
                          >
                            <Compass size={14} />
                            <span>View Site Calibration Map</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoUploadPage;